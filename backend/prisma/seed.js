const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Veritabanı seed başlatılıyor...');

  // Abonelik planları
  const plans = await Promise.all([
    prisma.subscriptionPlan.upsert({
      where: { id: 'plan-starter' },
      update: {},
      create: {
        id: 'plan-starter',
        name: 'Starter',
        priceMonthly: 299,
        priceYearly: 2990,
        maxMotors: 10,
        maxUsers: 3,
        maxListings: 5,
        features: {
          motorTracking: true,
          partsInventory: true,
          maintenanceRecords: true,
          marketplace: true,
          qrScanning: false,
          advancedReports: false,
          apiAccess: false,
        },
      },
    }),
    prisma.subscriptionPlan.upsert({
      where: { id: 'plan-pro' },
      update: {},
      create: {
        id: 'plan-pro',
        name: 'Pro',
        priceMonthly: 699,
        priceYearly: 6990,
        maxMotors: 50,
        maxUsers: 10,
        maxListings: 25,
        features: {
          motorTracking: true,
          partsInventory: true,
          maintenanceRecords: true,
          marketplace: true,
          qrScanning: true,
          advancedReports: true,
          apiAccess: false,
        },
      },
    }),
    prisma.subscriptionPlan.upsert({
      where: { id: 'plan-enterprise' },
      update: {},
      create: {
        id: 'plan-enterprise',
        name: 'Enterprise',
        priceMonthly: 1499,
        priceYearly: 14990,
        maxMotors: null,   // Sınırsız
        maxUsers: null,
        maxListings: null,
        features: {
          motorTracking: true,
          partsInventory: true,
          maintenanceRecords: true,
          marketplace: true,
          qrScanning: true,
          advancedReports: true,
          apiAccess: true,
          dedicatedSupport: true,
          customIntegrations: true,
        },
      },
    }),
  ]);

  // Demo şirket ve kullanıcı
  const hashedPassword = await bcrypt.hash('Demo1234!', 12);

  const company = await prisma.company.upsert({
    where: { email: 'demo@motortrack.com' },
    update: {},
    create: {
      name: 'Demo Makina A.Ş.',
      email: 'demo@motortrack.com',
      phone: '+90 212 000 0000',
      address: 'Sanayi Mah. Demo Cad. No:1',
      city: 'İstanbul',
      taxNumber: '1234567890',
    },
  });

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@motortrack.com' },
    update: {},
    create: {
      companyId: company.id,
      email: 'admin@motortrack.com',
      passwordHash: hashedPassword,
      fullName: 'Demo Admin',
      role: 'ADMIN',
    },
  });

  // Demo trial abonelik
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 14);

  await prisma.subscription.upsert({
    where: { companyId: company.id },
    update: {},
    create: {
      companyId: company.id,
      planId: 'plan-starter',
      status: 'TRIAL',
      trialEndsAt,
    },
  });

  // Demo motorlar
  const motor1 = await prisma.motor.create({
    data: {
      companyId: company.id,
      serialNumber: 'MTR-2024-001',
      brand: 'Volvo',
      model: 'D13',
      motorType: 'AUTOMOTIVE',
      manufactureYear: 2020,
      status: 'ACTIVE',
      location: 'A-1 Depo',
      qrCode: 'qr-demo-001',
    },
  });

  const motor2 = await prisma.motor.create({
    data: {
      companyId: company.id,
      serialNumber: 'MTR-2024-002',
      brand: 'Mercedes-Benz',
      model: 'OM471',
      motorType: 'AUTOMOTIVE',
      manufactureYear: 2021,
      status: 'MAINTENANCE',
      location: 'Servis Alanı',
      qrCode: 'qr-demo-002',
    },
  });

  // Demo parçalar
  await prisma.part.createMany({
    data: [
      {
        companyId: company.id,
        motorId: motor1.id,
        partNumber: 'P-00123',
        name: 'Yağ Filtresi',
        brand: 'Mann',
        category: 'Filtre',
        quantity: 15,
        minQuantity: 5,
        purchasePrice: 85.50,
        condition: 'NEW',
      },
      {
        companyId: company.id,
        partNumber: 'P-00124',
        name: 'Hava Filtresi',
        brand: 'Bosch',
        category: 'Filtre',
        quantity: 3,
        minQuantity: 5, // Düşük stok!
        purchasePrice: 120.00,
        condition: 'NEW',
      },
      {
        companyId: company.id,
        motorId: motor2.id,
        name: 'V Kayışı',
        brand: 'Gates',
        category: 'Transmisyon',
        quantity: 8,
        minQuantity: 2,
        purchasePrice: 245.00,
        condition: 'NEW',
      },
    ],
  });

  console.log('✅ Seed tamamlandı!');
  console.log('📧 Demo giriş: admin@motortrack.com / Demo1234!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
