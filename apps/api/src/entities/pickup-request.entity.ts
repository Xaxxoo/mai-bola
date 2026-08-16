import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { PickupRequestStatus } from '../enums';
import { User } from './user.entity';
import { Address } from './address.entity';

@Index(['status', 'createdAt'])
@Entity('pickup_requests')
export class PickupRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, (u) => u.pickupRequests, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'uuid' })
  addressId: string;

  @ManyToOne(() => Address, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'addressId' })
  address: Address;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  estimatedKg: number;

  @Column({ type: 'varchar', nullable: true })
  note: string;

  @Column({ type: 'text', array: true, default: '{}' })
  photoUrls: string[];

  @Column({
    type: 'enum',
    enum: PickupRequestStatus,
    default: PickupRequestStatus.PENDING,
  })
  status: PickupRequestStatus;

  @Column({ type: 'varchar', nullable: true })
  cancelledReason: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
