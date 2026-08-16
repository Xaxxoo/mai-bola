import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { InventoryBatch } from '../entities/inventory-batch.entity';
import { Sale } from '../entities/sale.entity';
import { Collection } from '../entities/collection.entity';
import { Setting } from '../entities/setting.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { InventoryBatchStatus } from '../enums';
import { moneyAdd, moneySub, moneyMul, moneyCmp } from '@mai-bola/shared';
import {
  CreateBatchDto,
  AdvanceBatchDto,
  ListBatchesQueryDto,
  CreateSaleDto,
  ListSalesQueryDto,
  UpdateEconomicsDto,
} from './dto';

const STATUS_ORDER = [
  InventoryBatchStatus.RAW,
  InventoryBatchStatus.SORTED,
  InventoryBatchStatus.WASHED,
  InventoryBatchStatus.COMPRESSED,
];

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(InventoryBatch)
    private readonly batchRepo: Repository<InventoryBatch>,
    @InjectRepository(Sale)
    private readonly saleRepo: Repository<Sale>,
    @InjectRepository(Collection)
    private readonly collectionRepo: Repository<Collection>,
    @InjectRepository(Setting)
    private readonly settingRepo: Repository<Setting>,
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  // ── Batches ──────────────────────────────────────────

  async createBatch(dto: CreateBatchDto, actorId: string) {
    const collections = await this.collectionRepo.find({
      where: { id: In(dto.collectionIds) },
    });
    if (collections.length !== dto.collectionIds.length) {
      throw new BadRequestException('One or more collections not found');
    }

    // Verify none already belong to a batch
    const taken = await this.batchRepo
      .createQueryBuilder('b')
      .innerJoin('b.sourceCollections', 'c')
      .where('c.id IN (:...ids)', { ids: dto.collectionIds })
      .getCount();
    if (taken > 0) {
      throw new BadRequestException(
        'One or more collections already belong to a batch',
      );
    }

    // Sum actualKg using decimal-safe math
    let grossKg = '0.00';
    for (const c of collections) {
      grossKg = moneyAdd(grossKg, c.actualKg);
    }

    const batch = this.batchRepo.create({
      sourceCollections: collections,
      grossKg: Number(grossKg),
      processedKg: 0,
      status: InventoryBatchStatus.RAW,
    });
    const saved = (await this.batchRepo.save(batch)) as InventoryBatch;

    await this.writeAudit(actorId, 'BATCH_CREATED', saved.id, {
      collectionIds: dto.collectionIds,
      grossKg,
    });

    return saved;
  }

  async advanceBatch(
    batchId: string,
    dto: AdvanceBatchDto,
    actorId: string,
  ) {
    const batch = await this.getBatchOrFail(batchId);

    const idx = STATUS_ORDER.indexOf(batch.status);
    if (idx < 0 || idx >= STATUS_ORDER.length - 1) {
      throw new BadRequestException('Batch cannot be advanced further');
    }
    const nextStatus = STATUS_ORDER[idx + 1];

    // processedKg must not exceed the previous ceiling
    const ceiling =
      Number(batch.processedKg) > 0
        ? Number(batch.processedKg)
        : Number(batch.grossKg);
    if (moneyCmp(dto.processedKg, ceiling) > 0) {
      throw new BadRequestException(
        `processedKg cannot exceed ${ceiling}`,
      );
    }

    const prevStatus = batch.status;
    batch.status = nextStatus;
    batch.processedKg = dto.processedKg;
    await this.batchRepo.save(batch);

    await this.writeAudit(actorId, 'BATCH_ADVANCED', batchId, {
      from: prevStatus,
      to: nextStatus,
      processedKg: dto.processedKg,
    });

    return batch;
  }

  async listBatches(query: ListBatchesQueryDto) {
    const where: any = {};
    if (query.status) where.status = query.status;

    const [data, total] = await this.batchRepo.findAndCount({
      where,
      relations: ['sourceCollections'],
      order: { createdAt: 'DESC' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });

    // Running total of COMPRESSED kg available (not ALLOCATED)
    const { available } = await this.batchRepo
      .createQueryBuilder('b')
      .select('COALESCE(SUM(b.processedKg), 0)', 'available')
      .where('b.status = :status', {
        status: InventoryBatchStatus.COMPRESSED,
      })
      .getRawOne();

    return {
      data,
      total,
      page: query.page,
      limit: query.limit,
      compressedKgAvailable: Number(available).toFixed(2),
    };
  }

  // ── Sales ────────────────────────────────────────────

  async createSale(dto: CreateSaleDto, actorId: string) {
    const batches = await this.batchRepo.find({
      where: { id: In(dto.batchIds) },
    });
    if (batches.length !== dto.batchIds.length) {
      throw new BadRequestException('One or more batches not found');
    }

    for (const b of batches) {
      if (b.status !== InventoryBatchStatus.COMPRESSED) {
        throw new BadRequestException(
          `Batch ${b.id} is not in COMPRESSED status`,
        );
      }
    }

    // Total compressed kg across selected batches
    let availableKg = '0.00';
    for (const b of batches) {
      availableKg = moneyAdd(availableKg, b.processedKg);
    }

    if (moneyCmp(dto.totalKg, availableKg) > 0) {
      throw new BadRequestException(
        `Sale totalKg (${dto.totalKg}) exceeds available compressed kg (${availableKg})`,
      );
    }

    // Load economic defaults
    const defaults = await this.getOrCreateDefaults();
    const pricePerKg = dto.pricePerKg ?? Number(defaults.sellPricePerKg);
    const allInCostPerKg =
      dto.allInCostPerKg ?? Number(defaults.allInCostPerKg);

    // Compute revenue & contribution with decimal-safe math
    const revenue = moneyMul(pricePerKg, dto.totalKg);
    const margin = moneySub(pricePerKg, allInCostPerKg);
    const contribution = moneyMul(margin, dto.totalKg);

    const sale = this.saleRepo.create({
      buyerName: dto.buyerName ?? 'Lagos off-taker',
      totalKg: dto.totalKg,
      pricePerKg,
      revenue: Number(revenue),
      allInCostPerKg,
      contribution: Number(contribution),
      batches,
      soldAt: new Date(),
    });
    const saved = (await this.saleRepo.save(sale)) as Sale;

    // Allocate batches
    for (const b of batches) {
      b.status = InventoryBatchStatus.ALLOCATED;
      await this.batchRepo.save(b);
    }

    await this.writeAudit(actorId, 'SALE_CREATED', saved.id, {
      batchIds: dto.batchIds,
      totalKg: dto.totalKg,
      revenue,
      contribution,
    });

    return saved;
  }

  async listSales(query: ListSalesQueryDto) {
    const [data, total] = await this.saleRepo.findAndCount({
      relations: ['batches'],
      order: { soldAt: 'DESC' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });

    // Lifetime totals
    const raw = await this.saleRepo
      .createQueryBuilder('s')
      .select('COALESCE(SUM(s.revenue), 0)', 'totalRevenue')
      .addSelect('COALESCE(SUM(s.contribution), 0)', 'totalContribution')
      .getRawOne();

    return {
      data,
      total,
      page: query.page,
      limit: query.limit,
      lifetimeTotalRevenue: Number(raw.totalRevenue).toFixed(2),
      lifetimeTotalContribution: Number(raw.totalContribution).toFixed(2),
    };
  }

  // ── Economics defaults ───────────────────────────────

  async getDefaults() {
    return this.getOrCreateDefaults();
  }

  async updateDefaults(dto: UpdateEconomicsDto, actorId: string) {
    const settings = await this.getOrCreateDefaults();
    if (dto.buyPricePerKg !== undefined)
      settings.buyPricePerKg = dto.buyPricePerKg;
    if (dto.sellPricePerKg !== undefined)
      settings.sellPricePerKg = dto.sellPricePerKg;
    if (dto.allInCostPerKg !== undefined)
      settings.allInCostPerKg = dto.allInCostPerKg;
    await this.settingRepo.save(settings);

    await this.writeAudit(actorId, 'ECONOMICS_UPDATED', settings.id, {
      ...dto,
    });

    return settings;
  }

  // ── Helpers ──────────────────────────────────────────

  private async getOrCreateDefaults(): Promise<Setting> {
    let settings = await this.settingRepo.findOne({ where: {} });
    if (!settings) {
      settings = this.settingRepo.create({
        buyPricePerKg: 120,
        sellPricePerKg: 570,
        allInCostPerKg: 450,
      });
      settings = (await this.settingRepo.save(settings)) as Setting;
    }
    return settings;
  }

  private async getBatchOrFail(batchId: string): Promise<InventoryBatch> {
    const batch = await this.batchRepo.findOne({
      where: { id: batchId },
    });
    if (!batch) throw new NotFoundException('Batch not found');
    return batch;
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
      entityType: 'Inventory',
      entityId,
      payload,
    });
    await this.auditRepo.save(log);
  }
}
