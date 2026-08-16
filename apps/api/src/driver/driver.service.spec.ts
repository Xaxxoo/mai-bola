import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DriverService } from './driver.service';
import { Route } from '../entities/route.entity';
import { RouteStop } from '../entities/route-stop.entity';
import { Collection } from '../entities/collection.entity';
import { WalletTransaction } from '../entities/wallet-transaction.entity';
import { User } from '../entities/user.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { PickupRequest } from '../entities/pickup-request.entity';
import { PickupRequestsService } from '../pickup-requests/pickup-requests.service';
import { ConfigService } from '../config/config.service';
import {
  PickupRequestStatus,
  RouteStatus,
  RouteStopStatus,
  WalletTransactionType,
} from '../enums';
import { DataSource } from 'typeorm';

function makeRoute(overrides: Partial<Route> = {}): Route {
  return {
    id: 'route-1',
    name: 'Barnawa AM',
    zone: 'Barnawa',
    scheduledDate: new Date().toISOString().slice(0, 10),
    status: RouteStatus.IN_PROGRESS,
    driverId: 'driver-1',
    driver: null as any,
    stops: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeStop(overrides: Partial<RouteStop> = {}): RouteStop {
  return {
    id: 'stop-1',
    routeId: 'route-1',
    pickupRequestId: 'pickup-1',
    stopOrder: 1,
    status: RouteStopStatus.PENDING,
    skippedReason: null as any,
    route: makeRoute(),
    pickupRequest: {
      id: 'pickup-1',
      userId: 'supplier-1',
      addressId: 'addr-1',
      estimatedKg: 50,
      note: null as any,
      photoUrls: [],
      status: PickupRequestStatus.EN_ROUTE,
      cancelledReason: null as any,
      createdAt: new Date(),
      updatedAt: new Date(),
      user: null as any,
      address: null as any,
    },
    collection: null as any,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('DriverService', () => {
  let service: DriverService;
  let routeRepo: Record<string, jest.Mock>;
  let routeStopRepo: Record<string, jest.Mock>;
  let auditRepo: Record<string, jest.Mock>;
  let pickupService: Record<string, jest.Mock>;
  let configService: { pricePerKg: number };
  let mockManager: Record<string, jest.Mock | any>;
  let dataSource: Record<string, jest.Mock>;

  beforeEach(async () => {
    routeRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((r) => Promise.resolve(r)),
    };
    routeStopRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((s) => Promise.resolve(s)),
      count: jest.fn().mockResolvedValue(0),
    };
    auditRepo = {
      create: jest.fn().mockImplementation((data) => data),
      save: jest.fn().mockResolvedValue(undefined),
    };
    pickupService = {
      transition: jest.fn().mockResolvedValue(undefined),
    };
    configService = { pricePerKg: 120 };

    // Mock transactional entity manager
    const userRepoInTx = {
      createQueryBuilder: jest.fn().mockReturnValue({
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({ id: 'supplier-1' }),
      }),
    };
    const walletRepoInTx = {
      findOne: jest.fn().mockResolvedValue(null),
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
      save: jest.fn().mockImplementation((...args: any[]) => {
        // manager.save(entity) or manager.save(EntityClass, entity)
        const data = args.length === 2 ? args[1] : args[0];
        return Promise.resolve({ id: data.id || 'new-id', ...data });
      }),
    };

    dataSource = {
      transaction: jest.fn().mockImplementation((cb: any) => cb(mockManager)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DriverService,
        { provide: getRepositoryToken(Route), useValue: routeRepo },
        { provide: getRepositoryToken(RouteStop), useValue: routeStopRepo },
        { provide: getRepositoryToken(AuditLog), useValue: auditRepo },
        { provide: PickupRequestsService, useValue: pickupService },
        { provide: ConfigService, useValue: configService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<DriverService>(DriverService);
  });

  // --- Start route ---

  describe('startRoute', () => {
    it('transitions route to IN_PROGRESS and pickups to EN_ROUTE', async () => {
      const route = makeRoute({ status: RouteStatus.DISPATCHED });
      routeRepo.findOne.mockResolvedValue(route);

      const stops = [
        makeStop({ id: 's1', pickupRequestId: 'p1' }),
        makeStop({ id: 's2', pickupRequestId: 'p2' }),
      ];
      routeStopRepo.find.mockResolvedValue(stops);

      // getRouteWithStops return
      routeRepo.findOne
        .mockResolvedValueOnce(route)
        .mockResolvedValueOnce({ ...route, status: RouteStatus.IN_PROGRESS, stops });

      await service.startRoute('route-1', 'driver-1');

      expect(routeRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: RouteStatus.IN_PROGRESS }),
      );
      expect(pickupService.transition).toHaveBeenCalledTimes(2);
      expect(pickupService.transition).toHaveBeenCalledWith(
        'p1',
        PickupRequestStatus.EN_ROUTE,
        'driver-1',
      );
      expect(pickupService.transition).toHaveBeenCalledWith(
        'p2',
        PickupRequestStatus.EN_ROUTE,
        'driver-1',
      );
    });

    it('rejects non-DISPATCHED routes', async () => {
      routeRepo.findOne.mockResolvedValue(
        makeRoute({ status: RouteStatus.DRAFT }),
      );

      await expect(
        service.startRoute('route-1', 'driver-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException for missing route', async () => {
      routeRepo.findOne.mockResolvedValue(null);

      await expect(
        service.startRoute('no-route', 'driver-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // --- Arrive ---

  describe('arriveStop', () => {
    it('transitions stop to ARRIVED', async () => {
      const stop = makeStop({ status: RouteStopStatus.PENDING });
      routeStopRepo.findOne.mockResolvedValue(stop);

      const result = await service.arriveStop('stop-1', 'driver-1');

      expect(result.status).toBe(RouteStopStatus.ARRIVED);
      expect(routeStopRepo.save).toHaveBeenCalled();
      expect(auditRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'STOP_ARRIVED' }),
      );
    });

    it('rejects if stop is not PENDING', async () => {
      const stop = makeStop({ status: RouteStopStatus.ARRIVED });
      routeStopRepo.findOne.mockResolvedValue(stop);

      await expect(
        service.arriveStop('stop-1', 'driver-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects if route is not IN_PROGRESS', async () => {
      const stop = makeStop({
        route: makeRoute({ status: RouteStatus.DISPATCHED }),
      });
      routeStopRepo.findOne.mockResolvedValue(stop);

      await expect(
        service.arriveStop('stop-1', 'driver-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects if driver does not own route', async () => {
      const stop = makeStop({
        route: makeRoute({ driverId: 'other-driver' }),
      });
      routeStopRepo.findOne.mockResolvedValue(stop);

      await expect(
        service.arriveStop('stop-1', 'driver-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // --- Collect (transactional) ---

  describe('collectStop', () => {
    it('creates collection, credits wallet, transitions stop and pickup', async () => {
      const stop = makeStop({ status: RouteStopStatus.ARRIVED });
      routeStopRepo.findOne.mockResolvedValue(stop);

      const result = await service.collectStop('stop-1', 'driver-1', {
        actualKg: 45,
      });

      // Transaction was called
      expect(dataSource.transaction).toHaveBeenCalled();

      // Collection created with correct amounts
      expect(mockManager.create).toHaveBeenCalledWith(
        Collection,
        expect.objectContaining({
          routeStopId: 'stop-1',
          actualKg: 45,
          pricePerKg: 120,
          amountPaid: 5400,
          recordedById: 'driver-1',
        }),
      );

      // Wallet transaction created
      expect(mockManager.create).toHaveBeenCalledWith(
        WalletTransaction,
        expect.objectContaining({
          userId: 'supplier-1',
          type: WalletTransactionType.CREDIT_COLLECTION,
          amount: 5400,
          balanceAfter: 5400,
        }),
      );

      // Audit logs written (collection + pickup transition)
      const auditCalls = mockManager.create.mock.calls.filter(
        (c: any) => c[0] === AuditLog,
      );
      expect(auditCalls).toHaveLength(2);
    });

    it('adds to existing wallet balance', async () => {
      const stop = makeStop({ status: RouteStopStatus.ARRIVED });
      routeStopRepo.findOne.mockResolvedValue(stop);

      // Supplier already has a balance of 1000
      const walletRepoInTx = {
        findOne: jest.fn().mockResolvedValue({ balanceAfter: 1000 }),
      };
      mockManager.getRepository.mockImplementation((entity: any) => {
        if (entity === User) {
          return {
            createQueryBuilder: jest.fn().mockReturnValue({
              setLock: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              getOne: jest.fn().mockResolvedValue({ id: 'supplier-1' }),
            }),
          };
        }
        if (entity === WalletTransaction) return walletRepoInTx;
        return {};
      });

      await service.collectStop('stop-1', 'driver-1', { actualKg: 10 });

      // 10 kg * 120 = 1200, balance was 1000, new = 2200
      expect(mockManager.create).toHaveBeenCalledWith(
        WalletTransaction,
        expect.objectContaining({
          amount: 1200,
          balanceAfter: 2200,
        }),
      );
    });

    it('rejects collect on non-ARRIVED stop (prevents double-credit)', async () => {
      // Stop already COLLECTED
      const stop = makeStop({ status: RouteStopStatus.COLLECTED });
      routeStopRepo.findOne.mockResolvedValue(stop);

      await expect(
        service.collectStop('stop-1', 'driver-1', { actualKg: 10 }),
      ).rejects.toThrow(BadRequestException);

      // Transaction was NOT called
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('rejects collect on PENDING stop (must arrive first)', async () => {
      const stop = makeStop({ status: RouteStopStatus.PENDING });
      routeStopRepo.findOne.mockResolvedValue(stop);

      await expect(
        service.collectStop('stop-1', 'driver-1', { actualKg: 10 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // --- Skip (re-cluster) ---

  describe('skipStop', () => {
    it('skips stop and transitions pickup back to PENDING', async () => {
      const stop = makeStop({ status: RouteStopStatus.ARRIVED });
      routeStopRepo.findOne.mockResolvedValue(stop);

      const result = await service.skipStop('stop-1', 'driver-1', {
        reason: 'Nobody home',
      });

      expect(result.status).toBe(RouteStopStatus.SKIPPED);
      expect(result.skippedReason).toBe('Nobody home');

      // Pickup transitioned back to PENDING for re-clustering
      expect(pickupService.transition).toHaveBeenCalledWith(
        'pickup-1',
        PickupRequestStatus.PENDING,
        'driver-1',
      );

      expect(auditRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'STOP_SKIPPED' }),
      );
    });

    it('can skip a PENDING stop', async () => {
      const stop = makeStop({ status: RouteStopStatus.PENDING });
      routeStopRepo.findOne.mockResolvedValue(stop);

      const result = await service.skipStop('stop-1', 'driver-1', {});

      expect(result.status).toBe(RouteStopStatus.SKIPPED);
      expect(pickupService.transition).toHaveBeenCalledWith(
        'pickup-1',
        PickupRequestStatus.PENDING,
        'driver-1',
      );
    });

    it('rejects skipping an already COLLECTED stop', async () => {
      const stop = makeStop({ status: RouteStopStatus.COLLECTED });
      routeStopRepo.findOne.mockResolvedValue(stop);

      await expect(
        service.skipStop('stop-1', 'driver-1', { reason: 'test' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // --- Complete route ---

  describe('completeRoute', () => {
    it('transitions route to COMPLETED when all stops are done', async () => {
      const route = makeRoute();
      routeRepo.findOne
        .mockResolvedValueOnce(route) // completeRoute lookup
        .mockResolvedValueOnce({ ...route, status: RouteStatus.COMPLETED, stops: [] }); // getRouteWithStops

      routeStopRepo.count.mockResolvedValue(0); // no incomplete stops

      await service.completeRoute('route-1', 'driver-1');

      expect(routeRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: RouteStatus.COMPLETED }),
      );
      expect(auditRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'ROUTE_COMPLETED' }),
      );
    });

    it('rejects completion with pending stops', async () => {
      routeRepo.findOne.mockResolvedValue(makeRoute());
      routeStopRepo.count.mockResolvedValue(2);

      await expect(
        service.completeRoute('route-1', 'driver-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects completion of non-IN_PROGRESS routes', async () => {
      routeRepo.findOne.mockResolvedValue(
        makeRoute({ status: RouteStatus.DISPATCHED }),
      );

      await expect(
        service.completeRoute('route-1', 'driver-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // --- getToday ---

  describe('getToday', () => {
    it('returns routes for today', async () => {
      const routes = [makeRoute(), makeRoute({ id: 'route-2' })];
      routeRepo.find.mockResolvedValue(routes);

      const result = await service.getToday('driver-1');

      expect(result).toHaveLength(2);
      expect(routeRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ driverId: 'driver-1' }),
        }),
      );
    });
  });
});
