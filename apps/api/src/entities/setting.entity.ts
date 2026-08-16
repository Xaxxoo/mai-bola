import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
} from 'typeorm';

@Entity('settings')
export class Setting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 120 })
  buyPricePerKg: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 570 })
  sellPricePerKg: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 450 })
  allInCostPerKg: number;

  @UpdateDateColumn()
  updatedAt: Date;
}
