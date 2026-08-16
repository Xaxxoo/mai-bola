import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { PickupRequest } from '../entities/pickup-request.entity';
import { Address } from '../entities/address.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { RouteStop } from '../entities/route-stop.entity';
import { PickupRequestStatus, UserRole } from '../enums';
import { assertTransition, OPEN_STATUSES } from './pickup-status-machine';
import {
  CreatePickupRequestDto,
  ListPickupRequestsQueryDto,
  CancelPickupRequestDto,
} from './dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../enums';
import { Optional } from '@nestjs/common';

const MAX_OPEN_REQUESTS = 3;

@Injectable()
export class PickupRequestsService {
  constructor(
    @InjectRepository(PickupRequest)
    private readonly pickupRepo: Repository<PickupRequest>,
    @InjectRepository(Address)
    private readonly addressRepo: Repository<Address>,
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
    @InjectRepository(RouteStop)
    private readonly routeStopRepo: Repository<RouteStop>,
    @Optional() private readonly dataSource?: DataSource,
    @Optional() private readonly notifications?: NotificationsService,
  ) {}

  async create(userId: string, dto: CreatePickupRequestDto) {
    // Verify address belongs to user
    const address = await this.addressRepo.findOne({
      where: { id: dto.addressId, userId },
    });
    if (!address) {
      throw new NotFoundException('Address not found');
    }

    // Enforce max open requests
    const openCount = await this.pickupRepo.count({
      where: { userId, status: In(OPEN_STATUSES) },
    });
    if (openCount >= MAX_OPEN_REQUESTS) {
      throw new BadRequestException(
        `Maximum ${MAX_OPEN_REQUESTS} open pickup requests allowed`,
      );
    }

    const pickup = this.pickupRepo.create({
      userId,
      addressId: dto.addressId,
      estimatedKg: dto.estimatedKg,
      note: dto.note,
      photoUrls: dto.photoUrls ?? [],
      status: PickupRequestStatus.PENDING,
    });
    const saved = await this.pickupRepo.save(pickup) as PickupRequest;

    await this.writeAudit(userId, 'CREATED', saved.id, {
      estimatedKg: dto.estimatedKg,
    });

    return saved;
  }

  async listMine(userId: string, query: ListPickupRequestsQueryDto) {
    const where: any = { userId };
    if (query.status) {
      where.status = query.status;
    }

    const [data, total] = await this.pickupRepo.findAndCount({
      where,
      relations: ['address'],
      order: { createdAt: 'DESC' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });

    return { data, total, page: query.page, limit: query.limit };
  }

  async findOne(
    pickupId: string,
    requestingUserId: string,
    requestingUserRole: UserRole,
  ) {
    const pickup = await this.pickupRepo.findOne({
      where: { id: pickupId },
      relations: ['address'],
    });
    if (!pickup) {
      throw new NotFoundException('Pickup request not found');
    }

    // Owner can always see their own
    if (pickup.userId === requestingUserId) {
      return pickup;
    }

    // Admin can see any
    if (requestingUserRole === UserRole.ADMIN) {
      return pickup;
    }

    // Driver can see if they have a route stop for this pickup
    if (requestingUserRole === UserRole.DRIVER) {
      const routeStop = await this.routeStopRepo.findOne({
        where: { pickupRequestId: pickupId },
        relations: ['route'],
      });
      if (routeStop && routeStop.route.driverId === requestingUserId) {
        return pickup;
      }
    }

    throw new ForbiddenException();
  }

  async cancel(
    pickupId: string,
    userId: string,
    dto: CancelPickupRequestDto,
  ) {
    const pickup = await this.pickupRepo.findOne({
      where: { id: pickupId, userId },
    });
    if (!pickup) {
      throw new NotFoundException('Pickup request not found');
    }

    assertTransition(pickup.status, PickupRequestStatus.CANCELLED);

    const fromStatus = pickup.status;
    pickup.status = PickupRequestStatus.CANCELLED;
    pickup.cancelledReason = dto.reason || (null as any);
    await this.pickupRepo.save(pickup);

    await this.writeAudit(userId, 'STATUS_CHANGE', pickup.id, {
      from: fromStatus,
      to: PickupRequestStatus.CANCELLED,
      reason: dto.reason,
    });

    return pickup;
  }

  async transition(
    pickupId: string,
    to: PickupRequestStatus,
    actorId: string,
  ) {
    if (this.dataSource && this.notifications) {
      const result = await this.dataSource.transaction(async (manager) => {
        const repo = manager.getRepository(PickupRequest);
        const auditRepo = manager.getRepository(AuditLog);
        const pickup = await repo.findOne({ where: { id: pickupId } });
        if (!pickup) throw new NotFoundException('Pickup request not found');
        assertTransition(pickup.status, to);
        const from = pickup.status;
        pickup.status = to;
        await repo.save(pickup);
        await auditRepo.save(auditRepo.create({ actorId, action: 'STATUS_CHANGE', entityType: 'PickupRequest', entityId: pickup.id, payload: { from, to } }));
        if (to === PickupRequestStatus.SCHEDULED) {
          await this.notifications!.createInTransaction(manager, {
            userId: pickup.userId,
            type: NotificationType.PICKUP_SCHEDULED,
            title: 'Pickup scheduled',
            body: 'Your pickup is scheduled. We will see you on the route.',
            data: { pickupRequestId: pickup.id },
          });
        }
        return pickup;
      });
      if (to === PickupRequestStatus.SCHEDULED) {
        void this.notifications.sendPush(result.userId, 'Pickup scheduled', 'Your pickup is scheduled.', { pickupRequestId: result.id });
      }
      return result;
    }

    const pickup = await this.pickupRepo.findOne({
      where: { id: pickupId },
    });
    if (!pickup) {
      throw new NotFoundException('Pickup request not found');
    }

    assertTransition(pickup.status, to);

    const from = pickup.status;
    pickup.status = to;
    await this.pickupRepo.save(pickup);

    await this.writeAudit(actorId, 'STATUS_CHANGE', pickup.id, {
      from,
      to,
    });

    return pickup;
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
      entityType: 'PickupRequest',
      entityId,
      payload,
    });
    await this.auditRepo.save(log);
  }
}
