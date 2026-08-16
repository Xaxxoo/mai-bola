import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Collection } from '../entities/collection.entity';
import { Sale } from '../entities/sale.entity';
import { Payout } from '../entities/payout.entity';
import { User } from '../entities/user.entity';
import { WalletTransaction } from '../entities/wallet-transaction.entity';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';
import { PublicMetricsController } from './public-metrics.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Collection,
      Sale,
      Payout,
      User,
      WalletTransaction,
    ]),
  ],
  controllers: [MetricsController, PublicMetricsController],
  providers: [MetricsService],
})
export class MetricsModule {}
