import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { RouteStatus } from '../enums';
import { User } from './user.entity';
import { RouteStop } from './route-stop.entity';

@Entity('routes')
export class Route {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar' })
  zone: string;

  @Index()
  @Column({ type: 'date' })
  scheduledDate: string;

  @Column({
    type: 'enum',
    enum: RouteStatus,
    default: RouteStatus.DRAFT,
  })
  status: RouteStatus;

  @Column({ type: 'uuid' })
  driverId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'driverId' })
  driver: User;

  @OneToMany(() => RouteStop, (s) => s.route)
  stops: RouteStop[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
