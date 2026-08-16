import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { UserRole, SupplierType } from '../enums';
import { Address } from './address.entity';
import { PickupRequest } from './pickup-request.entity';
import { WalletTransaction } from './wallet-transaction.entity';
import { Payout } from './payout.entity';
import { RefreshToken } from './refresh-token.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  phone: string;

  @Column({ type: 'varchar' })
  fullName: string;

  @Column({ type: 'varchar', nullable: true })
  passwordHash: string;

  @Column({ type: 'enum', enum: UserRole })
  role: UserRole;

  @Column({ type: 'enum', enum: SupplierType, nullable: true })
  supplierType: SupplierType | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Address, (a) => a.user)
  addresses: Address[];

  @OneToMany(() => PickupRequest, (p) => p.user)
  pickupRequests: PickupRequest[];

  @OneToMany(() => WalletTransaction, (w) => w.user)
  walletTransactions: WalletTransaction[];

  @OneToMany(() => Payout, (p) => p.user)
  payouts: Payout[];

  @OneToMany(() => RefreshToken, (rt) => rt.user)
  refreshTokens: RefreshToken[];
}
