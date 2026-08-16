import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { InventoryBatch } from './inventory-batch.entity';

@Entity('sales')
export class Sale {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', default: 'Lagos off-taker' })
  buyerName: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalKg: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 570 })
  pricePerKg: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  revenue: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 450 })
  allInCostPerKg: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  contribution: number;

  @ManyToMany(() => InventoryBatch)
  @JoinTable({
    name: 'sale_batches',
    joinColumn: { name: 'saleId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'inventoryBatchId', referencedColumnName: 'id' },
  })
  batches: InventoryBatch[];

  @Column({ type: 'timestamptz' })
  soldAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
