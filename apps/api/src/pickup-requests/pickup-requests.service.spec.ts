import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PickupRequestsService } from './pickup-requests.service';
import { PickupRequest } from '../entities/pickup-request.entity';
import { Address } from '../entities/address.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { RouteStop } from '../entities/route-stop.entity';
import { PickupRequestStatus } from '../enums';

function makePickup(overrides: Partial<PickupRequest> = {}): PickupRequest {
  return {
    id: 'pickup-1',
    userId: 'user-1',
    addressId: 'addr-1',
    estimatedKg: 10,
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

describe('PickupRequestsService', () => {
  let service: PickupRequestsService;
  let pickupRepo: Record<string, jest.Mock>;
  let addressRepo: Record<string, jest.Mock>;
  let auditRepo: Record<string, jest.Mock>;
  let routeStopRepo: Record<string, jest.Mock>;

  beforeEach(async () => {
    pickupRepo = {
      findOne: jest.fn(),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
      count: jest.fn().mockResolvedValue(0),
      save: jest.fn().mockImplementation((p) => Promise.resolve({ id: 'new-id', ...p })),
      create: jest.fn().mockImplementation((data) => data),
    };
    addressRepo = {
      findOne: jest.fn(),
    };
    auditRepo = {
      create: jest.fn().mockImplementation((data) => data),
      save: jest.fn().mockResolvedValue(undefined),
    };
    routeStopRepo = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PickupRequestsService,
        { provide: getRepositoryToken(PickupRequest), useValue: pickupRepo },
        { provide: getRepositoryToken(Address), useValue: addressRepo },
        { provide: getRepositoryToken(AuditLog), useValue: auditRepo },
        { provide: getRepositoryToken(RouteStop), useValue: routeStopRepo },
      ],
    }).compile();

    service = module.get<PickupRequestsService>(PickupRequestsService);
  });

  // --- Max open requests ---

  describe('create — max open requests rule', () => {
    const dto = {
      addressId: 'addr-1',
      estimatedKg: 5,
    };

    it('allows creation when under the limit', async () => {
      addressRepo.findOne.mockResolvedValue({ id: 'addr-1', userId: 'user-1' });
      pickupRepo.count.mockResolvedValue(2);

      const result = await service.create('user-1', dto);

      expect(result).toBeDefined();
      expect(pickupRepo.save).toHaveBeenCalled();
    });

    it('rejects creation when at the limit', async () => {
      addressRepo.findOne.mockResolvedValue({ id: 'addr-1', userId: 'user-1' });
      pickupRepo.count.mockResolvedValue(3);

      await expect(service.create('user-1', dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects when address does not belong to user', async () => {
      addressRepo.findOne.mockResolvedValue(null);

      await expect(service.create('user-1', dto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // --- Cancel ---

  describe('cancel', () => {
    it('cancels a PENDING request', async () => {
      pickupRepo.findOne.mockResolvedValue(makePickup());

      const result = await service.cancel('pickup-1', 'user-1', {
        reason: 'Changed mind',
      });

      expect(result.status).toBe(PickupRequestStatus.CANCELLED);
      expect(result.cancelledReason).toBe('Changed mind');
    });

    it('cancels a CLUSTERED request', async () => {
      pickupRepo.findOne.mockResolvedValue(
        makePickup({ status: PickupRequestStatus.CLUSTERED }),
      );

      const result = await service.cancel('pickup-1', 'user-1', {});

      expect(result.status).toBe(PickupRequestStatus.CANCELLED);
    });

    it('rejects cancelling a SCHEDULED request', async () => {
      pickupRepo.findOne.mockResolvedValue(
        makePickup({ status: PickupRequestStatus.SCHEDULED }),
      );

      await expect(
        service.cancel('pickup-1', 'user-1', {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects cancelling an EN_ROUTE request', async () => {
      pickupRepo.findOne.mockResolvedValue(
        makePickup({ status: PickupRequestStatus.EN_ROUTE }),
      );

      await expect(
        service.cancel('pickup-1', 'user-1', {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('writes an audit log on cancel', async () => {
      pickupRepo.findOne.mockResolvedValue(makePickup());

      await service.cancel('pickup-1', 'user-1', { reason: 'test' });

      expect(auditRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'STATUS_CHANGE',
          entityType: 'PickupRequest',
          payload: expect.objectContaining({
            from: PickupRequestStatus.PENDING,
            to: PickupRequestStatus.CANCELLED,
          }),
        }),
      );
      expect(auditRepo.save).toHaveBeenCalled();
    });
  });

  // --- Transition ---

  describe('transition', () => {
    it('transitions PENDING → CLUSTERED', async () => {
      pickupRepo.findOne.mockResolvedValue(makePickup());

      const result = await service.transition(
        'pickup-1',
        PickupRequestStatus.CLUSTERED,
        'admin-1',
      );

      expect(result.status).toBe(PickupRequestStatus.CLUSTERED);
    });

    it('writes audit log on transition', async () => {
      pickupRepo.findOne.mockResolvedValue(makePickup());

      await service.transition(
        'pickup-1',
        PickupRequestStatus.CLUSTERED,
        'admin-1',
      );

      expect(auditRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'admin-1',
          action: 'STATUS_CHANGE',
          payload: expect.objectContaining({
            from: PickupRequestStatus.PENDING,
            to: PickupRequestStatus.CLUSTERED,
          }),
        }),
      );
    });

    it('rejects invalid transitions', async () => {
      pickupRepo.findOne.mockResolvedValue(
        makePickup({ status: PickupRequestStatus.COLLECTED }),
      );

      await expect(
        service.transition('pickup-1', PickupRequestStatus.PENDING, 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException for missing pickup', async () => {
      pickupRepo.findOne.mockResolvedValue(null);

      await expect(
        service.transition('no-id', PickupRequestStatus.CLUSTERED, 'admin-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
