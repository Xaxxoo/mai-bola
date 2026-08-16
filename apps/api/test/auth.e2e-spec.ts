import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  Controller,
  Get,
} from '@nestjs/common';
import request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from '../src/app.controller';
import { AppService } from '../src/app.service';
import { AuthModule } from '../src/auth/auth.module';
import { JwtAuthGuard, RolesGuard } from '../src/common/guards';
import { Public, Roles } from '../src/common/decorators';
import { UserRole } from '../src/enums';
import { User } from '../src/entities/user.entity';
import { Address } from '../src/entities/address.entity';
import { PickupRequest } from '../src/entities/pickup-request.entity';
import { Route } from '../src/entities/route.entity';
import { RouteStop } from '../src/entities/route-stop.entity';
import { Collection } from '../src/entities/collection.entity';
import { WalletTransaction } from '../src/entities/wallet-transaction.entity';
import { Payout } from '../src/entities/payout.entity';
import { InventoryBatch } from '../src/entities/inventory-batch.entity';
import { Sale } from '../src/entities/sale.entity';
import { AuditLog } from '../src/entities/audit-log.entity';
import { RefreshToken } from '../src/entities/refresh-token.entity';

// Test-only controller with admin role requirement
@Controller('test-admin')
export class TestRoleController {
  @Get()
  @Roles(UserRole.ADMIN)
  adminOnly() {
    return { ok: true };
  }
}

const TEST_DB_URL =
  process.env.TEST_DATABASE_URL ||
  'postgresql://maibola:maibola@localhost:5432/maibola_test';

const allEntities = [
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
];

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          url: TEST_DB_URL,
          entities: allEntities,
          synchronize: true,
          dropSchema: true,
          logging: false,
        }),
        ThrottlerModule.forRoot([
          { ttl: 60_000, limit: 1000 },
        ]),
        AuthModule,
      ],
      controllers: [AppController, TestRoleController],
      providers: [
        AppService,
        { provide: APP_GUARD, useClass: ThrottlerGuard },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  const supplier = {
    phone: '08012345678',
    password: 'Str0ngP@ss',
    fullName: 'Test Supplier',
    supplierType: 'HOUSEHOLD',
  };

  let accessToken: string;
  let refreshTokenValue: string;

  // --- Registration ---

  it('POST /auth/register — creates a supplier (201)', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send(supplier)
      .expect(201);

    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    accessToken = res.body.accessToken;
    refreshTokenValue = res.body.refreshToken;
  });

  it('POST /auth/register — duplicate phone returns 409', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send(supplier)
      .expect(409);
  });

  it('POST /auth/register — normalizes phone (0801→+234)', async () => {
    // The user above was stored with normalized phone.
    // Trying to register again with the +234 form should also 409.
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ ...supplier, phone: '+2348012345678' })
      .expect(409);
  });

  it('POST /auth/register — rejects invalid body (400)', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ phone: '08099999999' }) // missing fields
      .expect(400);
  });

  // --- Login ---

  it('POST /auth/login — valid credentials (200)', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ phone: supplier.phone, password: supplier.password })
      .expect(201);

    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    accessToken = res.body.accessToken;
    refreshTokenValue = res.body.refreshToken;
  });

  it('POST /auth/login — wrong password (401)', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ phone: supplier.phone, password: 'wrongpassword' })
      .expect(401);
  });

  it('POST /auth/login — nonexistent phone (401)', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ phone: '08099999999', password: 'anything123' })
      .expect(401);
  });

  // --- GET /auth/me ---

  it('GET /auth/me — with valid token returns profile (200)', async () => {
    const res = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('phone', '+2348012345678');
    expect(res.body).toHaveProperty('fullName', supplier.fullName);
    expect(res.body).toHaveProperty('role', 'SUPPLIER');
    expect(res.body).not.toHaveProperty('passwordHash');
  });

  it('GET /auth/me — without token returns 401', async () => {
    await request(app.getHttpServer()).get('/auth/me').expect(401);
  });

  // --- Refresh ---

  it('POST /auth/refresh — rotates tokens (201)', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: refreshTokenValue })
      .expect(201);

    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body.refreshToken).not.toBe(refreshTokenValue);

    // Save new tokens for subsequent tests
    accessToken = res.body.accessToken;
    const newRefreshToken = res.body.refreshToken;

    // Old refresh token should now be revoked
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: refreshTokenValue })
      .expect(401);

    refreshTokenValue = newRefreshToken;
  });

  it('POST /auth/refresh — invalid token returns 401', async () => {
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: 'totally-invalid-token' })
      .expect(401);
  });

  // --- Role guard ---

  it('GET /test-admin — supplier gets 403', async () => {
    await request(app.getHttpServer())
      .get('/test-admin')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(403);
  });

  // --- Health endpoint ---

  it('GET / — health endpoint accessible without auth', async () => {
    const res = await request(app.getHttpServer()).get('/').expect(200);
    expect(res.body).toHaveProperty('status', 'ok');
  });
});
