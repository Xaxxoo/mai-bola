import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Collection } from '../entities/collection.entity';
import { Sale } from '../entities/sale.entity';
import { Payout } from '../entities/payout.entity';
import { User } from '../entities/user.entity';
import { WalletTransaction } from '../entities/wallet-transaction.entity';
import { UserRole, PayoutStatus, WalletTransactionType } from '../enums';
import {
  TimeseriesQueryDto,
  TimeseriesMetric,
  TimeseriesInterval,
} from './dto/timeseries-query.dto';

const TRUCKLOAD_KG = 20_000;

@Injectable()
export class MetricsService {
  constructor(
    @InjectRepository(Collection)
    private readonly collectionRepo: Repository<Collection>,
    @InjectRepository(Sale)
    private readonly saleRepo: Repository<Sale>,
    @InjectRepository(Payout)
    private readonly payoutRepo: Repository<Payout>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(WalletTransaction)
    private readonly walletTxRepo: Repository<WalletTransaction>,
  ) {}

  async getOverview() {
    const [kgCollected, paidToSuppliers, kgSold, lifetimeContribution, activeSuppliers] =
      await Promise.all([
        this.collectionRepo
          .createQueryBuilder('c')
          .select('COALESCE(SUM(c.actualKg), 0)', 'total')
          .getRawOne()
          .then((r) => Number(r.total)),

        this.walletTxRepo
          .createQueryBuilder('wt')
          .select('COALESCE(SUM(wt.amount), 0)', 'total')
          .where('wt.type = :type', { type: WalletTransactionType.CREDIT_COLLECTION })
          .getRawOne()
          .then((r) => Number(r.total)),

        this.saleRepo
          .createQueryBuilder('s')
          .select('COALESCE(SUM(s.totalKg), 0)', 'total')
          .getRawOne()
          .then((r) => Number(r.total)),

        this.saleRepo
          .createQueryBuilder('s')
          .select('COALESCE(SUM(s.contribution), 0)', 'total')
          .getRawOne()
          .then((r) => Number(r.total)),

        this.userRepo.count({
          where: { role: UserRole.SUPPLIER, isActive: true },
        }),
      ]);

    return {
      tonnesRecovered: +(kgCollected / 1000).toFixed(2),
      kgRecovered: +kgCollected.toFixed(2),
      paidToSuppliers: +paidToSuppliers.toFixed(2),
      tonnesSold: +(kgSold / 1000).toFixed(2),
      kgSold: +kgSold.toFixed(2),
      activeSuppliers,
      truckloadEquivalents: +(kgCollected / TRUCKLOAD_KG).toFixed(2),
      lifetimeContribution: +lifetimeContribution.toFixed(2),
    };
  }

  async getTimeseries(query: TimeseriesQueryDto) {
    const { metric, interval } = query;

    let tableName: string;
    let dateColumn: string;
    let valueExpr: string;

    switch (metric) {
      case TimeseriesMetric.KG_COLLECTED:
        tableName = 'collections';
        dateColumn = '"collectedAt"';
        valueExpr = 'COALESCE(SUM("actualKg"), 0)';
        break;
      case TimeseriesMetric.NAIRA_PAID:
        tableName = 'wallet_transactions';
        dateColumn = '"createdAt"';
        valueExpr = 'COALESCE(SUM(amount), 0)';
        break;
      case TimeseriesMetric.KG_SOLD:
        tableName = 'sales';
        dateColumn = '"soldAt"';
        valueExpr = 'COALESCE(SUM("totalKg"), 0)';
        break;
    }

    let truncExpr: string;
    switch (interval) {
      case TimeseriesInterval.DAY:
        truncExpr = `date_trunc('day', ${dateColumn})`;
        break;
      case TimeseriesInterval.WEEK:
        truncExpr = `date_trunc('week', ${dateColumn})`;
        break;
      case TimeseriesInterval.MONTH:
        truncExpr = `date_trunc('month', ${dateColumn})`;
        break;
    }

    const params: any[] = [];
    const conditions: string[] = [];

    if (metric === TimeseriesMetric.NAIRA_PAID) {
      conditions.push(`type = $${params.length + 1}`);
      params.push(WalletTransactionType.CREDIT_COLLECTION);
    }

    if (query.from) {
      conditions.push(`${dateColumn} >= $${params.length + 1}`);
      params.push(query.from);
    }
    if (query.to) {
      conditions.push(`${dateColumn} <= $${params.length + 1}`);
      params.push(query.to);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT ${truncExpr} AS bucket, ${valueExpr} AS value
      FROM ${tableName}
      ${whereClause}
      GROUP BY bucket
      ORDER BY bucket ASC
    `;

    const rows: { bucket: string; value: string }[] =
      await this.collectionRepo.query(sql, params);

    return rows.map((r) => ({
      date: r.bucket,
      value: +Number(r.value).toFixed(2),
    }));
  }

  async getPublicMetrics() {
    const [kgCollected, kgSold, activeSuppliers, paidToSuppliers] =
      await Promise.all([
        this.collectionRepo
          .createQueryBuilder('c')
          .select('COALESCE(SUM(c.actualKg), 0)', 'total')
          .getRawOne()
          .then((r) => Number(r.total)),

        this.saleRepo
          .createQueryBuilder('s')
          .select('COALESCE(SUM(s.totalKg), 0)', 'total')
          .getRawOne()
          .then((r) => Number(r.total)),

        this.userRepo.count({
          where: { role: UserRole.SUPPLIER, isActive: true },
        }),

        this.walletTxRepo
          .createQueryBuilder('wt')
          .select('COALESCE(SUM(wt.amount), 0)', 'total')
          .where('wt.type = :type', { type: WalletTransactionType.CREDIT_COLLECTION })
          .getRawOne()
          .then((r) => Number(r.total)),
      ]);

    return {
      tonnesRecovered: +(kgCollected / 1000).toFixed(2),
      tonnesSold: +(kgSold / 1000).toFixed(2),
      activeSuppliers,
      paidToSuppliers: +paidToSuppliers.toFixed(2),
    };
  }
}
