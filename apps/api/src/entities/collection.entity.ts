import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { RouteStop } from './route-stop.entity';
import { User } from './user.entity';

@Entity('collections')
export class Collection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  routeStopId: string;

  @Column({ type: 'varchar', nullable: true, unique: true })
  idempotencyKey?: string | null;

  @OneToOne(() => RouteStop, (rs) => rs.collection, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'routeStopId' })
  routeStop: RouteStop;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  actualKg: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 120 })
  pricePerKg: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amountPaid: number;

  @Column({ type: 'timestamptz' })
  collectedAt: Date;

  @Column({ type: 'uuid' })
  recordedById: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recordedById' })
  recordedBy: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
