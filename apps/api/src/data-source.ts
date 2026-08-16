import 'reflect-metadata';
import { DataSource } from 'typeorm';
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

const databaseUrl =
  process.env.DATABASE_URL ||
  'postgresql://maibola:maibola@localhost:5432/maibola';

export default new DataSource({
  type: 'postgres',
  url: databaseUrl,
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
  ],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
  logging: false,
});
