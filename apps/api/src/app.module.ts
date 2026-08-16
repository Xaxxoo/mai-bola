import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PickupRequestsModule } from './pickup-requests/pickup-requests.module';
import { UploadsModule } from './uploads/uploads.module';
import { RoutesModule } from './routes/routes.module';
import { DriverModule } from './driver/driver.module';
import { WalletModule } from './wallet/wallet.module';
import { InventoryModule } from './inventory/inventory.module';
import { MetricsModule } from './metrics/metrics.module';
import { Setting } from './entities/setting.entity';
import { JwtAuthGuard } from './common/guards';
import { RolesGuard } from './common/guards';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
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
import { RefreshToken } from './entities/refresh-token.entity';

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
        RefreshToken,
        Setting,
      ],
      synchronize: false,
      logging: process.env.NODE_ENV !== 'production',
    }),
    ThrottlerModule.forRoot([
      {
        ttl: parseInt(process.env.THROTTLE_TTL || '60', 10) * 1000,
        limit: parseInt(process.env.THROTTLE_LIMIT || '20', 10),
      },
    ]),
    AuthModule,
    UsersModule,
    PickupRequestsModule,
    UploadsModule,
    RoutesModule,
    DriverModule,
    WalletModule,
    InventoryModule,
    MetricsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
