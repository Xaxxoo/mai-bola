import 'reflect-metadata';
import { randomUUID } from 'crypto';
import dataSource from './data-source';
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
import { Setting } from './entities/setting.entity';
import {
  UserRole,
  SupplierType,
  PickupRequestStatus,
  RouteStatus,
  RouteStopStatus,
  WalletTransactionType,
  PayoutMethod,
  PayoutStatus,
  InventoryBatchStatus,
} from './enums';

// Kaduna-area coordinates
const kadunaCoordsAndAreas = [
  { lat: 10.5105, lng: 7.4165, area: 'Barnawa', zone: 'Kaduna South' },
  { lat: 10.5222, lng: 7.4322, area: 'Sabon Tasha', zone: 'Kaduna South' },
  { lat: 10.4955, lng: 7.4301, area: 'Narayi', zone: 'Kaduna South' },
  { lat: 10.5407, lng: 7.4378, area: 'Kakuri', zone: 'Kaduna South' },
  { lat: 10.5615, lng: 7.4503, area: 'Makera', zone: 'Kaduna South' },
  { lat: 10.5835, lng: 7.4371, area: 'Tudun Wada', zone: 'Kaduna North' },
  { lat: 10.6012, lng: 7.4275, area: 'Kawo', zone: 'Kaduna North' },
  { lat: 10.5678, lng: 7.4611, area: 'Rigasa', zone: 'Kaduna North' },
  { lat: 10.5321, lng: 7.4481, area: 'Ungwan Rimi', zone: 'Kaduna North' },
  { lat: 10.5143, lng: 7.4085, area: 'Television', zone: 'Kaduna South' },
];

const supplierNames = [
  'Amina Yusuf', 'Ibrahim Musa', 'Fatima Abdullahi', 'Hassan Bello',
  'Zainab Garba', 'Usman Danladi', 'Hauwa Suleiman', 'Abdulrahman Isah',
  'Maryam Lawal', 'Abubakar Shehu',
];

const supplierTypes: SupplierType[] = [
  SupplierType.HOUSEHOLD, SupplierType.HOUSEHOLD, SupplierType.WASTE_PICKER,
  SupplierType.BUSINESS, SupplierType.HOUSEHOLD, SupplierType.WASTE_PICKER,
  SupplierType.HOUSEHOLD, SupplierType.BUSINESS, SupplierType.HOUSEHOLD,
  SupplierType.WASTE_PICKER,
];

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(8 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 60));
  return d;
}

function dateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function randBetween(min: number, max: number): number {
  return +(min + Math.random() * (max - min)).toFixed(2);
}

