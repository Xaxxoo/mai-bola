import 'reflect-metadata';
import dataSource from './data-source';
import { User } from './entities/user.entity';
import { Address } from './entities/address.entity';
import { PickupRequest } from './entities/pickup-request.entity';
import { UserRole, SupplierType, PickupRequestStatus } from './enums';

// Kaduna-area coordinates (lat/lng pairs for real neighborhoods)
const kadunaCoordsAndAreas: {
  lat: number;
  lng: number;
  area: string;
  zone: string;
}[] = [
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
  'Amina Yusuf',
  'Ibrahim Musa',
  'Fatima Abdullahi',
  'Hassan Bello',
  'Zainab Garba',
  'Usman Danladi',
  'Hauwa Suleiman',
  'Abdulrahman Isah',
  'Maryam Lawal',
  'Abubakar Shehu',
];

const supplierTypes: SupplierType[] = [
  SupplierType.HOUSEHOLD,
  SupplierType.HOUSEHOLD,
  SupplierType.WASTE_PICKER,
  SupplierType.BUSINESS,
  SupplierType.HOUSEHOLD,
  SupplierType.WASTE_PICKER,
  SupplierType.HOUSEHOLD,
  SupplierType.BUSINESS,
  SupplierType.HOUSEHOLD,
  SupplierType.WASTE_PICKER,
];

async function seed() {
  await dataSource.initialize();
  console.log('Connected to database');

  const userRepo = dataSource.getRepository(User);
  const addressRepo = dataSource.getRepository(Address);
  const pickupRepo = dataSource.getRepository(PickupRequest);

  // Check if already seeded
  const existingCount = await userRepo.count();
  if (existingCount > 0) {
    console.log(`Database already has ${existingCount} users. Skipping seed.`);
    await dataSource.destroy();
    return;
  }

  // 1 Admin
  const admin = userRepo.create({
    phone: '+2348000000001',
    fullName: 'Yakubu Admin',
    role: UserRole.ADMIN,
    supplierType: null,
  });
  await userRepo.save(admin);
  console.log(`Created admin: ${admin.fullName}`);

  // 2 Drivers
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
  console.log(`Created 2 drivers`);

  // 10 Suppliers with addresses
  const suppliers: User[] = [];
  const addresses: Address[] = [];

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
  console.log(`Created 10 suppliers`);

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
  console.log(`Created 10 addresses`);

  // ~20 pending pickup requests (2 per supplier)
  const pickups: PickupRequest[] = [];
  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 2; j++) {
      const estimatedKg = parseFloat((Math.random() * 18 + 2).toFixed(2)); // 2–20 kg
      const pickup = pickupRepo.create({
        userId: suppliers[i].id,
        addressId: addresses[i].id,
        estimatedKg,
        note: j === 0 ? 'Bottles from last week' : undefined,
        photoUrls: [],
        status: PickupRequestStatus.PENDING,
      });
      pickups.push(pickup);
    }
  }
  await pickupRepo.save(pickups);
  console.log(`Created ${pickups.length} pending pickup requests`);

  console.log('Seed completed successfully');
  await dataSource.destroy();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
