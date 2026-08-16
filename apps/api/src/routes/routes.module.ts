import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Route } from '../entities/route.entity';
import { RouteStop } from '../entities/route-stop.entity';
import { PickupRequest } from '../entities/pickup-request.entity';
import { User } from '../entities/user.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { PickupRequestsModule } from '../pickup-requests/pickup-requests.module';
import { RoutesController } from './routes.controller';
import { RoutesService } from './routes.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Route, RouteStop, PickupRequest, User, AuditLog]),
    PickupRequestsModule,
  ],
  controllers: [RoutesController],
  providers: [RoutesService],
  exports: [RoutesService],
})
export class RoutesModule {}
