import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PickupRequest } from '../entities/pickup-request.entity';
import { Address } from '../entities/address.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { RouteStop } from '../entities/route-stop.entity';
import { PickupRequestsController } from './pickup-requests.controller';
import { PickupRequestsService } from './pickup-requests.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [TypeOrmModule.forFeature([PickupRequest, Address, AuditLog, RouteStop]), NotificationsModule],
  controllers: [PickupRequestsController],
  providers: [PickupRequestsService],
  exports: [PickupRequestsService],
})
export class PickupRequestsModule {}
