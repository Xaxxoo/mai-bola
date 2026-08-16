import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { RouteStopStatus } from '../enums';
import { Route } from './route.entity';
import { PickupRequest } from './pickup-request.entity';
import { Collection } from './collection.entity';

@Entity('route_stops')
export class RouteStop {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  routeId: string;

  @ManyToOne(() => Route, (r) => r.stops, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'routeId' })
  route: Route;

  @Column({ type: 'uuid' })
  pickupRequestId: string;

  @ManyToOne(() => PickupRequest, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pickupRequestId' })
  pickupRequest: PickupRequest;

  @Column({ type: 'int' })
  stopOrder: number;

  @Column({
    type: 'enum',
    enum: RouteStopStatus,
    default: RouteStopStatus.PENDING,
  })
  status: RouteStopStatus;

  @Column({ type: 'varchar', nullable: true })
  skippedReason: string;

  @OneToOne(() => Collection, (c) => c.routeStop)
  collection: Collection;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
