import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Route } from '../entities/route.entity';
import { RouteStop } from '../entities/route-stop.entity';
import { Collection } from '../entities/collection.entity';
import { WalletTransaction } from '../entities/wallet-transaction.entity';
import { User } from '../entities/user.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { PickupRequestsModule } from '../pickup-requests/pickup-requests.module';
import { ConfigModule } from '../config/config.module';
import { DriverController } from './driver.controller';
import { DriverService } from './driver.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Route,
      RouteStop,
      Collection,
      WalletTransaction,
      User,
      AuditLog,
    ]),
    PickupRequestsModule,
    ConfigModule,
  ],
  controllers: [DriverController],
  providers: [DriverService],
})
export class DriverModule {}
