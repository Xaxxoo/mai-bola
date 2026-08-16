import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { NotificationType } from '../enums';

@Entity('notifications')
@Index(['userId', 'createdAt'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column({ type: 'uuid' }) userId: string;
  @Column({ type: 'enum', enum: NotificationType }) type: NotificationType;
  @Column({ type: 'varchar' }) title: string;
  @Column({ type: 'text' }) body: string;
  @Column({ type: 'jsonb', default: '{}' }) data: Record<string, unknown>;
  @Column({ type: 'timestamptz', nullable: true }) readAt: Date | null;
  @CreateDateColumn() createdAt: Date;
}
