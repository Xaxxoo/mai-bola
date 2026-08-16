import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { User } from './entities/user.entity';
import { Address } from './entities/address.entity';
import { PickupRequest } from './entities/pickup-request.entity';
import { Route } from './entities/route.entity';
import { RouteStop } from './entities/route-stop.entity';
import { Collection } from './entities/collection.entity';
import { WalletTransaction } from './entities/wallet-transaction.entity';
import { Payout } from './entities/payout.entity';
import { InventoryBatch } from './entities/inventory-batch.entity';
import { Sale } from './entities/sale.entity';
import { AuditLog } from './entities/audit-log.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url:
        process.env.DATABASE_URL ||
        'postgresql://maibola:maibola@localhost:5432/maibola',
      entities: [
        User,
        Address,
        PickupRequest,
        Route,
        RouteStop,
        Collection,
        WalletTransaction,
        Payout,
        InventoryBatch,
        Sale,
        AuditLog,
      ],
      synchronize: false,
      logging: process.env.NODE_ENV !== 'production',
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
