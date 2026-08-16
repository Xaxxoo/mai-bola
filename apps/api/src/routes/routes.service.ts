import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Route } from '../entities/route.entity';
import { RouteStop } from '../entities/route-stop.entity';
import { PickupRequest } from '../entities/pickup-request.entity';
import { User } from '../entities/user.entity';
import { AuditLog } from '../entities/audit-log.entity';
import {
  PickupRequestStatus,
  RouteStatus,
  UserRole,
} from '../enums';
import { PickupRequestsService } from '../pickup-requests/pickup-requests.service';
import { nearestNeighbourOrder } from './nearest-neighbour';
import {
  CreateRouteDto,
  UpdateRouteDto,
  ListRoutesQueryDto,
  ListAdminPickupsQueryDto,
  ClusterSuggestQueryDto,
} from './dto';

const MIN_CLUSTER_KG = 200;

@Injectable()
export class RoutesService {
  constructor(
    @InjectRepository(Route)
    private readonly routeRepo: Repository<Route>,
    @InjectRepository(RouteStop)
    private readonly routeStopRepo: Repository<RouteStop>,
    @InjectRepository(PickupRequest)
    private readonly pickupRepo: Repository<PickupRequest>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
    private readonly pickupService: PickupRequestsService,
  ) {}

  // --- Admin pickup worklist ---

  async listAdminPickups(query: ListAdminPickupsQueryDto) {
    const qb = this.pickupRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.address', 'a')
      .leftJoinAndSelect('p.user', 'u');

    if (query.status) {
      qb.andWhere('p.status = :status', { status: query.status });
    } else {
      qb.andWhere('p.status = :status', {
        status: PickupRequestStatus.PENDING,
      });
    }

    if (query.zone) {
      qb.andWhere('a.zone = :zone', { zone: query.zone });
    }

    qb.select([
      'p.id',
      'p.userId',
      'p.estimatedKg',
      'p.status',
      'p.createdAt',
      'a.id',
      'a.lat',
      'a.lng',
      'a.zone',
      'a.streetText',
      'a.label',
      'u.id',
      'u.fullName',
      'u.phone',
    ]);

    qb.orderBy('p.createdAt', 'ASC');

    const total = await qb.getCount();
    const data = await qb
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getMany();

    return { data, total, page: query.page, limit: query.limit };
  }

  // --- Create route ---

  async createRoute(dto: CreateRouteDto, actorId: string) {
    // Verify driver exists and is a DRIVER
    const driver = await this.userRepo.findOne({
      where: { id: dto.driverId },
    });
    if (!driver || driver.role !== UserRole.DRIVER) {
      throw new BadRequestException('Invalid driver');
    }

    // Verify all pickup requests exist and are PENDING
    const pickups = await this.pickupRepo.find({
      where: { id: In(dto.pickupRequestIds) },
    });
    if (pickups.length !== dto.pickupRequestIds.length) {
      throw new BadRequestException('One or more pickup requests not found');
    }
    for (const p of pickups) {
      if (p.status !== PickupRequestStatus.PENDING) {
        throw new BadRequestException(
          `Pickup ${p.id} is not in PENDING status`,
        );
      }
    }

    // Create route
    const route = this.routeRepo.create({
      name: dto.name,
      zone: dto.zone,
      scheduledDate: dto.scheduledDate,
      driverId: dto.driverId,
      status: RouteStatus.DRAFT,
    });
    const savedRoute = await this.routeRepo.save(route) as Route;

    // Create route stops in the given order
    const stops: RouteStop[] = [];
    for (let i = 0; i < dto.pickupRequestIds.length; i++) {
      const stop = this.routeStopRepo.create({
        routeId: savedRoute.id,
        pickupRequestId: dto.pickupRequestIds[i],
        stopOrder: i + 1,
      });
      stops.push(await this.routeStopRepo.save(stop) as RouteStop);
    }

    // Transition all pickups to CLUSTERED
    for (const p of pickups) {
      await this.pickupService.transition(
        p.id,
        PickupRequestStatus.CLUSTERED,
        actorId,
      );
    }

    await this.writeAudit(actorId, 'ROUTE_CREATED', savedRoute.id, {
      pickupRequestIds: dto.pickupRequestIds,
      driverId: dto.driverId,
    });

    return { ...savedRoute, stops };
  }

  // --- Auto-order stops ---

