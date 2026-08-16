import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { WalletService } from './wallet.service';
import { WalletTransaction } from '../entities/wallet-transaction.entity';
import { Payout } from '../entities/payout.entity';
import { User } from '../entities/user.entity';
import { AuditLog } from '../entities/audit-log.entity';
import {
  PayoutMethod,
  PayoutStatus,
  WalletTransactionType,
} from '../enums';

function makePayout(overrides: Partial<Payout> = {}): Payout {
  return {
    id: 'payout-1',
    userId: 'supplier-1',
    amount: 5000 as any,
    method: PayoutMethod.BANK_TRANSFER,
    destinationDetails: { bank: 'GTBank', account: '0012345678' },
    status: PayoutStatus.REQUESTED,
    rejectedReason: null as any,
    paidReference: null as any,
    processedById: null as any,
    processedBy: null as any,
    processedAt: null as any,
    user: null as any,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('WalletService', () => {
  let service: WalletService;
  let walletTxRepo: Record<string, jest.Mock>;
  let payoutRepo: Record<string, jest.Mock>;
  let userRepo: Record<string, jest.Mock>;
  let auditRepo: Record<string, jest.Mock>;
  let mockManager: Record<string, jest.Mock | any>;
  let dataSource: Record<string, jest.Mock>;
  let walletRepoInTx: Record<string, jest.Mock>;

  beforeEach(async () => {
    walletTxRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
      createQueryBuilder: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          totalEarned: '0',
          totalPaidOut: '0',
          totalLiability: '0',
          totalCredited: '0',
        }),
      }),
    };

    payoutRepo = {
      findOne: jest.fn(),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
      save: jest.fn().mockImplementation((p) => Promise.resolve(p)),
    };

    userRepo = {
      findOne: jest.fn(),
    };

    auditRepo = {
      create: jest.fn().mockImplementation((data) => data),
      save: jest.fn().mockResolvedValue(undefined),
    };

    walletRepoInTx = {
      findOne: jest.fn().mockResolvedValue(null), // default: no prior txs → balance 0
    };

    const userRepoInTx = {
      createQueryBuilder: jest.fn().mockReturnValue({
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({ id: 'supplier-1' }),
      }),
    };

    mockManager = {
      getRepository: jest.fn().mockImplementation((entity: any) => {
        if (entity === User) return userRepoInTx;
        if (entity === WalletTransaction) return walletRepoInTx;
        return {};
      }),
      create: jest.fn().mockImplementation((_entity: any, data: any) => ({
        id: 'new-id',
        ...data,
      })),
      save: jest.fn().mockImplementation((entityOrData: any) => {
        if (entityOrData && entityOrData.id) {
          return Promise.resolve(entityOrData);
        }
        return Promise.resolve({ id: 'new-id', ...entityOrData });
      }),
    };

    dataSource = {
      transaction: jest.fn().mockImplementation((cb: any) => cb(mockManager)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        { provide: getRepositoryToken(WalletTransaction), useValue: walletTxRepo },
        { provide: getRepositoryToken(Payout), useValue: payoutRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(AuditLog), useValue: auditRepo },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
  });

  // --- Request payout (hold) ---

  describe('requestPayout', () => {
    it('creates payout and debits wallet immediately', async () => {
      // Supplier has 10,000 balance
      walletRepoInTx.findOne.mockResolvedValue({ balanceAfter: '10000.00' });

      const result = await service.requestPayout('supplier-1', {
        amount: 5000,
        method: PayoutMethod.BANK_TRANSFER,
        destination: { bank: 'GTBank', account: '0012345678' },
      });

      expect(dataSource.transaction).toHaveBeenCalled();

      // Payout created with REQUESTED status
      expect(mockManager.create).toHaveBeenCalledWith(
        Payout,
        expect.objectContaining({
          userId: 'supplier-1',
          amount: 5000,
          status: PayoutStatus.REQUESTED,
        }),
      );

      // Wallet debited with negative amount
      expect(mockManager.create).toHaveBeenCalledWith(
        WalletTransaction,
        expect.objectContaining({
          userId: 'supplier-1',
          type: WalletTransactionType.DEBIT_PAYOUT,
          amount: -5000,
          balanceAfter: 5000, // 10000 - 5000
        }),
      );
    });

    it('rejects when amount exceeds balance', async () => {
      walletRepoInTx.findOne.mockResolvedValue({ balanceAfter: '3000.00' });

      await expect(
        service.requestPayout('supplier-1', {
          amount: 5000,
          method: PayoutMethod.BANK_TRANSFER,
          destination: { bank: 'GTBank' },
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects when balance is zero', async () => {
      // No wallet transactions → balance 0
      walletRepoInTx.findOne.mockResolvedValue(null);

      await expect(
        service.requestPayout('supplier-1', {
          amount: 1000,
          method: PayoutMethod.CASH,
          destination: {},
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('allows payout of exact balance', async () => {
      walletRepoInTx.findOne.mockResolvedValue({ balanceAfter: '5000.00' });

      await service.requestPayout('supplier-1', {
        amount: 5000,
        method: PayoutMethod.BANK_TRANSFER,
        destination: { bank: 'GTBank' },
      });

      expect(mockManager.create).toHaveBeenCalledWith(
        WalletTransaction,
        expect.objectContaining({
          balanceAfter: 0, // 5000 - 5000
        }),
      );
    });
  });

  // --- Hold/Refund lifecycle ---

  describe('hold/refund lifecycle', () => {
    it('request → reject refunds the held amount', async () => {
      // Step 1: supplier had 10,000, requested 5,000 → balance is 5,000
      const payout = makePayout({ amount: 5000 as any });
      payoutRepo.findOne.mockResolvedValue(payout);

      // Current balance after hold: 5,000
      walletRepoInTx.findOne.mockResolvedValue({ balanceAfter: '5000.00' });

      await service.rejectPayout('payout-1', 'admin-1', {
        reason: 'Invalid bank details',
      });

      // Payout marked REJECTED
      expect(mockManager.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: PayoutStatus.REJECTED,
          rejectedReason: 'Invalid bank details',
        }),
      );

      // ADJUSTMENT credit written to refund the held amount
      expect(mockManager.create).toHaveBeenCalledWith(
        WalletTransaction,
        expect.objectContaining({
          userId: 'supplier-1',
          type: WalletTransactionType.ADJUSTMENT,
          amount: 5000, // positive refund
          balanceAfter: 10000, // 5000 + 5000 restored
        }),
      );
    });

    it('request → approve → mark-paid completes lifecycle', async () => {
      // Approve
      const payout = makePayout();
      payoutRepo.findOne.mockResolvedValue(payout);
      const approved = await service.approvePayout('payout-1', 'admin-1');
      expect(approved.status).toBe(PayoutStatus.APPROVED);

      // Mark paid
      payoutRepo.findOne.mockResolvedValue({
        ...payout,
        status: PayoutStatus.APPROVED,
      });
      const paid = await service.markPaid('payout-1', 'admin-1', {
        reference: 'TRF-12345',
      });
      expect(paid.status).toBe(PayoutStatus.PAID);
      expect(paid.paidReference).toBe('TRF-12345');
    });

    it('cannot approve an already-approved payout', async () => {
      payoutRepo.findOne.mockResolvedValue(
        makePayout({ status: PayoutStatus.APPROVED }),
      );

      await expect(
        service.approvePayout('payout-1', 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('cannot reject an already-approved payout', async () => {
      payoutRepo.findOne.mockResolvedValue(
        makePayout({ status: PayoutStatus.APPROVED }),
      );

      await expect(
        service.rejectPayout('payout-1', 'admin-1', { reason: 'test' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('cannot mark-paid a REQUESTED payout (must approve first)', async () => {
      payoutRepo.findOne.mockResolvedValue(
        makePayout({ status: PayoutStatus.REQUESTED }),
      );

      await expect(
        service.markPaid('payout-1', 'admin-1', { reference: 'X' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // --- Edge cases ---

  describe('edge cases', () => {
    it('throws NotFoundException for missing payout', async () => {
      payoutRepo.findOne.mockResolvedValue(null);

      await expect(
        service.approvePayout('no-payout', 'admin-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('handles decimal amounts correctly in hold', async () => {
      walletRepoInTx.findOne.mockResolvedValue({ balanceAfter: '12345.67' });

      await service.requestPayout('supplier-1', {
        amount: 5432.10,
        method: PayoutMethod.MOBILE_MONEY,
        destination: { phone: '+2348012345678' },
      });

      // 12345.67 - 5432.10 = 6913.57
      expect(mockManager.create).toHaveBeenCalledWith(
        WalletTransaction,
        expect.objectContaining({
          amount: -5432.10,
          balanceAfter: 6913.57,
        }),
      );
    });
  });
});
