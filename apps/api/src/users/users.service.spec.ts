import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from '../entities/user.entity';
import { Address } from '../entities/address.entity';
import { UserRole, SupplierType } from '../enums';

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    phone: '+2348012345678',
    fullName: 'Test User',
    passwordHash: 'hashed',
    role: UserRole.SUPPLIER,
    supplierType: SupplierType.HOUSEHOLD,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    addresses: [],
    pickupRequests: [],
    walletTransactions: [],
    payouts: [],
    refreshTokens: [],
    ...overrides,
  };
}

function makeAddress(overrides: Partial<Address> = {}): Address {
  return {
    id: 'addr-1',
    userId: 'user-1',
    label: 'Home',
    streetText: '12 Main St',
    area: 'Barnawa',
    zone: 'Barnawa',
    lat: 10.5,
    lng: 7.4,
    isDefault: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: null as any,
    ...overrides,
  };
}

describe('UsersService', () => {
  let service: UsersService;
  let userRepo: Record<string, jest.Mock>;
  let addressRepo: Record<string, jest.Mock>;

  beforeEach(async () => {
    userRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn().mockImplementation((u) => Promise.resolve(u)),
      create: jest.fn().mockImplementation((data) => data),
      createQueryBuilder: jest.fn(),
    };

    addressRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn().mockImplementation((a) => Promise.resolve(a)),
      create: jest.fn().mockImplementation((data) => data),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      remove: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(Address), useValue: addressRepo },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  // --- Address default-switching logic ---

  describe('createAddress', () => {
    it('sets first address as default automatically', async () => {
      addressRepo.find.mockResolvedValue([]);
      const dto = {
        label: 'Home',
        streetText: '12 Main St',
        zone: 'Barnawa',
        lat: 10.5,
        lng: 7.4,
      };

      await service.createAddress('user-1', dto);

      expect(addressRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ isDefault: true }),
      );
    });

    it('does not auto-default when addresses already exist', async () => {
      addressRepo.find.mockResolvedValue([makeAddress({ isDefault: true })]);
      const dto = {
        label: 'Work',
        streetText: '5 Office Rd',
        zone: 'Kakuri',
        lat: 10.4,
        lng: 7.3,
      };

      await service.createAddress('user-1', dto);

      expect(addressRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ isDefault: false }),
      );
      expect(addressRepo.update).not.toHaveBeenCalled();
    });

    it('clears existing defaults when new address is explicitly default', async () => {
      addressRepo.find.mockResolvedValue([
        makeAddress({ id: 'addr-old', isDefault: true }),
      ]);
      const dto = {
        label: 'New default',
        streetText: '1 First Ave',
        zone: 'Malali',
        lat: 10.6,
        lng: 7.5,
        isDefault: true,
      };

      await service.createAddress('user-1', dto);

      expect(addressRepo.update).toHaveBeenCalledWith(
        { userId: 'user-1', isDefault: true },
        { isDefault: false },
      );
      expect(addressRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ isDefault: true }),
      );
    });
  });

  describe('updateAddress', () => {
    it('clears other defaults when setting an address as default', async () => {
      addressRepo.findOne.mockResolvedValue(
        makeAddress({ id: 'addr-2', isDefault: false }),
      );

      await service.updateAddress('user-1', 'addr-2', { isDefault: true });

      expect(addressRepo.update).toHaveBeenCalledWith(
        { userId: 'user-1', isDefault: true },
        { isDefault: false },
      );
    });

    it('rejects unsetting default without replacement', async () => {
      addressRepo.findOne.mockResolvedValue(
        makeAddress({ id: 'addr-1', isDefault: true }),
      );

      await expect(
        service.updateAddress('user-1', 'addr-1', { isDefault: false }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException for non-existent address', async () => {
      addressRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateAddress('user-1', 'no-such-id', { label: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteAddress', () => {
    it('promotes oldest remaining address when default is deleted', async () => {
      const defaultAddr = makeAddress({ id: 'addr-1', isDefault: true });
      const nextOldest = makeAddress({ id: 'addr-2', isDefault: false });

      addressRepo.findOne
        .mockResolvedValueOnce(defaultAddr) // delete lookup
        .mockResolvedValueOnce(nextOldest); // oldest remaining

      await service.deleteAddress('user-1', 'addr-1');

      expect(addressRepo.remove).toHaveBeenCalledWith(defaultAddr);
      expect(addressRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'addr-2', isDefault: true }),
      );
    });

    it('does not promote when non-default is deleted', async () => {
      const addr = makeAddress({ id: 'addr-2', isDefault: false });
      addressRepo.findOne.mockResolvedValue(addr);

      await service.deleteAddress('user-1', 'addr-2');

      expect(addressRepo.remove).toHaveBeenCalledWith(addr);
      // save should not have been called (no promotion needed)
      expect(addressRepo.save).not.toHaveBeenCalled();
    });
  });

  // --- Admin filters ---

  describe('adminListUsers', () => {
    let qb: Record<string, jest.Mock>;

    beforeEach(() => {
      qb = {
        leftJoin: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
        getMany: jest.fn().mockResolvedValue([]),
      };
      userRepo.createQueryBuilder.mockReturnValue(qb);
    });

    it('returns paginated result shape', async () => {
      qb.getCount.mockResolvedValue(2);
      qb.getMany.mockResolvedValue([makeUser(), makeUser({ id: 'user-2' })]);

      const result = await service.adminListUsers({ page: 1, limit: 20 });

      expect(result).toEqual({
        data: expect.any(Array),
        total: 2,
        page: 1,
        limit: 20,
      });
      expect(result.data).toHaveLength(2);
    });

    it('filters by role', async () => {
      await service.adminListUsers({
        page: 1,
        limit: 20,
        role: UserRole.DRIVER,
      });

      expect(qb.andWhere).toHaveBeenCalledWith('u.role = :role', {
        role: UserRole.DRIVER,
      });
    });

    it('filters by supplierType', async () => {
      await service.adminListUsers({
        page: 1,
        limit: 20,
        supplierType: SupplierType.BUSINESS,
      });

      expect(qb.andWhere).toHaveBeenCalledWith(
        'u.supplierType = :supplierType',
        { supplierType: SupplierType.BUSINESS },
      );
    });

    it('filters by zone (joins addresses)', async () => {
      await service.adminListUsers({
        page: 1,
        limit: 20,
        zone: 'Barnawa',
      });

      expect(qb.andWhere).toHaveBeenCalledWith('a.zone = :zone', {
        zone: 'Barnawa',
      });
      expect(qb.groupBy).toHaveBeenCalledWith('u.id');
    });

    it('searches by phone or name', async () => {
      await service.adminListUsers({
        page: 1,
        limit: 20,
        search: 'Test',
      });

      expect(qb.andWhere).toHaveBeenCalledWith(
        '(u.phone ILIKE :search OR u.fullName ILIKE :search)',
        { search: '%Test%' },
      );
    });

    it('applies pagination offset correctly', async () => {
      await service.adminListUsers({ page: 3, limit: 10 });

      expect(qb.skip).toHaveBeenCalledWith(20);
      expect(qb.take).toHaveBeenCalledWith(10);
    });

    it('applies no extra filters when none provided', async () => {
      await service.adminListUsers({ page: 1, limit: 20 });

      expect(qb.andWhere).not.toHaveBeenCalled();
      expect(qb.groupBy).not.toHaveBeenCalled();
    });
  });
});