  async autoOrder(routeId: string, actorId: string) {
    const route = await this.getRouteOrFail(routeId);
    if (route.status !== RouteStatus.DRAFT) {
      throw new BadRequestException('Can only auto-order DRAFT routes');
    }

    const stops = await this.routeStopRepo.find({
      where: { routeId },
      relations: ['pickupRequest', 'pickupRequest.address'],
      order: { stopOrder: 'ASC' },
    });

    if (stops.length <= 1) return stops;

    const points = stops.map((s) => ({
      lat: Number(s.pickupRequest.address.lat),
      lng: Number(s.pickupRequest.address.lng),
    }));

    const order = nearestNeighbourOrder(points);

    for (let i = 0; i < order.length; i++) {
      stops[order[i]].stopOrder = i + 1;
    }

    await this.routeStopRepo.save(stops);

    await this.writeAudit(actorId, 'ROUTE_AUTO_ORDERED', routeId, {
      order: order.map((idx) => stops[idx].id),
    });

    // Return in new order
    return stops.sort((a, b) => a.stopOrder - b.stopOrder);
  }

  // --- List routes ---

  async listRoutes(query: ListRoutesQueryDto) {
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.date) where.scheduledDate = query.date;
    if (query.driverId) where.driverId = query.driverId;

    const [data, total] = await this.routeRepo.findAndCount({
      where,
      relations: ['driver'],
      order: { scheduledDate: 'DESC', createdAt: 'DESC' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });

    // Strip passwordHash from driver
    const cleaned = data.map((r) => {
      if (r.driver) {
        const { passwordHash: _, ...driver } = r.driver;
        return { ...r, driver };
      }
      return r;
    });

    return { data: cleaned, total, page: query.page, limit: query.limit };
  }

  // --- Get route with full manifest ---

  async getRoute(routeId: string) {
    const route = await this.routeRepo.findOne({
      where: { id: routeId },
      relations: [
        'driver',
        'stops',
        'stops.pickupRequest',
        'stops.pickupRequest.user',
        'stops.pickupRequest.address',
      ],
    });
    if (!route) throw new NotFoundException('Route not found');

    // Build manifest
    const { passwordHash: _, ...driver } = route.driver;
    const stops = (route.stops || [])
      .sort((a, b) => a.stopOrder - b.stopOrder)
      .map((s) => {
        const { passwordHash: __, ...supplier } = s.pickupRequest.user;
        return {
          id: s.id,
          stopOrder: s.stopOrder,
          status: s.status,
          pickupRequest: {
            id: s.pickupRequest.id,
            estimatedKg: s.pickupRequest.estimatedKg,
            note: s.pickupRequest.note,
            status: s.pickupRequest.status,
            address: s.pickupRequest.address,
          },
          supplier: {
            id: supplier.id,
            fullName: supplier.fullName,
            phone: supplier.phone,
          },
        };
      });

    const estimatedTotalKg = stops.reduce(
      (sum, s) => sum + Number(s.pickupRequest.estimatedKg),
      0,
    );

    return {
      id: route.id,
      name: route.name,
      zone: route.zone,
      scheduledDate: route.scheduledDate,
      status: route.status,
      driver,
      stops,
      estimatedTotalKg,
      createdAt: route.createdAt,
      updatedAt: route.updatedAt,
    };
  }

  // --- Update route (add/remove/reorder stops while DRAFT) ---

