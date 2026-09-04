const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Veritabanı seed başlatılıyor...');
  console.log('🗑️  Mevcut veriler temizleniyor...');

  // Mevcut verileri temizle (sıralı, foreign key'e dikkat)
  await prisma.listingMessage.deleteMany();
  await prisma.listing.deleteMany();
  await prisma.partMovement.deleteMany();
  await prisma.maintenanceRecord.deleteMany();
  await prisma.part.deleteMany();
  await prisma.motor.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.user.deleteMany();
  await prisma.company.deleteMany();
  await prisma.subscriptionPlan.deleteMany();

  // ─── Abonelik Planları ──────────────────────────────────────────────────
  console.log('📋 Abonelik planları oluşturuluyor...');
  await Promise.all([
    prisma.subscriptionPlan.create({
      data: {
        id: 'plan-starter',
        name: 'Starter',
        priceMonthly: 299,
        priceYearly: 2990,
        maxMotors: 10,
        maxUsers: 3,
        maxListings: 5,
        features: {
          motorTracking: true, partsInventory: true, maintenanceRecords: true,
          marketplace: true, qrScanning: false, advancedReports: false, apiAccess: false,
        },
      },
    }),
    prisma.subscriptionPlan.create({
      data: {
        id: 'plan-pro',
        name: 'Pro',
        priceMonthly: 699,
        priceYearly: 6990,
        maxMotors: 50,
        maxUsers: 10,
        maxListings: 25,
        features: {
          motorTracking: true, partsInventory: true, maintenanceRecords: true,
          marketplace: true, qrScanning: true, advancedReports: true, apiAccess: false,
        },
      },
    }),
    prisma.subscriptionPlan.create({
      data: {
        id: 'plan-enterprise',
        name: 'Enterprise',
        priceMonthly: 1499,
        priceYearly: 14990,
        maxMotors: null, maxUsers: null, maxListings: null,
        features: {
          motorTracking: true, partsInventory: true, maintenanceRecords: true,
          marketplace: true, qrScanning: true, advancedReports: true, apiAccess: true,
          dedicatedSupport: true, customIntegrations: true,
        },
      },
    }),
  ]);

  const hashedPassword = await bcrypt.hash('Demo1234!', 12);
  const now = new Date();

  // ═══════════════════════════════════════════════════════════════════════
  // ŞİRKET 1 — Demo Makina A.Ş. (Ana demo hesap)
  // ═══════════════════════════════════════════════════════════════════════
  console.log('🏢 Şirket 1: Demo Makina A.Ş. oluşturuluyor...');
  const company1 = await prisma.company.create({
    data: {
      name: 'Demo Makina A.Ş.',
      email: 'demo@motortrack.com',
      phone: '+90 212 555 1234',
      address: 'Sanayi Mah. Atatürk Cad. No:42',
      city: 'İstanbul',
      taxNumber: '1234567890',
    },
  });

  const adminUser = await prisma.user.create({
    data: {
      companyId: company1.id, email: 'admin@motortrack.com',
      passwordHash: hashedPassword, fullName: 'Fatih Alparslan', role: 'ADMIN',
    },
  });
  const techUser = await prisma.user.create({
    data: {
      companyId: company1.id, email: 'teknisyen@motortrack.com',
      passwordHash: hashedPassword, fullName: 'Ahmet Yılmaz', role: 'TECHNICIAN',
    },
  });
  const managerUser = await prisma.user.create({
    data: {
      companyId: company1.id, email: 'mudur@motortrack.com',
      passwordHash: hashedPassword, fullName: 'Mehmet Kaya', role: 'MANAGER',
    },
  });

  const trialEndsAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  await prisma.subscription.create({
    data: { companyId: company1.id, planId: 'plan-pro', status: 'TRIAL', trialEndsAt },
  });

  // ─── Motorlar (Şirket 1) ───────────────────────────────────────────────
  console.log('⚙️  Motorlar oluşturuluyor...');
  const motors = await Promise.all([
    prisma.motor.create({
      data: {
        companyId: company1.id, serialNumber: 'MTR-2024-001',
        brand: 'Volvo', model: 'D13 TC', motorType: 'AUTOMOTIVE',
        manufactureYear: 2020, status: 'ACTIVE', location: 'A-1 Ana Depo',
        notes: 'Kamyon motoru, düzenli bakım yapılıyor.', qrCode: uuidv4(),
      },
    }),
    prisma.motor.create({
      data: {
        companyId: company1.id, serialNumber: 'MTR-2024-002',
        brand: 'Mercedes-Benz', model: 'OM471', motorType: 'AUTOMOTIVE',
        manufactureYear: 2021, status: 'MAINTENANCE', location: 'Servis Alanı B-3',
        notes: 'Yağ kaçağı tamiri için serviste.', qrCode: uuidv4(),
      },
    }),
    prisma.motor.create({
      data: {
        companyId: company1.id, serialNumber: 'MTR-2024-003',
        brand: 'Caterpillar', model: 'C15 ACERT', motorType: 'INDUSTRIAL',
        manufactureYear: 2019, status: 'ACTIVE', location: 'Şantiye Merkez',
        notes: 'Jeneratör motoru, 7/24 çalışıyor.', qrCode: uuidv4(),
      },
    }),
    prisma.motor.create({
      data: {
        companyId: company1.id, serialNumber: 'MTR-2024-004',
        brand: 'Cummins', model: 'QSB6.7', motorType: 'INDUSTRIAL',
        manufactureYear: 2022, status: 'ACTIVE', location: 'C-2 Depo',
        notes: 'Yeni alınan endüstriyel motor.', qrCode: uuidv4(),
      },
    }),
    prisma.motor.create({
      data: {
        companyId: company1.id, serialNumber: 'MTR-2024-005',
        brand: 'Yamaha', model: 'MT-07', motorType: 'MOTORCYCLE',
        manufactureYear: 2023, status: 'ACTIVE', location: 'Garaj',
        notes: 'Firma motosikleti.', qrCode: uuidv4(),
      },
    }),
    prisma.motor.create({
      data: {
        companyId: company1.id, serialNumber: 'MTR-2024-006',
        brand: 'John Deere', model: 'PowerTech 6068', motorType: 'AGRICULTURAL',
        manufactureYear: 2018, status: 'MAINTENANCE', location: 'Servis Alanı A-1',
        notes: 'Sezonluk bakım için getirildi.', qrCode: uuidv4(),
      },
    }),
    prisma.motor.create({
      data: {
        companyId: company1.id, serialNumber: 'MTR-2024-007',
        brand: 'Yanmar', model: '4JH5E', motorType: 'MARINE',
        manufactureYear: 2021, status: 'ACTIVE', location: 'Liman Deposu',
        notes: 'Tekne motoru, iyi durumda.', qrCode: uuidv4(),
      },
    }),
    prisma.motor.create({
      data: {
        companyId: company1.id, serialNumber: 'MTR-2024-008',
        brand: 'MAN', model: 'D2676', motorType: 'AUTOMOTIVE',
        manufactureYear: 2017, status: 'RETIRED', location: 'Eski Depo',
        notes: 'Kullanım ömrü doldu, yedek parça olarak ayrıldı.', qrCode: uuidv4(),
      },
    }),
  ]);

  // ─── Parçalar (Şirket 1) ──────────────────────────────────────────────
  console.log('🔧 Parçalar oluşturuluyor...');
  const parts = await Promise.all([
    prisma.part.create({
      data: {
        companyId: company1.id, motorId: motors[0].id, partNumber: 'FLT-001',
        name: 'Yağ Filtresi', brand: 'Mann', category: 'Filtre',
        quantity: 15, minQuantity: 5, purchasePrice: 85.50, sellingPrice: 120.00,
        warehouseLocation: 'Raf A-1-3', condition: 'NEW',
      },
    }),
    prisma.part.create({
      data: {
        companyId: company1.id, partNumber: 'FLT-002',
        name: 'Hava Filtresi', brand: 'Bosch', category: 'Filtre',
        quantity: 2, minQuantity: 5, purchasePrice: 120.00, sellingPrice: 180.00,
        warehouseLocation: 'Raf A-1-4', condition: 'NEW',
        notes: '⚠️ Düşük stok! Sipariş verilmeli.',
      },
    }),
    prisma.part.create({
      data: {
        companyId: company1.id, motorId: motors[1].id, partNumber: 'BLT-003',
        name: 'V Kayışı', brand: 'Gates', category: 'Transmisyon',
        quantity: 8, minQuantity: 2, purchasePrice: 245.00, sellingPrice: 350.00,
        warehouseLocation: 'Raf B-2-1', condition: 'NEW',
      },
    }),
    prisma.part.create({
      data: {
        companyId: company1.id, motorId: motors[0].id, partNumber: 'SPK-004',
        name: 'Buji Seti (4lü)', brand: 'NGK', category: 'Ateşleme',
        quantity: 12, minQuantity: 4, purchasePrice: 180.00, sellingPrice: 260.00,
        warehouseLocation: 'Raf A-2-1', condition: 'NEW',
      },
    }),
    prisma.part.create({
      data: {
        companyId: company1.id, partNumber: 'BRK-005',
        name: 'Fren Balatası (Ön)', brand: 'Brembo', category: 'Fren',
        quantity: 1, minQuantity: 3, purchasePrice: 320.00, sellingPrice: 480.00,
        warehouseLocation: 'Raf C-1-2', condition: 'NEW',
        notes: '⚠️ Kritik düşük stok!',
      },
    }),
    prisma.part.create({
      data: {
        companyId: company1.id, motorId: motors[2].id, partNumber: 'GSK-006',
        name: 'Conta Takımı', brand: 'Victor Reinz', category: 'Conta',
        quantity: 6, minQuantity: 2, purchasePrice: 450.00, sellingPrice: 650.00,
        warehouseLocation: 'Raf B-3-2', condition: 'NEW',
      },
    }),
    prisma.part.create({
      data: {
        companyId: company1.id, motorId: motors[3].id, partNumber: 'RAD-007',
        name: 'Radyatör', brand: 'Valeo', category: 'Soğutma',
        quantity: 3, minQuantity: 1, purchasePrice: 1250.00, sellingPrice: 1800.00,
        warehouseLocation: 'Raf D-1-1', condition: 'NEW',
      },
    }),
    prisma.part.create({
      data: {
        companyId: company1.id, partNumber: 'OIL-008',
        name: 'Motor Yağı 10W-40 (5L)', brand: 'Castrol', category: 'Yağ',
        quantity: 20, minQuantity: 5, purchasePrice: 380.00, sellingPrice: 520.00,
        warehouseLocation: 'Raf E-1-1', condition: 'NEW',
      },
    }),
    prisma.part.create({
      data: {
        companyId: company1.id, partNumber: 'CLT-009',
        name: 'Antifriz (3L)', brand: 'Total', category: 'Soğutma',
        quantity: 0, minQuantity: 3, purchasePrice: 95.00, sellingPrice: 140.00,
        warehouseLocation: 'Raf E-1-3', condition: 'NEW',
        notes: '⚠️ Stok bitti! Acil sipariş verilmeli.',
      },
    }),
    prisma.part.create({
      data: {
        companyId: company1.id, motorId: motors[7].id, partNumber: 'TRB-010',
        name: 'Turbo Şarj', brand: 'Garrett', category: 'Motor',
        quantity: 1, minQuantity: 0, purchasePrice: 8500.00, sellingPrice: 12000.00,
        warehouseLocation: 'Raf F-1-1', condition: 'USED',
        notes: 'Emekli MAN motordan söküldü, satılabilir.',
      },
    }),
    prisma.part.create({
      data: {
        companyId: company1.id, motorId: motors[4].id, partNumber: 'CHN-011',
        name: 'Zincir Seti', brand: 'DID', category: 'Transmisyon',
        quantity: 4, minQuantity: 2, purchasePrice: 550.00, sellingPrice: 780.00,
        warehouseLocation: 'Raf B-4-1', condition: 'NEW',
      },
    }),
    prisma.part.create({
      data: {
        companyId: company1.id, partNumber: 'PLG-012',
        name: 'Kızdırma Bujisi', brand: 'Bosch', category: 'Ateşleme',
        quantity: 18, minQuantity: 6, purchasePrice: 65.00, sellingPrice: 95.00,
        warehouseLocation: 'Raf A-2-3', condition: 'NEW',
      },
    }),
  ]);

  // ─── Bakım Kayıtları (Şirket 1) ──────────────────────────────────────
  console.log('🛠️  Bakım kayıtları oluşturuluyor...');
  await Promise.all([
    prisma.maintenanceRecord.create({
      data: {
        motorId: motors[0].id, userId: techUser.id, maintenanceType: 'PREVENTIVE',
        title: 'Periyodik Yağ Değişimi',
        description: 'Motor yağı ve yağ filtresi değiştirildi. 10W-40 Castrol kullanıldı. Toplam 12L yağ.',
        cost: 850.00,
        performedAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        nextMaintenanceDate: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000),
        status: 'COMPLETED',
      },
    }),
    prisma.maintenanceRecord.create({
      data: {
        motorId: motors[0].id, userId: techUser.id, maintenanceType: 'INSPECTION',
        title: 'Yıllık Genel Muayene',
        description: 'Motor genel kontrolü yapıldı. Kompresyon testi, yağ basıncı ve sıcaklık değerleri normal.',
        cost: 500.00,
        performedAt: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
        status: 'COMPLETED',
      },
    }),
    prisma.maintenanceRecord.create({
      data: {
        motorId: motors[0].id, userId: techUser.id, maintenanceType: 'EMERGENCY',
        title: 'Acil Kayış Değişimi',
        description: 'V kayışı kopması nedeniyle acil müdahale yapıldı. Gates marka kayış takıldı.',
        cost: 780.00,
        performedAt: new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000),
        status: 'COMPLETED',
      },
    }),
    prisma.maintenanceRecord.create({
      data: {
        motorId: motors[1].id, userId: techUser.id, maintenanceType: 'CORRECTIVE',
        title: 'Yağ Kaçağı Tamiri',
        description: 'Motor bloğundan yağ kaçağı tespit edildi. Karter contası ve valf kapağı contası değişilecek.',
        cost: 2200.00,
        performedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
        status: 'IN_PROGRESS',
      },
    }),
    prisma.maintenanceRecord.create({
      data: {
        motorId: motors[1].id, userId: managerUser.id, maintenanceType: 'PREVENTIVE',
        title: 'Yakıt Sistemi Temizliği',
        description: 'Enjektörler sökülerek ultrasonik temizlik yapıldı. Yakıt filtresi değiştirildi.',
        cost: 1400.00,
        performedAt: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
        status: 'COMPLETED',
      },
    }),
    prisma.maintenanceRecord.create({
      data: {
        motorId: motors[2].id, userId: managerUser.id, maintenanceType: 'PREVENTIVE',
        title: 'Filtre Değişimi',
        description: 'Hava filtresi, yakıt filtresi ve yağ filtresi değiştirildi.',
        cost: 650.00,
        performedAt: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
        nextMaintenanceDate: new Date(now.getTime() + 75 * 24 * 60 * 60 * 1000),
        status: 'COMPLETED',
      },
    }),
    prisma.maintenanceRecord.create({
      data: {
        motorId: motors[2].id, userId: techUser.id, maintenanceType: 'INSPECTION',
        title: 'Titreşim Analizi',
        description: 'Jeneratör motoru titreşim analizi yapıldı. Tüm değerler kabul edilebilir seviyede.',
        cost: 300.00,
        performedAt: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000),
        status: 'COMPLETED',
      },
    }),
    prisma.maintenanceRecord.create({
      data: {
        motorId: motors[3].id, userId: techUser.id, maintenanceType: 'PREVENTIVE',
        title: 'Soğutma Sistemi Kontrolü',
        description: 'Antifriz seviyesi kontrol edildi, radyatör hortumları ve termostat incelendi.',
        cost: 350.00,
        performedAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        nextMaintenanceDate: new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000),
        status: 'COMPLETED',
      },
    }),
    prisma.maintenanceRecord.create({
      data: {
        motorId: motors[4].id, userId: techUser.id, maintenanceType: 'PREVENTIVE',
        title: 'Motosiklet Kış Bakımı',
        description: 'Kış sezonu öncesi: yağ değişimi, zincir germe, buji kontrolü, akü bakımı.',
        performedAt: now,
        nextMaintenanceDate: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
        status: 'PLANNED',
      },
    }),
    prisma.maintenanceRecord.create({
      data: {
        motorId: motors[4].id, userId: techUser.id, maintenanceType: 'CORRECTIVE',
        title: 'Zincir ve Dişli Değişimi',
        description: 'Aşınmış zincir ve arka dişli değiştirildi. DID marka zincir seti takıldı.',
        cost: 1200.00,
        performedAt: new Date(now.getTime() - 50 * 24 * 60 * 60 * 1000),
        status: 'COMPLETED',
      },
    }),
    prisma.maintenanceRecord.create({
      data: {
        motorId: motors[5].id, userId: managerUser.id, maintenanceType: 'INSPECTION',
        title: 'Sezon Sonu Muayene',
        description: 'Tarım sezonu sonrası motor genel muayenesi. Güç kaybı araştırılacak.',
        performedAt: now,
        nextMaintenanceDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
        status: 'PLANNED',
      },
    }),
    prisma.maintenanceRecord.create({
      data: {
        motorId: motors[5].id, userId: techUser.id, maintenanceType: 'PREVENTIVE',
        title: 'Hidrolik Yağ Değişimi',
        description: 'Hidrolik sistem yağı ve filtresi değiştirildi. 40L hidrolik yağ kullanıldı.',
        cost: 2800.00,
        performedAt: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000),
        status: 'COMPLETED',
      },
    }),
    prisma.maintenanceRecord.create({
      data: {
        motorId: motors[6].id, userId: techUser.id, maintenanceType: 'PREVENTIVE',
        title: 'Deniz Motoru Bakımı',
        description: 'Tuzlu su korozyonu kontrolü, anotlar yenilendi, koruyucu yağlama yapıldı.',
        cost: 1800.00,
        performedAt: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
        nextMaintenanceDate: new Date(now.getTime() + 25 * 24 * 60 * 60 * 1000),
        status: 'COMPLETED',
      },
    }),
    prisma.maintenanceRecord.create({
      data: {
        motorId: motors[6].id, userId: managerUser.id, maintenanceType: 'INSPECTION',
        title: 'Pervane ve Şaft Kontrolü',
        description: 'Pervane dengesi ve şaft salınımı kontrol edildi. Sonuçlar normal.',
        cost: 600.00,
        performedAt: new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000),
        status: 'COMPLETED',
      },
    }),
    prisma.maintenanceRecord.create({
      data: {
        motorId: motors[3].id, userId: techUser.id, maintenanceType: 'PREVENTIVE',
        title: 'Turbo Bakımı',
        description: 'Turbo şarj sökülüp temizlendi, rulmanlar kontrol edildi. Yağlama yapıldı.',
        cost: 3500.00,
        performedAt: new Date(now.getTime() - 80 * 24 * 60 * 60 * 1000),
        nextMaintenanceDate: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000),
        status: 'COMPLETED',
      },
    }),
  ]);

  // ─── Stok Hareketleri (Şirket 1) ──────────────────────────────────────
  console.log('📦 Stok hareketleri oluşturuluyor...');
  await Promise.all([
    prisma.partMovement.create({ data: { partId: parts[0].id, userId: adminUser.id, movementType: 'IN', quantity: 20, notes: 'İlk stok girişi — Mann yağ filtresi', createdAt: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000) } }),
    prisma.partMovement.create({ data: { partId: parts[0].id, motorId: motors[0].id, userId: techUser.id, movementType: 'OUT', quantity: 3, notes: 'Volvo D13 periyodik bakım', createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } }),
    prisma.partMovement.create({ data: { partId: parts[0].id, motorId: motors[2].id, userId: techUser.id, movementType: 'OUT', quantity: 2, notes: 'CAT C15 filtre değişimi', createdAt: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000) } }),
    prisma.partMovement.create({ data: { partId: parts[1].id, userId: adminUser.id, movementType: 'IN', quantity: 10, notes: 'Bosch tedarikçiden toptan alım', createdAt: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000) } }),
    prisma.partMovement.create({ data: { partId: parts[1].id, userId: techUser.id, movementType: 'OUT', quantity: 8, notes: 'Çeşitli motorlar için kullanıldı', createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000) } }),
    prisma.partMovement.create({ data: { partId: parts[2].id, userId: adminUser.id, movementType: 'IN', quantity: 10, notes: 'Gates V kayışı stok girişi', createdAt: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) } }),
    prisma.partMovement.create({ data: { partId: parts[2].id, motorId: motors[0].id, userId: techUser.id, movementType: 'OUT', quantity: 1, notes: 'Volvo D13 acil kayış değişimi', createdAt: new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000) } }),
    prisma.partMovement.create({ data: { partId: parts[2].id, userId: techUser.id, movementType: 'OUT', quantity: 1, notes: 'Yedek olarak servis aracına verildi', createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000) } }),
    prisma.partMovement.create({ data: { partId: parts[7].id, userId: adminUser.id, movementType: 'IN', quantity: 25, notes: 'Castrol 10W-40 toptan alım (5L bidon)', createdAt: new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000) } }),
    prisma.partMovement.create({ data: { partId: parts[7].id, userId: techUser.id, movementType: 'OUT', quantity: 3, notes: 'Volvo D13 yağ değişimi', createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } }),
    prisma.partMovement.create({ data: { partId: parts[7].id, userId: techUser.id, movementType: 'OUT', quantity: 2, notes: 'Cummins QSB6.7 yağ ikmali', createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } }),
    prisma.partMovement.create({ data: { partId: parts[4].id, userId: adminUser.id, movementType: 'IN', quantity: 4, notes: 'Brembo balata stok girişi', createdAt: new Date(now.getTime() - 70 * 24 * 60 * 60 * 1000) } }),
    prisma.partMovement.create({ data: { partId: parts[4].id, userId: techUser.id, movementType: 'OUT', quantity: 3, notes: 'Araç filosu fren bakımı', createdAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000) } }),
    prisma.partMovement.create({ data: { partId: parts[5].id, userId: adminUser.id, movementType: 'IN', quantity: 8, notes: 'Victor Reinz conta takımı girişi', createdAt: new Date(now.getTime() - 50 * 24 * 60 * 60 * 1000) } }),
    prisma.partMovement.create({ data: { partId: parts[5].id, motorId: motors[1].id, userId: techUser.id, movementType: 'OUT', quantity: 2, notes: 'MB OM471 conta değişimi', createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) } }),
    prisma.partMovement.create({ data: { partId: parts[10].id, userId: adminUser.id, movementType: 'IN', quantity: 4, notes: 'DID zincir seti girişi', createdAt: new Date(now.getTime() - 55 * 24 * 60 * 60 * 1000) } }),
  ]);

  // ─── Şirket 1 İlanları ─────────────────────────────────────────────────
  console.log('🏪 Şirket 1 ilanları oluşturuluyor...');
  const listings1 = await Promise.all([
    prisma.listing.create({
      data: {
        companyId: company1.id, userId: adminUser.id, partId: parts[9].id,
        title: 'Garrett Turbo Şarj — MAN D2676 Uyumlu',
        description: 'MAN D2676 motordan sökülen Garrett turbo şarj. Çalışır durumda, 120.000 km kullanılmış. Ultrasonik temizlik yapılmıştır. Test raporuyla birlikte teslim.',
        price: 12000.00, quantity: 1, condition: 'USED', status: 'ACTIVE', viewsCount: 47,
      },
    }),
    prisma.listing.create({
      data: {
        companyId: company1.id, userId: adminUser.id,
        title: 'Volvo D13 Enjektör Takımı (6lı)',
        description: 'Orijinal Volvo D13 enjektör takımı. 2020 model motordan söküldü, profesyonel revize yapılmıştır. 6 ay garanti.',
        price: 18500.00, quantity: 1, condition: 'REFURBISHED', status: 'ACTIVE', viewsCount: 31,
      },
    }),
    prisma.listing.create({
      data: {
        companyId: company1.id, userId: managerUser.id,
        title: 'Brembo Fren Balata Seti — Ağır Ticari',
        description: 'Orijinal Brembo fren balata setleri. Kamyon ve ağır ticari araç uyumlu. Toptan fiyat.',
        price: 2400.00, quantity: 5, condition: 'NEW', status: 'ACTIVE', viewsCount: 15,
      },
    }),
    prisma.listing.create({
      data: {
        companyId: company1.id, userId: adminUser.id,
        title: 'Caterpillar C15 Silindir Kapağı',
        description: 'CAT C15 ACERT motor için yedek silindir kapağı. Az kullanılmış, çatlak yok.',
        price: 25000.00, quantity: 1, condition: 'USED', status: 'ACTIVE', viewsCount: 9,
      },
    }),
  ]);

  // ═══════════════════════════════════════════════════════════════════════
  // ŞİRKET 2 — Anadolu Motor Ltd. (Pazar yeri için)
  // ═══════════════════════════════════════════════════════════════════════
  console.log('🏢 Şirket 2: Anadolu Motor Ltd. oluşturuluyor...');
  const company2 = await prisma.company.create({
    data: {
      name: 'Anadolu Motor Ltd.',
      email: 'info@anadolumotor.com',
      phone: '+90 312 444 5678',
      address: 'Organize Sanayi Böl. 5. Cad. No:18',
      city: 'Ankara',
      taxNumber: '9876543210',
    },
  });

  const company2User = await prisma.user.create({
    data: {
      companyId: company2.id, email: 'satis@anadolumotor.com',
      passwordHash: hashedPassword, fullName: 'Ali Demir', role: 'ADMIN',
    },
  });

  await prisma.subscription.create({
    data: { companyId: company2.id, planId: 'plan-starter', status: 'ACTIVE' },
  });

  // Şirket 2 İlanları (bunlar pazar yerinde görünecek)
  console.log('🏪 Şirket 2 pazar yeri ilanları...');
  const listings2 = await Promise.all([
    prisma.listing.create({
      data: {
        companyId: company2.id, userId: company2User.id,
        title: 'Cummins ISX15 Komple Motor — 0 Km Revizeli',
        description: 'Cummins ISX15 motor komple revizyondan geçmiş, 0 km. Tüm contalar, segmanlar yeni. 1 yıl garanti. Fatura ve test raporu mevcuttur.',
        price: 95000.00, quantity: 1, condition: 'REFURBISHED', status: 'ACTIVE', viewsCount: 124,
      },
    }),
    prisma.listing.create({
      data: {
        companyId: company2.id, userId: company2User.id,
        title: 'Mercedes OM471 Krank Mili — Orijinal',
        description: 'Mercedes-Benz OM471 orijinal krank mili. 200.000 km kullanılmış, ölçüler standart. Taşlama yapılmamış.',
        price: 28000.00, quantity: 1, condition: 'USED', status: 'ACTIVE', viewsCount: 56,
      },
    }),
    prisma.listing.create({
      data: {
        companyId: company2.id, userId: company2User.id,
        title: 'Bosch Common Rail Enjektör — Çeşitli Modeller',
        description: 'Bosch orijinal common rail enjektörler. MAN, Mercedes, Volvo uyumlu modeller mevcut. Sıfır, kutusunda.',
        price: 4500.00, quantity: 12, condition: 'NEW', status: 'ACTIVE', viewsCount: 89,
      },
    }),
    prisma.listing.create({
      data: {
        companyId: company2.id, userId: company2User.id,
        title: 'ZF Şanzıman 16S2530 — Kamyon',
        description: '16 ileri ZF şanzıman, 2019 model Scania\'dan söküldü. 180.000 km. Test edilmiş, çalışır durumda.',
        price: 45000.00, quantity: 1, condition: 'USED', status: 'ACTIVE', viewsCount: 67,
      },
    }),
    prisma.listing.create({
      data: {
        companyId: company2.id, userId: company2User.id,
        title: 'Wabco ABS Kontrol Ünitesi',
        description: 'Wabco ABS/EBS kontrol ünitesi. Ağır ticari araç uyumlu. Revize edilmiş, 6 ay garanti.',
        price: 7500.00, quantity: 3, condition: 'REFURBISHED', status: 'ACTIVE', viewsCount: 34,
      },
    }),
    prisma.listing.create({
      data: {
        companyId: company2.id, userId: company2User.id,
        title: 'Caterpillar C13 Yağ Pompası',
        description: 'CAT C13 motor için yağ pompası. Orijinal parça, az kullanılmış.',
        price: 6200.00, quantity: 2, condition: 'USED', status: 'ACTIVE', viewsCount: 21,
      },
    }),
  ]);

  // ═══════════════════════════════════════════════════════════════════════
  // ŞİRKET 3 — Ege Dizel San. Tic. (Daha fazla pazar yeri çeşitliliği)
  // ═══════════════════════════════════════════════════════════════════════
  console.log('🏢 Şirket 3: Ege Dizel San. Tic. oluşturuluyor...');
  const company3 = await prisma.company.create({
    data: {
      name: 'Ege Dizel San. Tic.',
      email: 'info@egedizel.com',
      phone: '+90 232 333 4567',
      address: 'Atatürk OSB 12. Sok. No:7',
      city: 'İzmir',
      taxNumber: '5678901234',
    },
  });

  const company3User = await prisma.user.create({
    data: {
      companyId: company3.id, email: 'satis@egedizel.com',
      passwordHash: hashedPassword, fullName: 'Hasan Çelik', role: 'ADMIN',
    },
  });

  await prisma.subscription.create({
    data: { companyId: company3.id, planId: 'plan-pro', status: 'ACTIVE' },
  });

  const listings3 = await Promise.all([
    prisma.listing.create({
      data: {
        companyId: company3.id, userId: company3User.id,
        title: 'Volvo D12 Silindir Gömleği Seti (6lı)',
        description: 'Volvo D12 motor için aftermarket silindir gömleği seti. Yüksek kalite, OEM standartlarında.',
        price: 8900.00, quantity: 4, condition: 'NEW', status: 'ACTIVE', viewsCount: 42,
      },
    }),
    prisma.listing.create({
      data: {
        companyId: company3.id, userId: company3User.id,
        title: 'Denso Marş Motoru — 24V Ağır Hizmet',
        description: 'Denso 24V marş motoru. Kamyon ve iş makinesi uyumlu. Sıfır, garantili.',
        price: 5800.00, quantity: 6, condition: 'NEW', status: 'ACTIVE', viewsCount: 38,
      },
    }),
    prisma.listing.create({
      data: {
        companyId: company3.id, userId: company3User.id,
        title: 'MAN D2066 Piston Kol Seti',
        description: 'MAN D2066 motor için piston ve kol seti. Nural marka, orijinal ölçü.',
        price: 12500.00, quantity: 2, condition: 'NEW', status: 'ACTIVE', viewsCount: 19,
      },
    }),
    prisma.listing.create({
      data: {
        companyId: company3.id, userId: company3User.id,
        title: 'Holset Turbo HX40 — Cummins Uyumlu',
        description: 'Holset HX40 turbo şarj. Cummins 6CT, 6BT motorlara uyumlu. Revizyonlu, 6 ay garanti.',
        price: 9500.00, quantity: 1, condition: 'REFURBISHED', status: 'ACTIVE', viewsCount: 55,
      },
    }),
  ]);

  // ─── Pazar Yeri Mesajları ──────────────────────────────────────────────
  console.log('💬 Pazar yeri mesajları oluşturuluyor...');
  await Promise.all([
    // Şirket 1 → Şirket 2'nin ilanına mesaj
    prisma.listingMessage.create({
      data: {
        listingId: listings2[0].id, senderCompanyId: company1.id, receiverCompanyId: company2.id,
        message: 'Merhaba, Cummins ISX15 motor hâlâ mevcut mu? Fiyatta pazarlık payı var mı?',
        createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.listingMessage.create({
      data: {
        listingId: listings2[0].id, senderCompanyId: company2.id, receiverCompanyId: company1.id,
        message: 'Merhaba, evet motor hâlâ mevcut. Fiyat 90.000₺\'ye düşebilir, peşin ödeme şartıyla.',
        createdAt: new Date(now.getTime() - 1.5 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.listingMessage.create({
      data: {
        listingId: listings2[0].id, senderCompanyId: company1.id, receiverCompanyId: company2.id,
        message: 'Teşekkürler. Motoru yerinde görmemiz mümkün mü? Ankara\'ya gelebiliriz.',
        createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      },
    }),
    // Şirket 2 → Şirket 1'in turbo ilanına mesaj
    prisma.listingMessage.create({
      data: {
        listingId: listings1[0].id, senderCompanyId: company2.id, receiverCompanyId: company1.id,
        message: 'Garrett turbo ile ilgileniyoruz. Test raporu var mı? Kargo ile gönderim yapıyor musunuz?',
        createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.listingMessage.create({
      data: {
        listingId: listings1[0].id, senderCompanyId: company1.id, receiverCompanyId: company2.id,
        message: 'Test raporu mevcuttur, PDF olarak gönderebilirim. Kargo ile gönderim yapıyoruz, sigortalı olarak.',
        createdAt: new Date(now.getTime() - 2.5 * 24 * 60 * 60 * 1000),
      },
    }),
    // Şirket 3 → Şirket 1'in enjektör ilanına mesaj
    prisma.listingMessage.create({
      data: {
        listingId: listings1[1].id, senderCompanyId: company3.id, receiverCompanyId: company1.id,
        message: 'D13 enjektör takımı kaç km kullanılmış? Revizyon belgesi var mı?',
        createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.listingMessage.create({
      data: {
        listingId: listings1[1].id, senderCompanyId: company1.id, receiverCompanyId: company3.id,
        message: '85.000 km kullanılmış. Revizyon Bosch yetkili servisinde yapılmıştır, belgesi mevcuttur.',
        createdAt: new Date(now.getTime() - 4.5 * 24 * 60 * 60 * 1000),
      },
    }),
  ]);

  console.log('');
  console.log('✅ ════════════════════════════════════════════════');
  console.log('✅  Seed tamamlandı!');
  console.log('✅ ════════════════════════════════════════════════');
  console.log('');
  console.log('📊 Veri Özeti:');
  console.log('   🏢 3 Şirket');
  console.log('   👥 6 Kullanıcı');
  console.log('   ⚙️  8 Motor (5 Aktif, 2 Bakımda, 1 Emekli)');
  console.log('   🔧 12 Parça (3 düşük stoklu, 1 stok bitti)');
  console.log('   🛠️  15 Bakım kaydı (11 Tamamlanmış, 1 Devam Eden, 2 Planlı, 1 Acil)');
  console.log('   📦 16 Stok hareketi');
  console.log('   🏪 14 Pazar yeri ilanı (4 kendi + 10 diğer şirketler)');
  console.log('   💬 7 Mesaj');
  console.log('');
  console.log('📧 Giriş:');
  console.log('   admin@motortrack.com / Demo1234!');
}

main()
  .catch((e) => { console.error('❌ Seed hatası:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
