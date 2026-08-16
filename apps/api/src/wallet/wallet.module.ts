import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletTransaction } from '../entities/wallet-transaction.entity';
import { Payout } from '../entities/payout.entity';
import { User } from '../entities/user.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { WalletController } from './wallet.controller';
import { AdminPayoutsController } from './admin-payouts.controller';
import { WalletService } from './wallet.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [TypeOrmModule.forFeature([WalletTransaction, Payout, User, AuditLog]), NotificationsModule],
  controllers: [WalletController, AdminPayoutsController],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
