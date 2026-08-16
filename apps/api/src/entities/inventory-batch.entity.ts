import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { InventoryBatchStatus } from '../enums';
import { Collection } from './collection.entity';

@Entity('inventory_batches')
export class InventoryBatch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToMany(() => Collection)
  @JoinTable({
    name: 'inventory_batch_collections',
    joinColumn: { name: 'inventoryBatchId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'collectionId', referencedColumnName: 'id' },
  })
  sourceCollections: Collection[];

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  grossKg: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  processedKg: number;

  @Column({
    type: 'enum',
    enum: InventoryBatchStatus,
    default: InventoryBatchStatus.RAW,
  })
  status: InventoryBatchStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
