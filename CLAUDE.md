# Mai Bola

PET bottle recovery platform for Kaduna, Nigeria.

## Stack

- **Monorepo**: pnpm workspaces + Turborepo
- **API**: NestJS 10, TypeORM, PostgreSQL 16
- **Web (supplier/driver PWA)**: Next.js 14 (App Router), React 18, Tailwind CSS 3
- **Admin dashboard**: Next.js 14 (App Router), React 18, Tailwind CSS 3
- **Shared package**: TypeScript types, enums, constants

## Folder structure

```
apps/web/       → Supplier & driver PWA (port 3000)
apps/admin/     → Admin dashboard (port 3001)
apps/api/       → NestJS REST API (port 4000)
packages/shared → Shared TS types, enums, constants
```

## Naming conventions

- Files: `kebab-case` for files, `PascalCase` for React components
- NestJS: follow NestJS conventions (`*.module.ts`, `*.controller.ts`, `*.service.ts`)
- Database: `snake_case` for tables and columns
- Shared types: exported from `@mai-bola/shared`

## Running locally

```bash
# Install dependencies
pnpm install

# Start PostgreSQL + pgAdmin
docker compose up -d

# Start all apps in dev mode
pnpm dev
```

- Web: http://localhost:3000
- Admin: http://localhost:3001
- API: http://localhost:4000
- pgAdmin: http://localhost:5050

## Database

### Entities

User, Address, PickupRequest, Route, RouteStop, Collection,
WalletTransaction, Payout, InventoryBatch, Sale, AuditLog.

All entities use UUID primary keys and `createdAt`/`updatedAt` timestamps.
Money columns use `decimal(12,2)`, weight columns use `decimal(10,2)`.
Currency is NGN — store numbers only.

### Migration rules

- Always use TypeORM migrations — never `synchronize: true` in production
- Generate: `pnpm --filter @mai-bola/api migration:generate src/migrations/MigrationName`
- Run: `pnpm --filter @mai-bola/api migration:run`
- Revert: `pnpm --filter @mai-bola/api migration:revert`
- Seed: `pnpm --filter @mai-bola/api seed`
- Never edit a migration after it has been applied to any shared environment
- The TypeORM CLI runs via `tsx` (not `ts-node`) for Node v24 compatibility

## Pagination convention

All paginated list endpoints use the same query/response shape:

**Query parameters:** `?page=1&limit=20`
- `page` — 1-based page number (default `1`)
- `limit` — items per page (default `20`, max `100`)

**Response body:**
```json
{ "data": [...], "total": 42, "page": 1, "limit": 20 }
```

Extend `PaginationQueryDto` from `src/common/dto` for new list endpoints.
Constants `DEFAULT_PAGE_SIZE` and `MAX_PAGE_SIZE` live in `@mai-bola/shared`.

## Kaduna zones

Valid zones are defined in `KADUNA_ZONES` from `@mai-bola/shared`.
Address entities must use a value from this list.

## Environment variables

Copy `.env.example` files at root and in each app, then fill in values:

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
cp apps/admin/.env.example apps/admin/.env
```
