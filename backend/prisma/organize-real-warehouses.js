/**
 * Gerçek Otomotiv Sanayi / Tamirhane Depo ve Stok Düzenleme Scripti
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🏭 Gerçek verilere göre depo düzenlemesi başlatılıyor...');

  const company = await prisma.company.findFirst({
    where: { name: 'Demo Makina A.Ş.' }
  });

  if (!company) {
    console.error('Demo Makina A.Ş. şirketi bulunamadı.');
    return;
  }

  console.log(`🏢 Şirket: ${company.name} (${company.id})`);

  // 1. Gerçek Otomotiv Sanayi Depoları
  const realWarehouses = [
    {
      oldName: 'Ana Depo',
      name: 'Merkez Yedek Parça Deposu',
      description: 'Sıfır ambalajlı orijinal ve muadil yedek parçalar (Filtreler, bujiler, frenler, kayışlar)',
      address: 'Asma Kat / A-B Raf Reyonu',
      isDefault: true,
      isActive: true,
    },
    {
      oldName: 'A Deposu',
      name: 'Atölye Hızlı Sarfiyat & Yağ Reyonu',
      description: 'Motor/şanzıman yağları, balata spreyleri, sıvılar, contalar ve hızlı tüketim sarfiyatı',
      address: 'Zemin Kat / 1. & 2. Lift Yanı (Hızlı İstasyon)',
      isDefault: false,
      isActive: true,
    },
    {
      oldName: 'B Deposu',
      name: 'Ağır Mekanik & Motor Revizyon Deposu',
      description: 'Sandık motorlar, silindir kapakları, turboşarjlar, krank milleri, radyatörler ve aktarma organları',
      address: 'Arka Atölye / Vinç & Palet Bölümü',
      isDefault: false,
      isActive: true,
    },
    {
      oldName: 'C Deposu',
      name: 'Çıkma & İkinci El Parça Rafı',
      description: 'Araçlardan sökülen sağlam çıkma parçalar, revizyonluk dinamolar, marş motorları ve yedekler',
      address: 'D Blok / 2. El Reyonu - Raf D-1',
      isDefault: false,
      isActive: true,
    },
    {
      oldName: 'Yedek Parça Deposu',
      name: 'Müşteri Emanet & Kurye Kabul Dolabı',
      description: 'Müşterinin getirdiği parçalar ile parçacıdan kuryeyle gelen, montaj bekleyen etiketli parçalar',
      address: 'Servis Danışmanı / Müşteri Kabul Bölümü',
      isDefault: false,
      isActive: true,
    },
  ];

  const warehouseMap = {};

  for (const rw of realWarehouses) {
    // Önce yeni isimle var mı bak
    let warehouse = await prisma.warehouse.findFirst({
      where: { companyId: company.id, name: rw.name },
    });

    // Yoksa eski isimle var mı bak ve güncelle
    if (!warehouse) {
      warehouse = await prisma.warehouse.findFirst({
        where: { companyId: company.id, name: rw.oldName },
      });

      if (warehouse) {
        warehouse = await prisma.warehouse.update({
          where: { id: warehouse.id },
          data: {
            name: rw.name,
            description: rw.description,
            address: rw.address,
            isDefault: rw.isDefault,
            isActive: rw.isActive,
          },
        });
        console.log(`🔄 Güncellendi: "${rw.oldName}" ➔ "${rw.name}"`);
      } else {
        warehouse = await prisma.warehouse.create({
          data: {
            companyId: company.id,
            name: rw.name,
            description: rw.description,
            address: rw.address,
            isDefault: rw.isDefault,
            isActive: rw.isActive,
          },
        });
        console.log(`✨ Yeni Depo Oluşturuldu: "${rw.name}"`);
      }
    } else {
      warehouse = await prisma.warehouse.update({
        where: { id: warehouse.id },
        data: {
          description: rw.description,
          address: rw.address,
          isDefault: rw.isDefault,
          isActive: rw.isActive,
        },
      });
      console.log(`✅ Doğrulandı: "${rw.name}"`);
    }

    warehouseMap[rw.name] = warehouse;
  }

  // 2. Parçaların Depo Raf Konumları ve Gerçekçi Dağıtımı
  const parts = await prisma.part.findMany({ where: { companyId: company.id } });
  console.log(`📦 Toplam ${parts.length} parça sanayi depolarına optimize ediliyor...`);

  // Parça bazlı gerçekçi stok dağıtımı
  const realisticDistributions = {
    'Motor Yağı 10W-40 (5L)': {
      location: 'Yağ Standı Y-1 (Lift Yanı)',
      dist: {
        'Atölye Hızlı Sarfiyat & Yağ Reyonu': 14,
        'Merkez Yedek Parça Deposu': 6,
      },
    },
    'Yağ Filtresi': {
      location: 'Raf A-1-3 (Filtre Reyonu)',
      dist: {
        'Merkez Yedek Parça Deposu': 11,
        'Atölye Hızlı Sarfiyat & Yağ Reyonu': 6,
      },
    },
    'Yağ filtresi': {
      location: 'D Blok Çıkma Rafı D-2',
      dist: {
        'Çıkma & İkinci El Parça Rafı': 10,
      },
    },
    'Hava Filtresi': {
      location: 'Raf A-1-4 (Filtre Reyonu)',
      dist: {
        'Merkez Yedek Parça Deposu': 8,
        'Atölye Hızlı Sarfiyat & Yağ Reyonu': 3,
      },
    },
    'Fren Balatası (Ön)': {
      location: 'Raf B-1-2 (Fren Reyonu)',
      dist: {
        'Merkez Yedek Parça Deposu': 4,
        'Atölye Hızlı Sarfiyat & Yağ Reyonu': 2,
      },
    },
    'Kızdırma Bujisi': {
      location: 'Raf A-2-3 (Ateşleme Reyonu)',
      dist: {
        'Merkez Yedek Parça Deposu': 12,
        'Atölye Hızlı Sarfiyat & Yağ Reyonu': 6,
      },
    },
    'V Kayışı': {
      location: 'Raf B-2-1 (Transmisyon Reyonu)',
      dist: {
        'Merkez Yedek Parça Deposu': 6,
        'Müşteri Emanet & Kurye Kabul Dolabı': 2,
      },
    },
    'Radyatör': {
      location: 'Ağır Yük Palet P-1 (Radyatör Bölümü)',
      dist: {
        'Ağır Mekanik & Motor Revizyon Deposu': 4,
      },
    },
    'Turbo Şarj': {
      location: 'D Blok Çıkma Rafı D-1 (Turbo Reyonu)',
      dist: {
        'Çıkma & İkinci El Parça Rafı': 3,
        'Ağır Mekanik & Motor Revizyon Deposu': 1,
      },
    },
    'Zincir Seti': {
      location: 'Ağır Mekanik Raf M-3',
      dist: {
        'Ağır Mekanik & Motor Revizyon Deposu': 4,
        'Merkez Yedek Parça Deposu': 2,
      },
    },
    'Conta Takımı': {
      location: 'Raf C-2-1 (Conta Reyonu)',
      dist: {
        'Merkez Yedek Parça Deposu': 4,
        'Ağır Mekanik & Motor Revizyon Deposu': 2,
        'Çıkma & İkinci El Parça Rafı': 1,
      },
    },
  };

  for (const part of parts) {
    const config = realisticDistributions[part.name];
    if (config) {
      // Önce bu parçanın mevcut tüm depo stoklarını sıfırla/güncelle
      let totalQty = 0;

      for (const [wName, qty] of Object.entries(config.dist)) {
        const w = warehouseMap[wName];
        if (!w) continue;
        totalQty += qty;

        await prisma.warehouseStock.upsert({
          where: { warehouseId_partId: { warehouseId: w.id, partId: part.id } },
          update: { quantity: qty },
          create: { warehouseId: w.id, partId: part.id, quantity: qty },
        });
      }

      // Diğer depolarda varsa 0 yap
      for (const w of Object.values(warehouseMap)) {
        if (!config.dist[w.name]) {
          await prisma.warehouseStock.upsert({
            where: { warehouseId_partId: { warehouseId: w.id, partId: part.id } },
            update: { quantity: 0 },
            create: { warehouseId: w.id, partId: part.id, quantity: 0 },
          });
        }
      }

      // Parçanın ana miktarını ve raf konumunu güncelle
      await prisma.part.update({
        where: { id: part.id },
        data: {
          quantity: totalQty,
          warehouseLocation: config.location,
        },
      });

      console.log(`✅ [${part.name}] ➔ Toplam: ${totalQty} adet | Konum: ${config.location}`);
    } else {
      // Bilinmeyen veya yeni eklenen parça varsa Merkez Depoya koy
      const centerW = warehouseMap['Merkez Yedek Parça Deposu'];
      if (centerW) {
        await prisma.warehouseStock.upsert({
          where: { warehouseId_partId: { warehouseId: centerW.id, partId: part.id } },
          update: { quantity: part.quantity },
          create: { warehouseId: centerW.id, partId: part.id, quantity: part.quantity },
        });
      }
    }
  }

  // 3. Diğer Demo Şirketlerin de Ana Depo isimlerini profesyonelleştir
  const otherCompanies = await prisma.company.findMany({
    where: { NOT: { id: company.id } },
  });

  for (const oc of otherCompanies) {
    const defW = await prisma.warehouse.findFirst({
      where: { companyId: oc.id, isDefault: true },
    });
    if (defW) {
      await prisma.warehouse.update({
        where: { id: defW.id },
        data: {
          name: 'Merkez Yedek Parça Deposu',
          description: 'Merkez atölye ana stok ve yedek parça deposu',
          address: 'Merkez Sanayi Sitesi - Ana Bina',
        },
      });
      console.log(`🏢 ${oc.name} deposu güncellendi: Merkez Yedek Parça Deposu`);
    }
  }

  console.log('\n🎉 Depolar gerçek oto sanayi verilerine göre başarıyla düzenlendi!');
}

main()
  .catch((e) => {
    console.error('❌ Hata:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
