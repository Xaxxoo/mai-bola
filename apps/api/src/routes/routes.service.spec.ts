import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RoutesService } from './routes.service';
import { Route } from '../entities/route.entity';
import { RouteStop } from '../entities/route-stop.entity';
import { PickupRequest } from '../entities/pickup-request.entity';
import { User } from '../entities/user.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { PickupRequestsService } from '../pickup-requests/pickup-requests.service';
import {
  PickupRequestStatus,
  RouteStatus,
  UserRole,
} from '../enums';

function makeRoute(overrides: Partial<Route> = {}): Route {
  return {
    id: 'route-1',
    name: 'Barnawa AM',
    zone: 'Barnawa',
    scheduledDate: '2026-08-20',
    status: RouteStatus.DRAFT,
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
    status: 'PENDING' as any,
    skippedReason: null as any,
    route: null as any,
    pickupRequest: null as any,
    collection: null as any,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makePickup(overrides: Partial<PickupRequest> = {}): PickupRequest {
  return {
    id: 'pickup-1',
    userId: 'user-1',
    addressId: 'addr-1',
    estimatedKg: 50,
    note: null as any,
    photoUrls: [],
    status: PickupRequestStatus.PENDING,
    cancelledReason: null as any,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: null as any,
    address: null as any,
    ...overrides,
  };
}

describe('RoutesService', () => {
  let service: RoutesService;
  let routeRepo: Record<string, jest.Mock>;
  let routeStopRepo: Record<string, jest.Mock>;
  let pickupRepo: Record<string, jest.Mock>;
  let userRepo: Record<string, jest.Mock>;
  let auditRepo: Record<string, jest.Mock>;
  let pickupService: Record<string, jest.Mock>;

  beforeEach(async () => {
    routeRepo = {
      findOne: jest.fn(),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
      save: jest.fn().mockImplementation((r) => Promise.resolve({ id: 'route-1', ...r })),
      create: jest.fn().mockImplementation((data) => data),
    };
    routeStopRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((s) => Promise.resolve({ id: 'stop-new', ...s })),
      create: jest.fn().mockImplementation((data) => data),
      remove: jest.fn().mockResolvedValue(undefined),
    };
    pickupRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
      save: jest.fn().mockImplementation((p) => Promise.resolve(p)),
      createQueryBuilder: jest.fn(),
    };
    userRepo = {
      findOne: jest.fn(),
    };
    auditRepo = {
      create: jest.fn().mockImplementation((data) => data),
      save: jest.fn().mockResolvedValue(undefined),
    };
    pickupService = {
      transition: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoutesService,
        { provide: getRepositoryToken(Route), useValue: routeRepo },
        { provide: getRepositoryToken(RouteStop), useValue: routeStopRepo },
        { provide: getRepositoryToken(PickupRequest), useValue: pickupRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(AuditLog), useValue: auditRepo },
        { provide: PickupRequestsService, useValue: pickupService },
      ],
    }).compile();

    service = module.get<RoutesService>(RoutesService);
  });

  // --- Dispatch side-effects ---

  describe('dispatch', () => {
    it('transitions route to DISPATCHED and pickups to SCHEDULED', async () => {
      const route = makeRoute();
      routeRepo.findOne.mockResolvedValue(route);

      const stops = [
        makeStop({ id: 's1', pickupRequestId: 'p1' }),
        makeStop({ id: 's2', pickupRequestId: 'p2', stopOrder: 2 }),
      ];
      routeStopRepo.find.mockResolvedValue(stops);

      // Mock getRoute for return value
      routeRepo.findOne
        .mockResolvedValueOnce(route) // getRouteOrFail
        .mockResolvedValueOnce({      // getRoute after dispatch
          ...route,
          status: RouteStatus.DISPATCHED,
          driver: { id: 'driver-1', fullName: 'Driver', phone: '+234x', passwordHash: 'x' },
          stops: [],
        });

      await service.dispatch('route-1', 'admin-1');

      // Route saved with DISPATCHED
      expect(routeRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: RouteStatus.DISPATCHED }),
      );

      // Each stop's pickup transitioned to SCHEDULED
      expect(pickupService.transition).toHaveBeenCalledTimes(2);
      expect(pickupService.transition).toHaveBeenCalledWith(
        'p1',
        PickupRequestStatus.SCHEDULED,
        'admin-1',
      );
      expect(pickupService.transition).toHaveBeenCalledWith(
        'p2',
        PickupRequestStatus.SCHEDULED,
        'admin-1',
      );

      // Audit log written
      expect(auditRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ROUTE_DISPATCHED',
          entityId: 'route-1',
        }),
      );
    });

    it('rejects dispatching non-DRAFT routes', async () => {
      routeRepo.findOne.mockResolvedValue(
        makeRoute({ status: RouteStatus.DISPATCHED }),
      );

      await expect(
        service.dispatch('route-1', 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects dispatching routes with no stops', async () => {
      routeRepo.findOne.mockResolvedValue(makeRoute());
      routeStopRepo.find.mockResolvedValue([]);

      await expect(
        service.dispatch('route-1', 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException for missing route', async () => {
      routeRepo.findOne.mockResolvedValue(null);

      await expect(
        service.dispatch('no-route', 'admin-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // --- Create route ---

  describe('createRoute', () => {
    it('creates route, stops, and transitions pickups to CLUSTERED', async () => {
      userRepo.findOne.mockResolvedValue({
        id: 'driver-1',
        role: UserRole.DRIVER,
      });

      const pickups = [
        makePickup({ id: 'p1' }),
        makePickup({ id: 'p2' }),
      ];
      pickupRepo.find.mockResolvedValue(pickups);

      const dto = {
        name: 'Test Route',
        zone: 'Barnawa',
        scheduledDate: '2026-08-20',
        driverId: 'driver-1',
        pickupRequestIds: ['p1', 'p2'],
      };

      await service.createRoute(dto, 'admin-1');

      // Route created
      expect(routeRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Route',
          status: RouteStatus.DRAFT,
        }),
      );

      // Two stops created
      expect(routeStopRepo.save).toHaveBeenCalledTimes(2);

      // Both pickups transitioned to CLUSTERED
      expect(pickupService.transition).toHaveBeenCalledTimes(2);
      expect(pickupService.transition).toHaveBeenCalledWith(
        'p1',
        PickupRequestStatus.CLUSTERED,
        'admin-1',
      );
    });

    it('rejects if driver role is not DRIVER', async () => {
      userRepo.findOne.mockResolvedValue({
        id: 'user-1',
        role: UserRole.SUPPLIER,
      });

      await expect(
        service.createRoute(
          {
            name: 'X',
            zone: 'Barnawa',
            scheduledDate: '2026-08-20',
            driverId: 'user-1',
            pickupRequestIds: ['p1'],
          },
          'admin-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects if a pickup is not PENDING', async () => {
      userRepo.findOne.mockResolvedValue({
        id: 'driver-1',
        role: UserRole.DRIVER,
      });
      pickupRepo.find.mockResolvedValue([
        makePickup({ id: 'p1', status: PickupRequestStatus.CLUSTERED }),
      ]);

      await expect(
        service.createRoute(
          {
            name: 'X',
            zone: 'Barnawa',
            scheduledDate: '2026-08-20',
            driverId: 'driver-1',
            pickupRequestIds: ['p1'],
          },
          'admin-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // --- Auto-order ---

  describe('autoOrder', () => {
    it('reorders stops by nearest-neighbour', async () => {
      routeRepo.findOne.mockResolvedValue(makeRoute());

      // Three stops with known coords: A far, B close to C
      const stops = [
        makeStop({
          id: 's0',
          stopOrder: 1,
          pickupRequest: {
            ...makePickup(),
            address: { lat: 0, lng: 0 } as any,
          } as any,
        }),
        makeStop({
          id: 's1',
          stopOrder: 2,
          pickupRequest: {
            ...makePickup(),
            address: { lat: 10, lng: 10 } as any,
          } as any,
        }),
        makeStop({
          id: 's2',
          stopOrder: 3,
          pickupRequest: {
            ...makePickup(),
            address: { lat: 1, lng: 1 } as any,
          } as any,
        }),
      ];
      routeStopRepo.find.mockResolvedValue(stops);

      const result = await service.autoOrder('route-1', 'admin-1');

      // s0 (0,0) → s2 (1,1) → s1 (10,10)
      expect(result[0].id).toBe('s0');
      expect(result[0].stopOrder).toBe(1);
      expect(result[1].id).toBe('s2');
      expect(result[1].stopOrder).toBe(2);
      expect(result[2].id).toBe('s1');
      expect(result[2].stopOrder).toBe(3);

      expect(routeStopRepo.save).toHaveBeenCalled();
      expect(auditRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'ROUTE_AUTO_ORDERED' }),
      );
    });

    it('rejects auto-ordering non-DRAFT routes', async () => {
      routeRepo.findOne.mockResolvedValue(
        makeRoute({ status: RouteStatus.DISPATCHED }),
      );

      await expect(
        service.autoOrder('route-1', 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
