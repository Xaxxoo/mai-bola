import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MetricsService } from './metrics.service';
import { Collection } from '../entities/collection.entity';
import { Sale } from '../entities/sale.entity';
import { Payout } from '../entities/payout.entity';
import { User } from '../entities/user.entity';
import { WalletTransaction } from '../entities/wallet-transaction.entity';
import { TimeseriesMetric, TimeseriesInterval } from './dto/timeseries-query.dto';

function makeQB(rawResult: any) {
  return {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getRawOne: jest.fn().mockResolvedValue(rawResult),
  };
}

describe('MetricsService', () => {
  let service: MetricsService;
  let collectionRepo: Record<string, jest.Mock>;
  let saleRepo: Record<string, jest.Mock>;
  let payoutRepo: Record<string, jest.Mock>;
  let userRepo: Record<string, jest.Mock>;
  let walletTxRepo: Record<string, jest.Mock>;

  beforeEach(async () => {
    collectionRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(makeQB({ total: '1500.00' })),
      query: jest.fn().mockResolvedValue([]),
    };
    saleRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(makeQB({ total: '800.00' })),
    };
    payoutRepo = {};
    userRepo = {
      count: jest.fn().mockResolvedValue(10),
    };
    walletTxRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(makeQB({ total: '180000.00' })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetricsService,
        { provide: getRepositoryToken(Collection), useValue: collectionRepo },
        { provide: getRepositoryToken(Sale), useValue: saleRepo },
        { provide: getRepositoryToken(Payout), useValue: payoutRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(WalletTransaction), useValue: walletTxRepo },
      ],
    }).compile();

    service = module.get<MetricsService>(MetricsService);
  });

  describe('getOverview', () => {
    it('returns aggregated metrics', async () => {
      const result = await service.getOverview();

      expect(result.tonnesRecovered).toBe(1.5);
      expect(result.kgRecovered).toBe(1500);
      expect(result.activeSuppliers).toBe(10);
      expect(result.truckloadEquivalents).toBe(+(1500 / 20000).toFixed(2));
      expect(result.paidToSuppliers).toBe(180000);
    });
  });

  describe('getPublicMetrics', () => {
    it('returns four headline metrics', async () => {
      const result = await service.getPublicMetrics();

      expect(result).toHaveProperty('tonnesRecovered');
      expect(result).toHaveProperty('tonnesSold');
      expect(result).toHaveProperty('activeSuppliers');
      expect(result).toHaveProperty('paidToSuppliers');
      expect(Object.keys(result)).toHaveLength(4);
    });
  });

  describe('getTimeseries', () => {
    it('calls raw SQL for kg_collected with day interval', async () => {
      collectionRepo.query.mockResolvedValue([
        { bucket: '2024-01-01T00:00:00.000Z', value: '150.50' },
        { bucket: '2024-01-02T00:00:00.000Z', value: '200.00' },
      ]);

      const result = await service.getTimeseries({
        metric: TimeseriesMetric.KG_COLLECTED,
        interval: TimeseriesInterval.DAY,
      });

      expect(collectionRepo.query).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0].value).toBe(150.5);
      expect(result[1].value).toBe(200);
    });

    it('applies date range filters', async () => {
      collectionRepo.query.mockResolvedValue([]);

      await service.getTimeseries({
        metric: TimeseriesMetric.NAIRA_PAID,
        interval: TimeseriesInterval.MONTH,
        from: '2024-01-01',
        to: '2024-03-31',
      });

      const [sql, params] = collectionRepo.query.mock.calls[0];
      expect(params).toContain('2024-01-01');
      expect(params).toContain('2024-03-31');
    });
  });
});
