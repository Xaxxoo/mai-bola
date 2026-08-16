import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { InventoryBatch } from '../entities/inventory-batch.entity';
import { Sale } from '../entities/sale.entity';
import { Collection } from '../entities/collection.entity';
import { Setting } from '../entities/setting.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { InventoryBatchStatus } from '../enums';

function makeCollection(overrides: Partial<Collection> = {}): Collection {
  return {
    id: 'col-1',
    routeStopId: 'rs-1',
    routeStop: null as any,
    actualKg: 50 as any,
    pricePerKg: 120 as any,
    amountPaid: 6000 as any,
    collectedAt: new Date(),
    recordedById: 'driver-1',
    recordedBy: null as any,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeBatch(overrides: Partial<InventoryBatch> = {}): InventoryBatch {
  return {
    id: 'batch-1',
    sourceCollections: [],
    grossKg: 100 as any,
    processedKg: 0 as any,
    status: InventoryBatchStatus.RAW,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeSettings(): Setting {
  return {
    id: 'settings-1',
    buyPricePerKg: 120 as any,
    sellPricePerKg: 570 as any,
    allInCostPerKg: 450 as any,
    updatedAt: new Date(),
  };
}

describe('InventoryService', () => {
  let service: InventoryService;
  let batchRepo: Record<string, jest.Mock>;
  let saleRepo: Record<string, jest.Mock>;
  let collectionRepo: Record<string, jest.Mock>;
  let settingRepo: Record<string, jest.Mock>;
  let auditRepo: Record<string, jest.Mock>;

  beforeEach(async () => {
    batchRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
      create: jest.fn().mockImplementation((data) => data),
      save: jest.fn().mockImplementation((b) =>
        Promise.resolve({ id: 'batch-1', ...b }),
      ),
      createQueryBuilder: jest.fn().mockReturnValue({
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
        getRawOne: jest.fn().mockResolvedValue({ available: '0' }),
      }),
    };

    saleRepo = {
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
      create: jest.fn().mockImplementation((data) => data),
      save: jest.fn().mockImplementation((s) =>
        Promise.resolve({ id: 'sale-1', ...s }),
      ),
      createQueryBuilder: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          totalRevenue: '0',
          totalContribution: '0',
        }),
      }),
    };

    collectionRepo = {
      find: jest.fn().mockResolvedValue([]),
    };

    settingRepo = {
      findOne: jest.fn().mockResolvedValue(makeSettings()),
      create: jest.fn().mockImplementation((data) => data),
      save: jest.fn().mockImplementation((s) =>
        Promise.resolve({ id: 'settings-1', ...s }),
      ),
    };

    auditRepo = {
      create: jest.fn().mockImplementation((data) => data),
      save: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: getRepositoryToken(InventoryBatch), useValue: batchRepo },
        { provide: getRepositoryToken(Sale), useValue: saleRepo },
        { provide: getRepositoryToken(Collection), useValue: collectionRepo },
        { provide: getRepositoryToken(Setting), useValue: settingRepo },
        { provide: getRepositoryToken(AuditLog), useValue: auditRepo },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
  });

  // ── Batch creation ────────────────────────────────

  describe('createBatch', () => {
    it('creates a RAW batch with grossKg = sum of collections', async () => {
      const collections = [
        makeCollection({ id: 'c1', actualKg: 45 as any }),
        makeCollection({ id: 'c2', actualKg: 55 as any }),
      ];
      collectionRepo.find.mockResolvedValue(collections);

      await service.createBatch(
        { collectionIds: ['c1', 'c2'] },
        'admin-1',
      );

      expect(batchRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          grossKg: 100,
          processedKg: 0,
          status: InventoryBatchStatus.RAW,
        }),
      );
    });

    it('rejects if a collection is already in a batch', async () => {
      collectionRepo.find.mockResolvedValue([
        makeCollection({ id: 'c1' }),
      ]);

      // Mock: query returns count > 0
      batchRepo.createQueryBuilder.mockReturnValue({
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(1),
      });

      await expect(
        service.createBatch({ collectionIds: ['c1'] }, 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects if a collection id is not found', async () => {
      collectionRepo.find.mockResolvedValue([]); // found 0 of 1

      await expect(
        service.createBatch({ collectionIds: ['c-missing'] }, 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── Batch advancement ─────────────────────────────

  describe('advanceBatch', () => {
    it('advances RAW → SORTED with processedKg', async () => {
      batchRepo.findOne.mockResolvedValue(
        makeBatch({ grossKg: 100 as any, processedKg: 0 as any }),
      );

      const result = await service.advanceBatch(
        'batch-1',
        { processedKg: 95 },
        'admin-1',
      );

      expect(result.status).toBe(InventoryBatchStatus.SORTED);
      expect(result.processedKg).toBe(95);
    });

    it('advances SORTED → WASHED → COMPRESSED in sequence', async () => {
      // SORTED → WASHED
      batchRepo.findOne.mockResolvedValue(
        makeBatch({
          status: InventoryBatchStatus.SORTED,
          processedKg: 95 as any,
        }),
      );
      let result = await service.advanceBatch(
        'batch-1',
        { processedKg: 90 },
        'admin-1',
      );
      expect(result.status).toBe(InventoryBatchStatus.WASHED);

      // WASHED → COMPRESSED
      batchRepo.findOne.mockResolvedValue(
        makeBatch({
          status: InventoryBatchStatus.WASHED,
          processedKg: 90 as any,
        }),
      );
      result = await service.advanceBatch(
        'batch-1',
        { processedKg: 85 },
        'admin-1',
      );
      expect(result.status).toBe(InventoryBatchStatus.COMPRESSED);
    });

    it('rejects processedKg exceeding grossKg (first advance)', async () => {
      batchRepo.findOne.mockResolvedValue(
        makeBatch({ grossKg: 100 as any, processedKg: 0 as any }),
      );

      await expect(
        service.advanceBatch('batch-1', { processedKg: 110 }, 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects processedKg exceeding previous processedKg', async () => {
      batchRepo.findOne.mockResolvedValue(
        makeBatch({
          status: InventoryBatchStatus.SORTED,
          processedKg: 80 as any,
        }),
      );

      await expect(
        service.advanceBatch('batch-1', { processedKg: 85 }, 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects advancing COMPRESSED batch', async () => {
      batchRepo.findOne.mockResolvedValue(
        makeBatch({ status: InventoryBatchStatus.COMPRESSED }),
      );

      await expect(
        service.advanceBatch('batch-1', { processedKg: 80 }, 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects advancing ALLOCATED batch', async () => {
      batchRepo.findOne.mockResolvedValue(
        makeBatch({ status: InventoryBatchStatus.ALLOCATED }),
      );

      await expect(
        service.advanceBatch('batch-1', { processedKg: 80 }, 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException for missing batch', async () => {
      batchRepo.findOne.mockResolvedValue(null);

      await expect(
        service.advanceBatch('no-batch', { processedKg: 50 }, 'admin-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── Sale creation & contribution math ─────────────

  describe('createSale', () => {
    it('computes contribution: 20,000 kg × (₦570 − ₦450) = ₦2,400,000', async () => {
      const batches = [
        makeBatch({
          id: 'b1',
          status: InventoryBatchStatus.COMPRESSED,
          processedKg: 12000 as any,
        }),
        makeBatch({
          id: 'b2',
          status: InventoryBatchStatus.COMPRESSED,
          processedKg: 8000 as any,
        }),
      ];
      batchRepo.find.mockResolvedValue(batches);

      await service.createSale(
        {
          batchIds: ['b1', 'b2'],
          totalKg: 20000,
          pricePerKg: 570,
          allInCostPerKg: 450,
        },
        'admin-1',
      );

      expect(saleRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          totalKg: 20000,
          pricePerKg: 570,
          allInCostPerKg: 450,
          revenue: 11400000, // 20000 × 570
          contribution: 2400000, // 20000 × 120
        }),
      );

      // Batches are allocated
      expect(batchRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'b1',
          status: InventoryBatchStatus.ALLOCATED,
        }),
      );
      expect(batchRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'b2',
          status: InventoryBatchStatus.ALLOCATED,
        }),
      );
    });

    it('uses economic defaults when pricePerKg / allInCostPerKg omitted', async () => {
      batchRepo.find.mockResolvedValue([
        makeBatch({
          id: 'b1',
          status: InventoryBatchStatus.COMPRESSED,
          processedKg: 500 as any,
        }),
      ]);

      await service.createSale(
        { batchIds: ['b1'], totalKg: 500 },
        'admin-1',
      );

      // Defaults: sellPricePerKg=570, allInCostPerKg=450
      expect(saleRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          pricePerKg: 570,
          allInCostPerKg: 450,
          revenue: 285000, // 500 × 570
          contribution: 60000, // 500 × 120
        }),
      );
    });

    it('rejects when totalKg exceeds compressed kg of batches', async () => {
      batchRepo.find.mockResolvedValue([
        makeBatch({
          id: 'b1',
          status: InventoryBatchStatus.COMPRESSED,
          processedKg: 100 as any,
        }),
      ]);

      await expect(
        service.createSale(
          { batchIds: ['b1'], totalKg: 200, pricePerKg: 570 },
          'admin-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects if any batch is not COMPRESSED', async () => {
      batchRepo.find.mockResolvedValue([
        makeBatch({ id: 'b1', status: InventoryBatchStatus.WASHED }),
      ]);

      await expect(
        service.createSale(
          { batchIds: ['b1'], totalKg: 50, pricePerKg: 570 },
          'admin-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects if a batch id is not found', async () => {
      batchRepo.find.mockResolvedValue([]); // found 0 of 1

      await expect(
        service.createSale(
          { batchIds: ['b-missing'], totalKg: 50 },
          'admin-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('allows sale of exact compressed kg', async () => {
      batchRepo.find.mockResolvedValue([
        makeBatch({
          id: 'b1',
          status: InventoryBatchStatus.COMPRESSED,
          processedKg: 1000 as any,
        }),
      ]);

      await service.createSale(
        { batchIds: ['b1'], totalKg: 1000, pricePerKg: 570, allInCostPerKg: 450 },
        'admin-1',
      );

      expect(saleRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          totalKg: 1000,
          revenue: 570000,
          contribution: 120000,
        }),
      );
    });
  });

  // ── Economics defaults ────────────────────────────

  describe('economics defaults', () => {
    it('returns existing settings', async () => {
      const result = await service.getDefaults();

      expect(Number(result.buyPricePerKg)).toBe(120);
      expect(Number(result.sellPricePerKg)).toBe(570);
      expect(Number(result.allInCostPerKg)).toBe(450);
    });

    it('creates default settings when none exist', async () => {
      settingRepo.findOne.mockResolvedValue(null);

      await service.getDefaults();

      expect(settingRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          buyPricePerKg: 120,
          sellPricePerKg: 570,
          allInCostPerKg: 450,
        }),
      );
      expect(settingRepo.save).toHaveBeenCalled();
    });

    it('updates individual fields', async () => {
      const settings = makeSettings();
      settingRepo.findOne.mockResolvedValue(settings);

      await service.updateDefaults(
        { sellPricePerKg: 600 },
        'admin-1',
      );

      expect(settingRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ sellPricePerKg: 600 }),
      );
    });
  });
});
