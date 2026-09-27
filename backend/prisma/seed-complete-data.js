const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Kapsamlı demo verileri ekleniyor...');

  // 1. Demo Makina A.Ş. şirketini ve admin kullanıcısını bul
  const company = await prisma.company.findFirst({
    where: { name: { contains: 'Demo' } },
  });

  if (!company) {
    console.error('❌ Demo Makina A.Ş. bulunamadı.');
    return;
  }

  const admin = await prisma.user.findFirst({
    where: { companyId: company.id, role: 'ADMIN' },
  });

  if (!admin) {
    console.error('❌ Admin kullanıcı bulunamadı.');
    return;
  }

  console.log(`🏢 Şirket: ${company.name} (${company.id})`);
  console.log(`👤 Admin: ${admin.fullName} (${admin.id})`);

  // 2. Tedarikçiler (Suppliers)
  console.log('📦 Tedarikçiler ekleniyor/güncelleniyor...');
  const suppliersData = [
    {
      name: 'Bosch Otomotiv Yedek Parça A.Ş.',
      contactPerson: 'Serdar Kaya (Satış Müdürü)',
      phone: '0 (216) 555 43 21',
      email: 'siparis@bosch-otomotiv.com.tr',
      address: 'Dudullu Organize Sanayi Bölgesi 2. Cadde No:14 Ümraniye / İstanbul',
      notes: 'Buji, fren balatası, elektrik aksamı ana tedarikçisi. Vade: 45 gün.',
    },
    {
      name: 'Castrol Madeni Yağlar Sanayi A.Ş.',
      contactPerson: 'Ebru Yıldız (Bölge Temsilcisi)',
      phone: '0 (212) 444 87 65',
      email: 'tedarik@castrol.com.tr',
      address: 'Maslak Mah. Büyükdere Cad. No:245 Sarıyer / İstanbul',
      notes: 'Motor yağı, hidrolik yağı ve katkı maddeleri yetkili distribütörü.',
    },
    {
      name: 'Valeo Debriyaj & Aydınlatma Sistemleri',
      contactPerson: 'Murat Arslan',
      phone: '0 (212) 333 98 76',
      email: 'turkiye.satis@valeo.com',
      address: 'İkitelli OSB Metal-İş Sanayi Sitesi 12. Blok No:8 Başakşehir / İstanbul',
      notes: 'Debriyaj seti, zincir seti, alternatör parçaları.',
    },
    {
      name: 'Filtron Filtre Sistemleri Tic. Ltd. Şti.',
      contactPerson: 'Kemal Tekin',
      phone: '0 (232) 222 11 00',
      email: 'bilgi@filtronturkey.com',
      address: 'Kemalpaşa OSB No:55 İzmir',
      notes: 'Yağ, hava, yakıt ve polen filtreleri tedarikçisi.',
    },
    {
      name: 'Denso Elektronik & Ateşleme Teknolojileri',
      contactPerson: 'Hakan Özdemir',
      phone: '0 (216) 111 22 33',
      email: 'destek@denso.com.tr',
      address: 'Kartal Sanayi Cad. No:78 Kartal / İstanbul',
      notes: 'Buji, radyatör, oksijen sensörü.',
    },
  ];

  const createdSuppliers = [];
  for (const s of suppliersData) {
    let sup = await prisma.supplier.findFirst({
      where: { companyId: company.id, name: s.name },
    });
    if (!sup) {
      sup = await prisma.supplier.create({
        data: {
          companyId: company.id,
          ...s,
        },
      });
      console.log(`✅ Tedarikçi eklendi: ${sup.name}`);
    } else {
      console.log(`ℹ️ Tedarikçi zaten var: ${sup.name}`);
    }
    createdSuppliers.push(sup);
  }

  // 3. Parçaları al
  const parts = await prisma.part.findMany({
    where: { companyId: company.id },
  });
  console.log(`🧩 ${parts.length} parça mevcut.`);

  // 4. Satın Alma Kayıtları (Purchase Records)
  console.log('💳 Satın alma geçmişi kontrol ediliyor...');
  const purchaseCount = await prisma.purchaseRecord.count({ where: { companyId: company.id } });
  if (purchaseCount < 3 && parts.length > 0 && createdSuppliers.length > 0) {
    for (let i = 0; i < Math.min(parts.length, 5); i++) {
      const part = parts[i];
      const supplier = createdSuppliers[i % createdSuppliers.length];
      const qty = (i + 1) * 5;
      const unitCost = part.purchasePrice || 150;
      await prisma.purchaseRecord.create({
        data: {
          companyId: company.id,
          partId: part.id,
          supplierId: supplier.id,
          userId: admin.id,
          quantity: qty,
          unitCost: unitCost,
          totalCost: Number(unitCost) * qty,
          notes: `${supplier.name} firmasından rutin stok tamamlama alımı`,
          purchasedAt: new Date(Date.now() - (i + 1) * 3 * 86400000),
        },
      });
    }
    console.log('✅ Satın alma kayıtları oluşturuldu.');
  }

  // 5. İş Emirleri (Work Orders)
  console.log('📋 İş emirleri oluşturuluyor...');
  const existingOrders = await prisma.workOrder.count({ where: { companyId: company.id } });
  
  if (existingOrders < 5) {
    const ordersData = [
      {
        title: '10.000 KM Periyodik Bakım & Yağ Değişimi',
        description: 'Motor yağı, yağ filtresi ve hava filtresi değişimi yapılacak. Genel sıvı kontrolleri.',
        customerName: 'Mehmet Çelik',
        customerPhone: '0 (532) 111 22 33',
        vehicleInfo: 'Honda NC750X (34 ABC 789)',
        status: 'DEVAM_EDIYOR',
        laborCost: 1200.0,
        notes: 'Müşteri saat 17:00 teslim istedi.',
        startedAt: new Date(Date.now() - 3600000 * 4),
      },
      {
        title: 'Ön & Arka Fren Balata Yenileme',
        description: 'Fren balataları aşınmış, balatalar yenilenecek ve hidrolik havası alınacak.',
        customerName: 'Ayşe Yılmaz',
        customerPhone: '0 (542) 222 33 44',
        vehicleInfo: 'Yamaha MT-07 (35 YMH 12)',
        status: 'ACIK',
        laborCost: 850.0,
        notes: 'Disklerde eğrilik yok, sadece balata değişecek.',
      },
      {
        title: 'Ağır Bakım: Zincir Dişli & Kayış Değişimi',
        description: 'DID zincir dişli seti takıldı, varyatör kayışı kontrol edilip değiştirildi.',
        customerName: 'Caner Öztürk',
        customerPhone: '0 (505) 333 44 55',
        vehicleInfo: 'Kawasaki Z900 (06 KWS 90)',
        status: 'TAMAMLANDI',
        laborCost: 2400.0,
        notes: 'İşlem tamamlandı, test sürüşü yapıldı. Müşteri teslim aldı.',
        startedAt: new Date(Date.now() - 86400000 * 2),
        completedAt: new Date(Date.now() - 86400000 * 1),
      },
      {
        title: 'Ateşleme Sistemi Kontrolü & Buji Değişimi',
        description: 'Sabahları zor çalışma şikayeti var. Buji ve enjeksiyon kontrolü yapılacak.',
        customerName: 'Burak Doğan',
        customerPhone: '0 (533) 444 55 66',
        vehicleInfo: 'BMW R1250GS (34 BMW 125)',
        status: 'DEVAM_EDIYOR',
        laborCost: 1100.0,
        notes: 'Orijinal bujiler takılıyor.',
        startedAt: new Date(Date.now() - 3600000 * 2),
      },
      {
        title: 'Radyatör Temizliği & Soğutma Sıvısı Yenileme',
        description: 'Hararet yükselme uyarısı. Radyatör petekleri temizlendi, antifrizli sıvı konuldu.',
        customerName: 'Serkan Aydın',
        customerPhone: '0 (555) 555 66 77',
        vehicleInfo: 'KTM 390 Duke (16 KTM 39)',
        status: 'TAMAMLANDI',
        laborCost: 1400.0,
        notes: 'Termostat normal çalışıyor, sızıntı tespit edilmedi.',
        startedAt: new Date(Date.now() - 86400000 * 3),
        completedAt: new Date(Date.now() - 86400000 * 2),
      },
    ];

    for (const orderData of ordersData) {
      const order = await prisma.workOrder.create({
        data: {
          companyId: company.id,
          userId: admin.id,
          ...orderData,
        },
      });

      // İş emrine parça ekle
      if (parts.length > 0) {
        const randomPart = parts[Math.floor(Math.random() * parts.length)];
        await prisma.workOrderItem.create({
          data: {
            workOrderId: order.id,
            partId: randomPart.id,
            quantity: 1,
            unitPrice: randomPart.sellingPrice || 350.0,
            unitCost: randomPart.purchasePrice || 200.0,
            status: order.status === 'TAMAMLANDI' ? 'KULLANILDI' : 'REZERVE',
            notes: 'Bakım kapsamında takılan parça',
          },
        });
      }
      console.log(`✅ İş emri eklendi: ${order.title} (${order.status})`);
    }
  } else {
    console.log(`ℹ️ Yeterli iş emri mevcut (${existingOrders} adet).`);
  }

  console.log('🎉 Tüm demo verileri başarıyla hazırlandı!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
