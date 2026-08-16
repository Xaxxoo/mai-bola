import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as argon2 from 'argon2';
import { User } from '../entities/user.entity';
import { Address } from '../entities/address.entity';
import { PickupRequest } from '../entities/pickup-request.entity';
import { WalletTransaction } from '../entities/wallet-transaction.entity';
import {
  UpdateProfileDto,
  CreateAddressDto,
  UpdateAddressDto,
  AdminListUsersQueryDto,
  AdminUpdateUserDto,
  AdminCreateUserDto,
} from './dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Address)
    private readonly addressRepo: Repository<Address>,
    @Optional() @InjectRepository(PickupRequest)
    private readonly pickupRepo: Repository<PickupRequest> | null,
    @Optional() @InjectRepository(WalletTransaction)
    private readonly walletTxRepo: Repository<WalletTransaction> | null,
  ) {}

  // --- Profile ---

  async getProfile(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    const { passwordHash: _, ...profile } = user;
    return profile;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (dto.fullName !== undefined) user.fullName = dto.fullName;
    if (dto.supplierType !== undefined) user.supplierType = dto.supplierType;

    await this.userRepo.save(user);
    const { passwordHash: _, ...profile } = user;
    return profile;
  }

  // --- Addresses ---

  async listAddresses(userId: string) {
    return this.addressRepo.find({
      where: { userId },
      order: { isDefault: 'DESC', createdAt: 'ASC' },
    });
  }

  async createAddress(userId: string, dto: CreateAddressDto) {
    const existing = await this.addressRepo.find({ where: { userId } });
    const isFirst = existing.length === 0;
    const shouldBeDefault = dto.isDefault ?? isFirst;

    if (shouldBeDefault && existing.length > 0) {
      await this.clearDefaults(userId);
    }

    const address = this.addressRepo.create({
      ...dto,
      userId,
      isDefault: shouldBeDefault,
    });
    return this.addressRepo.save(address);
  }

  async getAddress(userId: string, addressId: string) {
    const address = await this.addressRepo.findOne({
      where: { id: addressId, userId },
    });
    if (!address) throw new NotFoundException('Address not found');
    return address;
  }

  async updateAddress(userId: string, addressId: string, dto: UpdateAddressDto) {
    const address = await this.addressRepo.findOne({
      where: { id: addressId, userId },
    });
    if (!address) throw new NotFoundException('Address not found');

    if (dto.isDefault === true && !address.isDefault) {
      await this.clearDefaults(userId);
    }

    if (dto.isDefault === false && address.isDefault) {
      throw new BadRequestException(
        'Cannot unset default — set another address as default instead',
      );
    }

    Object.assign(address, dto);
    return this.addressRepo.save(address);
  }

  async deleteAddress(userId: string, addressId: string) {
    const address = await this.addressRepo.findOne({
      where: { id: addressId, userId },
    });
    if (!address) throw new NotFoundException('Address not found');

    await this.addressRepo.remove(address);

    // If deleted address was default, promote the oldest remaining
    if (address.isDefault) {
      const oldest = await this.addressRepo.findOne({
        where: { userId },
        order: { createdAt: 'ASC' },
      });
      if (oldest) {
        oldest.isDefault = true;
        await this.addressRepo.save(oldest);
      }
    }
  }

  /** Unset isDefault on all addresses for a user */
  async clearDefaults(userId: string) {
    await this.addressRepo.update({ userId, isDefault: true }, { isDefault: false });
  }

  // --- Admin ---

  async adminListUsers(query: AdminListUsersQueryDto) {
    const qb = this.userRepo
      .createQueryBuilder('u')
      .leftJoin('u.addresses', 'a');

    if (query.role) {
      qb.andWhere('u.role = :role', { role: query.role });
    }

    if (query.supplierType) {
      qb.andWhere('u.supplierType = :supplierType', {
        supplierType: query.supplierType,
      });
    }

    if (query.zone) {
      qb.andWhere('a.zone = :zone', { zone: query.zone });
    }

    if (query.search) {
      qb.andWhere(
        '(u.phone ILIKE :search OR u.fullName ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    qb.select([
      'u.id',
      'u.phone',
      'u.fullName',
      'u.role',
      'u.supplierType',
      'u.isActive',
      'u.createdAt',
    ]);

    if (query.zone) {
      qb.groupBy('u.id');
    }

    qb.orderBy('u.createdAt', 'DESC');

    const total = await qb.getCount();
    const data = await qb
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getMany();

    return { data, total, page: query.page, limit: query.limit };
  }

  async adminUpdateUser(userId: string, dto: AdminUpdateUserDto) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (dto.isActive !== undefined) user.isActive = dto.isActive;
    if (dto.role !== undefined) user.role = dto.role;

    await this.userRepo.save(user);
    const { passwordHash: _, ...result } = user;
    return result;
  }

  async adminCreateUser(dto: AdminCreateUserDto) {
    const existing = await this.userRepo.findOne({
      where: { phone: dto.phone },
    });
    if (existing) {
      throw new ConflictException('Phone number already registered');
    }

    const passwordHash = await argon2.hash(dto.password);
    const user = this.userRepo.create({
      phone: dto.phone,
      fullName: dto.fullName,
      passwordHash,
      role: dto.role,
    });
    await this.userRepo.save(user);

    const { passwordHash: _, ...result } = user;
    return result;
  }

  async adminGetSupplierOverview(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (!this.pickupRepo || !this.walletTxRepo) throw new Error('Supplier overview repositories are unavailable');
    const [addresses, requests, transactions] = await Promise.all([
      this.addressRepo.find({ where: { userId }, order: { isDefault: 'DESC', createdAt: 'ASC' } }),
      this.pickupRepo.find({ where: { userId }, relations: ['address'], order: { createdAt: 'DESC' } }),
      this.walletTxRepo.find({ where: { userId }, order: { createdAt: 'DESC' } }),
    ]);
    const { passwordHash: _, ...profile } = user;
    const balance = transactions[0]?.balanceAfter || 0;
    return {
      profile,
      addresses,
      requests,
      wallet: {
        balance: Number(balance).toFixed(2),
        totalEarned: transactions.filter((tx) => tx.type === 'CREDIT_COLLECTION').reduce((sum, tx) => sum + Number(tx.amount), 0).toFixed(2),
        totalPaidOut: transactions.filter((tx) => tx.type === 'DEBIT_PAYOUT').reduce((sum, tx) => sum + Math.abs(Number(tx.amount)), 0).toFixed(2),
      },
    };
  }
}
