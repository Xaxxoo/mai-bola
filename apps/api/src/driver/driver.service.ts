import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Route } from '../entities/route.entity';
import { RouteStop } from '../entities/route-stop.entity';
import { Collection } from '../entities/collection.entity';
import { WalletTransaction } from '../entities/wallet-transaction.entity';
import { User } from '../entities/user.entity';
import { AuditLog } from '../entities/audit-log.entity';
import {
  PickupRequestStatus,
  RouteStatus,
  RouteStopStatus,
  WalletTransactionType,
} from '../enums';
import { PickupRequest } from '../entities/pickup-request.entity';
import { PickupRequestsService } from '../pickup-requests/pickup-requests.service';
import { ConfigService } from '../config/config.service';
import { CollectDto, SkipStopDto } from './dto';

@Injectable()
export class DriverService {
  constructor(
    @InjectRepository(Route)
    private readonly routeRepo: Repository<Route>,
    @InjectRepository(RouteStop)
    private readonly routeStopRepo: Repository<RouteStop>,
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
    private readonly pickupService: PickupRequestsService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  // --- Today's routes for driver ---

  async getToday(driverId: string) {
    const today = new Date().toISOString().slice(0, 10);
    const routes = await this.routeRepo.find({
      where: {
        driverId,
        scheduledDate: today,
        status: In([RouteStatus.DISPATCHED, RouteStatus.IN_PROGRESS]),
      },
      relations: [
        'stops',
        'stops.pickupRequest',
        'stops.pickupRequest.address',
        'stops.pickupRequest.user',
        'stops.collection',
      ],
    });

    for (const route of routes) {
      if (route.stops) {
        route.stops.sort((a, b) => a.stopOrder - b.stopOrder);
      }
    }

    return routes.map((route) => this.toDriverManifest(route));
  }

  // --- Start route ---

  async startRoute(routeId: string, driverId: string) {
    const route = await this.routeRepo.findOne({
      where: { id: routeId, driverId },
    });
    if (!route) throw new NotFoundException('Route not found');
    if (route.status !== RouteStatus.DISPATCHED) {
      throw new BadRequestException('Route must be in DISPATCHED status');
    }

    route.status = RouteStatus.IN_PROGRESS;
    await this.routeRepo.save(route);

    // Transition all stops' pickup requests to EN_ROUTE
    const stops = await this.routeStopRepo.find({ where: { routeId } });
    for (const stop of stops) {
      await this.pickupService.transition(
        stop.pickupRequestId,
        PickupRequestStatus.EN_ROUTE,
        driverId,
      );
    }

    await this.writeAudit(driverId, 'ROUTE_STARTED', routeId, {
      stopCount: stops.length,
    });

    return this.getRouteWithStops(routeId);
  }

  // --- Arrive at stop ---

  async arriveStop(stopId: string, driverId: string, idempotencyKey?: string) {
    const stop = await this.getStopForDriver(stopId, driverId);

    if (stop.route.status !== RouteStatus.IN_PROGRESS) {
      throw new BadRequestException('Route must be in progress');
    }
    if (stop.status === RouteStopStatus.ARRIVED && idempotencyKey) {
      return stop;
    }
    if (stop.status !== RouteStopStatus.PENDING) {
      throw new BadRequestException('Stop must be in PENDING status');
    }

    stop.status = RouteStopStatus.ARRIVED;
    await this.routeStopRepo.save(stop);

    await this.writeAudit(driverId, 'STOP_ARRIVED', stopId, {
      routeId: stop.routeId,
    });

    return stop;
  }

  // --- Collect at stop (transactional with wallet credit) ---

  async collectStop(
    stopId: string,
    driverId: string,
    dto: CollectDto,
    idempotencyKey?: string,
  ) {
    const stop = await this.getStopForDriver(stopId, driverId);

    // A retried offline action returns the original collection and never
    // credits the supplier twice.
    if (idempotencyKey) {
      const existing = await this.dataSource.transaction(async (manager) => {
        const repo = manager.getRepository(Collection);
        return typeof repo.findOne === 'function'
          ? repo.findOne({ where: { idempotencyKey } })
          : null;
      });
      if (existing) return existing;
    }

    if (stop.route.status !== RouteStatus.IN_PROGRESS) {
      throw new BadRequestException('Route must be in progress');
    }
    if (stop.status !== RouteStopStatus.ARRIVED) {
      throw new BadRequestException('Stop must be in ARRIVED status');
    }

    const supplierId = stop.pickupRequest.userId;
    const pricePerKg = this.configService.pricePerKg;
    const amountPaid = Number((dto.actualKg * pricePerKg).toFixed(2));

    return this.dataSource.transaction(async (manager) => {
      // Lock the supplier's user row to prevent concurrent wallet operations
      await manager
        .getRepository(User)
        .createQueryBuilder('u')
        .setLock('pessimistic_write')
        .where('u.id = :userId', { userId: supplierId })
        .getOne();

      // Get current balance from latest wallet transaction
      const lastTx = await manager.getRepository(WalletTransaction).findOne({
        where: { userId: supplierId },
        order: { createdAt: 'DESC' },
      });
      const currentBalance = lastTx ? Number(lastTx.balanceAfter) : 0;
      const newBalance = Number((currentBalance + amountPaid).toFixed(2));

      // Create collection record
      const collection = manager.create(Collection, {
        routeStopId: stopId,
        idempotencyKey: idempotencyKey || null,
        actualKg: dto.actualKg,
        pricePerKg,
        amountPaid,
        collectedAt: new Date(),
        recordedById: driverId,
      });
      const savedCollection = (await manager.save(collection)) as Collection;

      // Credit supplier wallet
      const walletTx = manager.create(WalletTransaction, {
        userId: supplierId,
        type: WalletTransactionType.CREDIT_COLLECTION,
        amount: amountPaid,
        balanceAfter: newBalance,
        reference: savedCollection.id,
        note: `Collection of ${dto.actualKg}kg at ₦${pricePerKg}/kg`,
      });
      await manager.save(walletTx);

      // Update stop status to COLLECTED
      stop.status = RouteStopStatus.COLLECTED;
      await manager.save(RouteStop, stop as any);

      // Transition pickup to COLLECTED (within same transaction)
      const pickup = stop.pickupRequest;
      const fromStatus = pickup.status;
      pickup.status = PickupRequestStatus.COLLECTED;
      await manager.save(PickupRequest, pickup as any);

      // Audit: collection recorded
      await manager.save(
        manager.create(AuditLog, {
          actorId: driverId,
          action: 'COLLECTION_RECORDED',
          entityType: 'Collection',
          entityId: savedCollection.id,
          payload: {
            routeStopId: stopId,
            pickupRequestId: stop.pickupRequestId,
            actualKg: dto.actualKg,
            pricePerKg,
            amountPaid,
            supplierId,
            newBalance,
          },
        }),
      );

      // Audit: pickup status change
      await manager.save(
        manager.create(AuditLog, {
          actorId: driverId,
          action: 'STATUS_CHANGE',
          entityType: 'PickupRequest',
          entityId: stop.pickupRequestId,
          payload: { from: fromStatus, to: PickupRequestStatus.COLLECTED },
        }),
      );

      return savedCollection;
    });
  }

  // --- Skip stop ---

  async skipStop(
    stopId: string,
    driverId: string,
    dto: SkipStopDto,
    idempotencyKey?: string,
  ) {
    const stop = await this.getStopForDriver(stopId, driverId);

    if (stop.route.status !== RouteStatus.IN_PROGRESS) {
      throw new BadRequestException('Route must be in progress');
    }
    if (stop.status === RouteStopStatus.SKIPPED && idempotencyKey) {
      return stop;
    }
    if (
      stop.status !== RouteStopStatus.PENDING &&
      stop.status !== RouteStopStatus.ARRIVED
    ) {
      throw new BadRequestException('Stop must be PENDING or ARRIVED');
    }

    stop.status = RouteStopStatus.SKIPPED;
    stop.skippedReason = dto.reason || (null as any);
    await this.routeStopRepo.save(stop);

    // Transition pickup back to PENDING (available for re-clustering)
    await this.pickupService.transition(
      stop.pickupRequestId,
      PickupRequestStatus.PENDING,
      driverId,
    );

    await this.writeAudit(driverId, 'STOP_SKIPPED', stopId, {
      routeId: stop.routeId,
      pickupRequestId: stop.pickupRequestId,
      reason: dto.reason,
    });

    return stop;
  }

  // --- Complete route ---

  async completeRoute(routeId: string, driverId: string) {
    const route = await this.routeRepo.findOne({
      where: { id: routeId, driverId },
    });
    if (!route) throw new NotFoundException('Route not found');
    if (route.status !== RouteStatus.IN_PROGRESS) {
      throw new BadRequestException('Route must be in progress');
    }

    // All stops must be COLLECTED or SKIPPED
    const incompleteCount = await this.routeStopRepo.count({
      where: {
        routeId,
        status: In([RouteStopStatus.PENDING, RouteStopStatus.ARRIVED]),
      },
    });
    if (incompleteCount > 0) {
      throw new BadRequestException(
        `${incompleteCount} stop(s) still pending or arrived`,
      );
    }

    route.status = RouteStatus.COMPLETED;
    await this.routeRepo.save(route);

    await this.writeAudit(driverId, 'ROUTE_COMPLETED', routeId, {});

    return this.getRouteWithStops(routeId);
  }

  // --- Helpers ---

  private async getStopForDriver(
    stopId: string,
    driverId: string,
  ): Promise<RouteStop> {
    const stop = await this.routeStopRepo.findOne({
      where: { id: stopId },
      relations: ['route', 'pickupRequest'],
    });
    if (!stop) throw new NotFoundException('Stop not found');
    if (stop.route.driverId !== driverId) {
      throw new ForbiddenException('Not your route');
    }
    return stop;
  }

  private async getRouteWithStops(routeId: string) {
    const route = await this.routeRepo.findOne({
      where: { id: routeId },
      relations: [
        'stops',
        'stops.pickupRequest',
        'stops.pickupRequest.address',
        'stops.pickupRequest.user',
        'stops.collection',
      ],
    });
    if (route && route.stops) {
      route.stops.sort((a, b) => a.stopOrder - b.stopOrder);
    }
    return route ? this.toDriverManifest(route) : route;
  }

  private toDriverManifest(route: Route) {
    const stops = (route.stops || [])
      .sort((a, b) => a.stopOrder - b.stopOrder)
      .map((stop) => ({
        id: stop.id,
        stopOrder: stop.stopOrder,
        status: stop.status,
        skippedReason: stop.skippedReason,
        collection: stop.collection || null,
        estimatedKg: Number(stop.pickupRequest?.estimatedKg || 0),
        pickupRequest: {
          id: stop.pickupRequest?.id,
          estimatedKg: Number(stop.pickupRequest?.estimatedKg || 0),
          status: stop.pickupRequest?.status,
          address: stop.pickupRequest?.address,
        },
        supplier: {
          fullName: stop.pickupRequest?.user?.fullName || 'Supplier',
          phone: stop.pickupRequest?.user?.phone || '',
        },
      }));

    return {
      id: route.id,
      name: route.name,
      zone: route.zone,
      scheduledDate: route.scheduledDate,
      status: route.status,
      stops,
      estimatedTotalKg: stops.reduce((sum, stop) => sum + stop.estimatedKg, 0),
    };
  }

  private async writeAudit(
    actorId: string,
    action: string,
    entityId: string,
    payload: Record<string, unknown>,
  ) {
    const log = this.auditRepo.create({
      actorId,
      action,
      entityType: 'Route',
      entityId,
      payload,
    });
    await this.auditRepo.save(log);
  }
}
