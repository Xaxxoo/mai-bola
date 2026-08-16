import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { WalletTransaction } from '../entities/wallet-transaction.entity';
import { Payout } from '../entities/payout.entity';
import { User } from '../entities/user.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { PayoutStatus, WalletTransactionType } from '../enums';
import { moneySub, moneyAdd, moneyCmp, fromCents } from '@mai-bola/shared';
import {
  RequestPayoutDto,
  ListTransactionsQueryDto,
  ListPayoutsQueryDto,
  RejectPayoutDto,
  MarkPaidDto,
} from './dto';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(WalletTransaction)
    private readonly walletTxRepo: Repository<WalletTransaction>,
    @InjectRepository(Payout)
    private readonly payoutRepo: Repository<Payout>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
    private readonly dataSource: DataSource,
  ) {}

  // --- Supplier: wallet overview ---

  async getWallet(userId: string) {
    const balance = await this.getCurrentBalance(userId);

    const { totalEarned } = await this.walletTxRepo
      .createQueryBuilder('wt')
      .select('COALESCE(SUM(wt.amount), 0)', 'totalEarned')
      .where('wt.userId = :userId', { userId })
      .andWhere('wt.type = :type', { type: WalletTransactionType.CREDIT_COLLECTION })
      .getRawOne();

    const { totalPaidOut } = await this.walletTxRepo
      .createQueryBuilder('wt')
      .select('COALESCE(SUM(ABS(wt.amount)), 0)', 'totalPaidOut')
      .where('wt.userId = :userId', { userId })
      .andWhere('wt.type = :type', { type: WalletTransactionType.DEBIT_PAYOUT })
      .getRawOne();

    return {
      balance: fromCents(0) === balance ? '0.00' : balance,
      totalEarned: Number(totalEarned).toFixed(2),
      totalPaidOut: Number(totalPaidOut).toFixed(2),
    };
  }

  // --- Supplier: transaction history ---

  async listTransactions(userId: string, query: ListTransactionsQueryDto) {
    const [data, total] = await this.walletTxRepo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });

    return { data, total, page: query.page, limit: query.limit };
  }

  // --- Supplier: request payout (hold) ---

  async requestPayout(userId: string, dto: RequestPayoutDto) {
    return this.dataSource.transaction(async (manager) => {
      // Lock the user row
      await manager
        .getRepository(User)
        .createQueryBuilder('u')
        .setLock('pessimistic_write')
        .where('u.id = :userId', { userId })
        .getOne();

      // Get current balance
      const balance = await this.getBalanceInTx(manager, userId);

      // Check sufficient funds
      if (moneyCmp(dto.amount, balance) > 0) {
        throw new BadRequestException('Insufficient balance');
      }

      const newBalance = moneySub(balance, dto.amount);

      // Create payout record
      const payout = manager.create(Payout, {
        userId,
        amount: dto.amount,
        method: dto.method,
        destinationDetails: dto.destination,
        status: PayoutStatus.REQUESTED,
      });
      const savedPayout = (await manager.save(payout)) as Payout;

      // Debit wallet immediately (hold)
      const walletTx = manager.create(WalletTransaction, {
        userId,
        type: WalletTransactionType.DEBIT_PAYOUT,
        amount: -dto.amount,
        balanceAfter: Number(newBalance),
        reference: savedPayout.id,
        note: `Payout request ${savedPayout.id}`,
      });
      await manager.save(walletTx);

      // Audit
      await manager.save(
        manager.create(AuditLog, {
          actorId: userId,
          action: 'PAYOUT_REQUESTED',
          entityType: 'Payout',
          entityId: savedPayout.id,
          payload: {
            amount: dto.amount,
            method: dto.method,
            newBalance,
          },
        }),
      );

      return savedPayout;
    });
  }

  // --- Supplier: list own payouts ---

  async listMyPayouts(userId: string) {
    const data = await this.payoutRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    return data;
  }

  // --- Supplier: cancel own payout (only REQUESTED) ---

  async cancelPayout(payoutId: string, userId: string) {
    const payout = await this.payoutRepo.findOne({
      where: { id: payoutId, userId },
    });
    if (!payout) {
      throw new NotFoundException('Payout not found');
    }
    if (payout.status !== PayoutStatus.REQUESTED) {
      throw new BadRequestException(
        'Only payouts in REQUESTED status can be cancelled',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      payout.status = PayoutStatus.REJECTED;
      payout.rejectedReason = 'Cancelled by supplier';
      await manager.save(payout);

      // Lock supplier row for wallet refund
      await manager
        .getRepository(User)
        .createQueryBuilder('u')
        .setLock('pessimistic_write')
        .where('u.id = :userId', { userId })
        .getOne();

      const currentBalance = await this.getBalanceInTx(manager, userId);
      const newBalance = moneyAdd(currentBalance, payout.amount);

      // Refund via ADJUSTMENT
      const walletTx = manager.create(WalletTransaction, {
        userId,
        type: WalletTransactionType.ADJUSTMENT,
        amount: Number(payout.amount),
        balanceAfter: Number(newBalance),
        reference: payout.id,
        note: 'Payout cancelled by supplier',
      });
      await manager.save(walletTx);

      await manager.save(
        manager.create(AuditLog, {
          actorId: userId,
          action: 'PAYOUT_CANCELLED',
          entityType: 'Payout',
          entityId: payoutId,
          payload: {
            amount: payout.amount,
            refundedBalance: newBalance,
          },
        }),
      );

      return payout;
    });
  }

  // --- Admin: list payouts ---

  async listPayouts(query: ListPayoutsQueryDto) {
    const where: any = {};
    if (query.status) where.status = query.status;

    const [data, total] = await this.payoutRepo.findAndCount({
      where,
      relations: ['user'],
      order: { createdAt: 'DESC' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });

    // Strip passwordHash from user
    const cleaned = data.map((p) => {
      if (p.user) {
        const { passwordHash: _, ...user } = p.user;
        return { ...p, user };
      }
      return p;
    });

    return { data: cleaned, total, page: query.page, limit: query.limit };
  }

  // --- Admin: approve payout ---

  async approvePayout(payoutId: string, adminId: string) {
    const payout = await this.getPayoutOrFail(payoutId);
    if (payout.status !== PayoutStatus.REQUESTED) {
      throw new BadRequestException('Payout must be in REQUESTED status');
    }

    payout.status = PayoutStatus.APPROVED;
    payout.processedById = adminId;
    payout.processedAt = new Date();
    await this.payoutRepo.save(payout);

    await this.writeAudit(adminId, 'PAYOUT_APPROVED', payoutId, {
      amount: payout.amount,
      userId: payout.userId,
    });

    return payout;
  }

  // --- Admin: reject payout (refund) ---

  async rejectPayout(payoutId: string, adminId: string, dto: RejectPayoutDto) {
    const payout = await this.getPayoutOrFail(payoutId);
    if (payout.status !== PayoutStatus.REQUESTED) {
      throw new BadRequestException('Payout must be in REQUESTED status');
    }

    return this.dataSource.transaction(async (manager) => {
      // Update payout status
      payout.status = PayoutStatus.REJECTED;
      payout.processedById = adminId;
      payout.processedAt = new Date();
      payout.rejectedReason = dto.reason || (null as any);
      await manager.save(payout);

      // Lock supplier row for wallet refund
      await manager
        .getRepository(User)
        .createQueryBuilder('u')
        .setLock('pessimistic_write')
        .where('u.id = :userId', { userId: payout.userId })
        .getOne();

      const currentBalance = await this.getBalanceInTx(manager, payout.userId);
      const newBalance = moneyAdd(currentBalance, payout.amount);

      // Refund via ADJUSTMENT
      const walletTx = manager.create(WalletTransaction, {
        userId: payout.userId,
        type: WalletTransactionType.ADJUSTMENT,
        amount: Number(payout.amount),
        balanceAfter: Number(newBalance),
        reference: payout.id,
        note: `Payout rejected${dto.reason ? ': ' + dto.reason : ''}`,
      });
      await manager.save(walletTx);

      // Audit
      await manager.save(
        manager.create(AuditLog, {
          actorId: adminId,
          action: 'PAYOUT_REJECTED',
          entityType: 'Payout',
          entityId: payoutId,
          payload: {
            amount: payout.amount,
            userId: payout.userId,
            reason: dto.reason,
            refundedBalance: newBalance,
          },
        }),
      );

      return payout;
    });
  }

  // --- Admin: mark paid ---

  async markPaid(payoutId: string, adminId: string, dto: MarkPaidDto) {
    const payout = await this.getPayoutOrFail(payoutId);
    if (payout.status !== PayoutStatus.APPROVED) {
      throw new BadRequestException('Payout must be in APPROVED status');
    }

    payout.status = PayoutStatus.PAID;
    payout.paidReference = dto.reference;
    payout.processedById = adminId;
    payout.processedAt = new Date();
    await this.payoutRepo.save(payout);

    await this.writeAudit(adminId, 'PAYOUT_PAID', payoutId, {
      amount: payout.amount,
      userId: payout.userId,
      reference: dto.reference,
    });

    return payout;
  }

  // --- Admin: wallet summary ---

  async getWalletSummary() {
    // Total liability = sum of all balances across all users
    // Since balance = sum of all wallet_transaction amounts per user,
    // total liability = sum of ALL wallet_transaction amounts
    const { totalLiability } = await this.walletTxRepo
      .createQueryBuilder('wt')
      .select('COALESCE(SUM(wt.amount), 0)', 'totalLiability')
      .getRawOne();

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const { totalCredited } = await this.walletTxRepo
      .createQueryBuilder('wt')
      .select('COALESCE(SUM(wt.amount), 0)', 'totalCredited')
      .where('wt.type = :type', { type: WalletTransactionType.CREDIT_COLLECTION })
      .andWhere('wt.createdAt >= :monthStart', { monthStart })
      .getRawOne();

    const { totalPaidOut } = await this.walletTxRepo
      .createQueryBuilder('wt')
      .select('COALESCE(SUM(ABS(wt.amount)), 0)', 'totalPaidOut')
      .where('wt.type = :type', { type: WalletTransactionType.DEBIT_PAYOUT })
      .andWhere('wt.createdAt >= :monthStart', { monthStart })
      .getRawOne();

    return {
      totalLiability: Number(totalLiability).toFixed(2),
      totalCreditedThisMonth: Number(totalCredited).toFixed(2),
      totalPaidOutThisMonth: Number(totalPaidOut).toFixed(2),
    };
  }

  // --- Helpers ---

  async getCurrentBalance(userId: string): Promise<string> {
    const lastTx = await this.walletTxRepo.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    return lastTx ? Number(lastTx.balanceAfter).toFixed(2) : '0.00';
  }

  private async getBalanceInTx(
    manager: any,
    userId: string,
  ): Promise<string> {
    const lastTx = await manager.getRepository(WalletTransaction).findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    return lastTx ? Number(lastTx.balanceAfter).toFixed(2) : '0.00';
  }

  private async getPayoutOrFail(payoutId: string): Promise<Payout> {
    const payout = await this.payoutRepo.findOne({
      where: { id: payoutId },
    });
    if (!payout) throw new NotFoundException('Payout not found');
    return payout;
  }

  private async writeAudit(
    actorId: string,
    action: string,
    entityId: string,
    payload: Record<string, unknown>,
  ) {
    const log = this.auditRepo.create({
      actorId,
      action,
      entityType: 'Payout',
      entityId,
      payload,
    });
    await this.auditRepo.save(log);
  }
}
