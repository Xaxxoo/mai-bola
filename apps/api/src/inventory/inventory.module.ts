import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryBatch } from '../entities/inventory-batch.entity';
import { Sale } from '../entities/sale.entity';
import { Collection } from '../entities/collection.entity';
import { Setting } from '../entities/setting.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InventoryBatch,
      Sale,
      Collection,
      Setting,
      AuditLog,
    ]),
  ],
  controllers: [InventoryController],
  providers: [InventoryService],
})
export class InventoryModule {}