async function seed() {
  await dataSource.initialize();
  console.log('Connected to database');

  const userRepo = dataSource.getRepository(User);
  const addressRepo = dataSource.getRepository(Address);
  const pickupRepo = dataSource.getRepository(PickupRequest);
  const routeRepo = dataSource.getRepository(Route);
  const routeStopRepo = dataSource.getRepository(RouteStop);
  const collectionRepo = dataSource.getRepository(Collection);
  const walletTxRepo = dataSource.getRepository(WalletTransaction);
  const payoutRepo = dataSource.getRepository(Payout);
  const batchRepo = dataSource.getRepository(InventoryBatch);
  const saleRepo = dataSource.getRepository(Sale);
  const settingRepo = dataSource.getRepository(Setting);

  // Check if already seeded
  const existingCount = await userRepo.count();
  if (existingCount > 0) {
    console.log(`Database already has ${existingCount} users. Skipping seed.`);
    await dataSource.destroy();
    return;
  }

  // ── Users ──────────────────────────────────────────

  const admin = userRepo.create({
    phone: '+2348000000001',
    fullName: 'Yakubu Admin',
    role: UserRole.ADMIN,
    supplierType: null,
  });
  await userRepo.save(admin);

  const driver1 = userRepo.create({
    phone: '+2348000000002',
    fullName: 'Musa Driver',
    role: UserRole.DRIVER,
    supplierType: null,
  });
  const driver2 = userRepo.create({
    phone: '+2348000000003',
    fullName: 'Sani Driver',
    role: UserRole.DRIVER,
    supplierType: null,
  });
  await userRepo.save([driver1, driver2]);
  const drivers = [driver1, driver2];

  const suppliers: User[] = [];
  for (let i = 0; i < 10; i++) {
    const supplier = userRepo.create({
      phone: `+234800000${String(i + 10).padStart(4, '0')}`,
      fullName: supplierNames[i],
      role: UserRole.SUPPLIER,
      supplierType: supplierTypes[i],
    });
    suppliers.push(supplier);
  }
  await userRepo.save(suppliers);
  console.log('Created 1 admin, 2 drivers, 10 suppliers');

  // ── Addresses ──────────────────────────────────────

  const addresses: Address[] = [];
  for (let i = 0; i < 10; i++) {
    const loc = kadunaCoordsAndAreas[i];
    const address = addressRepo.create({
      userId: suppliers[i].id,
      label: 'Home',
      streetText: `${i + 1} ${loc.area} Street`,
      area: loc.area,
      zone: loc.zone,
      lat: loc.lat,
      lng: loc.lng,
      isDefault: true,
    });
    addresses.push(address);
  }
  await addressRepo.save(addresses);
  console.log('Created 10 addresses');

  // ── Settings (economics defaults) ──────────────────

  const existingSetting = await settingRepo.findOne({ where: {} });
  if (!existingSetting) {
    await settingRepo.save(
      settingRepo.create({
        buyPricePerKg: 120,
        sellPricePerKg: 570,
        allInCostPerKg: 450,
      }),
    );
    console.log('Created default economics settings');
  }

  // ── 3 months of routes + collections ───────────────
  // ~12 completed routes (roughly 1/week), each with 3-5 stops

  const allCollections: Collection[] = [];
  const PRICE_PER_KG = 120;

  for (let week = 12; week >= 1; week--) {
    const routeDate = daysAgo(week * 7);
    const zone = week % 2 === 0 ? 'Kaduna South' : 'Kaduna North';
    const driver = drivers[week % 2];

    // Pick 3-5 suppliers for this route
    const zoneSupplierIndices = kadunaCoordsAndAreas
      .map((loc, i) => (loc.zone === zone ? i : -1))
      .filter((i) => i >= 0);
    const pickCount = Math.min(3 + (week % 3), zoneSupplierIndices.length);
    const selectedIndices = zoneSupplierIndices.slice(0, pickCount);

    // Create pickup requests (COLLECTED status)
    const pickups: PickupRequest[] = [];
    for (const si of selectedIndices) {
      const pickup = pickupRepo.create({
        userId: suppliers[si].id,
        addressId: addresses[si].id,
        estimatedKg: randBetween(5, 25),
        note: week % 3 === 0 ? 'Large batch this week' : undefined,
        photoUrls: [],
        status: PickupRequestStatus.COLLECTED,
        createdAt: new Date(routeDate.getTime() - 2 * 24 * 60 * 60 * 1000),
      });
      pickups.push(pickup);
    }
    await pickupRepo.save(pickups);

    // Create route (COMPLETED)
    const route = routeRepo.create({
      name: `${zone} Week-${week}`,
      zone,
      scheduledDate: dateStr(routeDate),
      status: RouteStatus.COMPLETED,
      driverId: driver.id,
    });
    await routeRepo.save(route);

    // Create route stops + collections
    for (let s = 0; s < pickups.length; s++) {
      const stop = routeStopRepo.create({
        routeId: route.id,
        pickupRequestId: pickups[s].id,
        stopOrder: s + 1,
        status: RouteStopStatus.COLLECTED,
      });
      await routeStopRepo.save(stop);

      const actualKg = randBetween(4, 30);
      const amountPaid = +(actualKg * PRICE_PER_KG).toFixed(2);
      const collectedAt = new Date(
        routeDate.getTime() + s * 30 * 60 * 1000,
      ); // 30 min apart

      const collection = collectionRepo.create({
        routeStopId: stop.id,
        actualKg,
        pricePerKg: PRICE_PER_KG,
        amountPaid,
        collectedAt,
        recordedById: driver.id,
      });
      await collectionRepo.save(collection);
      allCollections.push(collection);

      // Wallet credit for supplier
      const supplierId = suppliers[selectedIndices[s]].id;

      // Get current balance
      const lastTx = await walletTxRepo.findOne({
        where: { userId: supplierId },
        order: { createdAt: 'DESC' },
      });
      const currentBalance = lastTx ? Number(lastTx.balanceAfter) : 0;
      const newBalance = +(currentBalance + amountPaid).toFixed(2);

      const walletTx = walletTxRepo.create({
        userId: supplierId,
        type: WalletTransactionType.CREDIT_COLLECTION,
        amount: amountPaid,
        balanceAfter: newBalance,
        reference: collection.id,
        note: `Collection from ${route.name}`,
        createdAt: collectedAt,
      });
      await walletTxRepo.save(walletTx);
    }

    console.log(
      `Route "${route.name}": ${pickups.length} stops, ${pickups.length} collections`,
    );
  }

  // ── Payouts (4 paid, 1 requested) ──────────────────

  const payoutSuppliers = [0, 2, 3, 5, 7]; // indices into suppliers
  for (let p = 0; p < payoutSuppliers.length; p++) {
    const si = payoutSuppliers[p];
    const supplierId = suppliers[si].id;
    const isPaid = p < 4;
    const payoutAmount = randBetween(1000, 5000);

    // Get current balance
    const lastTx = await walletTxRepo.findOne({
      where: { userId: supplierId },
      order: { createdAt: 'DESC' },
    });
    const currentBalance = lastTx ? Number(lastTx.balanceAfter) : 0;

    if (currentBalance < payoutAmount) continue; // skip if insufficient

    const newBalance = +(currentBalance - payoutAmount).toFixed(2);

    // Debit transaction
    const debitTx = walletTxRepo.create({
      userId: supplierId,
      type: WalletTransactionType.DEBIT_PAYOUT,
      amount: -payoutAmount,
      balanceAfter: newBalance,
      note: 'Payout request',
      createdAt: daysAgo(isPaid ? 14 + p * 7 : 3),
    });
    await walletTxRepo.save(debitTx);

    const payout = payoutRepo.create({
      userId: supplierId,
      amount: payoutAmount,
      method: p % 2 === 0 ? PayoutMethod.BANK_TRANSFER : PayoutMethod.MOBILE_MONEY,
      destinationDetails: p % 2 === 0
        ? { bank: 'First Bank', accountNumber: '123456789' + p }
        : { provider: 'OPay', phone: suppliers[si].phone },
      status: isPaid ? PayoutStatus.PAID : PayoutStatus.REQUESTED,
      processedById: isPaid ? admin.id : undefined,
      processedAt: isPaid ? daysAgo(12 + p * 7) : undefined,
      paidReference: isPaid ? `PAY-${randomUUID().slice(0, 8).toUpperCase()}` : undefined,
    });
    await payoutRepo.save(payout);
  }
  console.log('Created payouts');

  // ── Pending pickup requests (current) ──────────────

  const pendingPickups: PickupRequest[] = [];
  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 2; j++) {
      const pickup = pickupRepo.create({
        userId: suppliers[i].id,
        addressId: addresses[i].id,
        estimatedKg: randBetween(2, 20),
        note: j === 0 ? 'Bottles from last week' : undefined,
        photoUrls: [],
        status: PickupRequestStatus.PENDING,
      });
      pendingPickups.push(pickup);
    }
  }
  await pickupRepo.save(pendingPickups);
  console.log(`Created ${pendingPickups.length} pending pickup requests`);

  // ── Inventory batches ──────────────────────────────
  // Group collections into batches of ~8-12 collections each

  const batchSize = 10;
  const batches: InventoryBatch[] = [];

  for (let i = 0; i < allCollections.length; i += batchSize) {
    const batchCollections = allCollections.slice(i, i + batchSize);
    const grossKg = batchCollections.reduce(
      (sum, c) => sum + Number(c.actualKg),
      0,
    );

    // Determine batch status based on position
    const batchIndex = Math.floor(i / batchSize);
    let status: InventoryBatchStatus;
    let processedKg: number;

    if (batchIndex < 2) {
      // First 2 batches: ALLOCATED (sold)
      status = InventoryBatchStatus.ALLOCATED;
      processedKg = +(grossKg * 0.82).toFixed(2);
    } else if (batchIndex < 4) {
      // Next 2: COMPRESSED (ready to sell)
      status = InventoryBatchStatus.COMPRESSED;
      processedKg = +(grossKg * 0.83).toFixed(2);
    } else if (batchIndex < 5) {
      // 1 WASHED
      status = InventoryBatchStatus.WASHED;
      processedKg = +(grossKg * 0.88).toFixed(2);
    } else if (batchIndex < 6) {
      // 1 SORTED
      status = InventoryBatchStatus.SORTED;
      processedKg = +(grossKg * 0.92).toFixed(2);
    } else {
      // Rest: RAW
      status = InventoryBatchStatus.RAW;
      processedKg = 0;
    }

    const batch = batchRepo.create({
      grossKg,
      processedKg,
      status,
    });
    await batchRepo.save(batch);

    // Link collections to batch via the join table
    await dataSource
      .createQueryBuilder()
      .insert()
      .into('inventory_batch_collections')
      .values(
        batchCollections.map((c) => ({
          inventoryBatchId: batch.id,
          collectionId: c.id,
        })),
      )
      .execute();

    batches.push(batch);
  }
  console.log(`Created ${batches.length} inventory batches`);

  // ── Sales (2 sales from ALLOCATED batches) ─────────

  const allocatedBatches = batches.filter(
    (b) => b.status === InventoryBatchStatus.ALLOCATED,
  );

  for (let s = 0; s < Math.min(2, allocatedBatches.length); s++) {
    const batch = allocatedBatches[s];
    const totalKg = Number(batch.processedKg);
    const pricePerKg = 570;
    const allInCostPerKg = 450;
    const revenue = +(totalKg * pricePerKg).toFixed(2);
    const contribution = +(totalKg * (pricePerKg - allInCostPerKg)).toFixed(2);

    const sale = saleRepo.create({
      buyerName: s === 0 ? 'Lagos Off-taker A' : 'Abuja Recycler B',
      totalKg,
      pricePerKg,
      revenue,
      allInCostPerKg,
      contribution,
      soldAt: daysAgo(s === 0 ? 21 : 7),
    });
    await saleRepo.save(sale);

    // Link batch to sale via join table
    await dataSource
      .createQueryBuilder()
      .insert()
      .into('sale_batches')
      .values([{ saleId: sale.id, inventoryBatchId: batch.id }])
      .execute();

    console.log(
      `Sale ${s + 1}: ${totalKg} kg @ ₦${pricePerKg}/kg = ₦${revenue} (contribution: ₦${contribution})`,
    );
  }

  console.log('\nSeed completed successfully');
  await dataSource.destroy();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