  async updateRoute(routeId: string, dto: UpdateRouteDto, actorId: string) {
    const route = await this.getRouteOrFail(routeId);
    if (route.status !== RouteStatus.DRAFT) {
      throw new BadRequestException('Can only edit DRAFT routes');
    }

    if (!dto.pickupRequestIds) return this.getRoute(routeId);

    // Find current stops
    const currentStops = await this.routeStopRepo.find({
      where: { routeId },
    });
    const currentPickupIds = new Set(currentStops.map((s) => s.pickupRequestId));
    const newPickupIds = new Set(dto.pickupRequestIds);

    // Verify all new pickup requests exist and are PENDING or CLUSTERED
    const pickups = await this.pickupRepo.find({
      where: { id: In(dto.pickupRequestIds) },
    });
    if (pickups.length !== dto.pickupRequestIds.length) {
      throw new BadRequestException('One or more pickup requests not found');
    }
    for (const p of pickups) {
      if (
        p.status !== PickupRequestStatus.PENDING &&
        p.status !== PickupRequestStatus.CLUSTERED
      ) {
        throw new BadRequestException(
          `Pickup ${p.id} is not in PENDING or CLUSTERED status`,
        );
      }
    }

    // Remove stops no longer in the list — revert their pickups to PENDING
    const removedStops = currentStops.filter(
      (s) => !newPickupIds.has(s.pickupRequestId),
    );
    if (removedStops.length > 0) {
      await this.routeStopRepo.remove(removedStops);
      for (const s of removedStops) {
        const pickup = await this.pickupRepo.findOne({
          where: { id: s.pickupRequestId },
        });
        if (pickup && pickup.status === PickupRequestStatus.CLUSTERED) {
          pickup.status = PickupRequestStatus.PENDING;
          await this.pickupRepo.save(pickup);
          await this.writeAudit(actorId, 'STATUS_CHANGE', pickup.id, {
            from: PickupRequestStatus.CLUSTERED,
            to: PickupRequestStatus.PENDING,
            reason: 'Removed from route',
          });
        }
      }
    }

    // Add new stops and transition new pickups to CLUSTERED
    const addedIds = dto.pickupRequestIds.filter(
      (id) => !currentPickupIds.has(id),
    );
    for (const id of addedIds) {
      await this.pickupService.transition(
        id,
        PickupRequestStatus.CLUSTERED,
        actorId,
      );
    }

    // Remove remaining old stops so we can recreate in new order
    const keptStops = currentStops.filter(
      (s) => newPickupIds.has(s.pickupRequestId) && !removedStops.includes(s),
    );
    if (keptStops.length > 0) {
      await this.routeStopRepo.remove(keptStops);
    }

    // Recreate all stops in the new order
    for (let i = 0; i < dto.pickupRequestIds.length; i++) {
      const stop = this.routeStopRepo.create({
        routeId,
        pickupRequestId: dto.pickupRequestIds[i],
        stopOrder: i + 1,
      });
      await this.routeStopRepo.save(stop);
    }

    await this.writeAudit(actorId, 'ROUTE_UPDATED', routeId, {
      pickupRequestIds: dto.pickupRequestIds,
    });

    return this.getRoute(routeId);
  }

  // --- Dispatch ---

  async dispatch(routeId: string, actorId: string) {
    const route = await this.getRouteOrFail(routeId);
    if (route.status !== RouteStatus.DRAFT) {
      throw new BadRequestException('Can only dispatch DRAFT routes');
    }

    const stops = await this.routeStopRepo.find({
      where: { routeId },
    });
    if (stops.length === 0) {
      throw new BadRequestException('Route has no stops');
    }

    // Transition route to DISPATCHED
    route.status = RouteStatus.DISPATCHED;
    await this.routeRepo.save(route);

    // Transition all stops' pickup requests to SCHEDULED
    for (const stop of stops) {
      await this.pickupService.transition(
        stop.pickupRequestId,
        PickupRequestStatus.SCHEDULED,
        actorId,
      );
    }

    await this.writeAudit(actorId, 'ROUTE_DISPATCHED', routeId, {
      stopCount: stops.length,
    });

    return this.getRoute(routeId);
  }

  // --- Cluster suggestion ---

  async suggestClusters(query: ClusterSuggestQueryDto) {
    const qb = this.pickupRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.address', 'a')
      .where('p.status = :status', { status: PickupRequestStatus.PENDING })
      .andWhere('a.zone = :zone', { zone: query.zone })
      .orderBy('p.createdAt', 'ASC');

    const pickups = await qb.getMany();

    // Greedily group until we hit the threshold
    const groups: { pickupRequestIds: string[]; totalKg: number }[] = [];
    let current: { pickupRequestIds: string[]; totalKg: number } = {
      pickupRequestIds: [],
      totalKg: 0,
    };

    for (const p of pickups) {
      current.pickupRequestIds.push(p.id);
      current.totalKg += Number(p.estimatedKg);

      if (current.totalKg >= MIN_CLUSTER_KG) {
        groups.push({ ...current });
        current = { pickupRequestIds: [], totalKg: 0 };
      }
    }

    // Include partial group only if it meets the threshold
    // (leftover below threshold is not a worthwhile trip)

    return {
      zone: query.zone,
      minKg: MIN_CLUSTER_KG,
      suggestions: groups,
      remainingCount: current.pickupRequestIds.length,
      remainingKg: current.totalKg,
    };
  }

  // --- Helpers ---

  private async getRouteOrFail(routeId: string): Promise<Route> {
    const route = await this.routeRepo.findOne({ where: { id: routeId } });
    if (!route) throw new NotFoundException('Route not found');
    return route;
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
