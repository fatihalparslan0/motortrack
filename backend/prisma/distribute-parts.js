const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  console.log('🔄 Parça dağıtım işlemi başlatılıyor...');
  const company = await prisma.company.findFirst();
  if (!company) {
    console.error('Şirket bulunamadı.');
    return;
  }
  console.log(`🏢 Şirket: ${company.name} (${company.id})`);

  // 1. A, B, C Depolarını oluştur veya bul
  const desiredWarehouses = [
    { name: 'Ana Depo', isDefault: true, description: 'Merkez Atölye ve Ana Stok', address: 'Ana Bina Kat: 1' },
    { name: 'A Deposu', isDefault: false, description: 'Hızlı Tüketim & Bakım Parçaları', address: 'A Blok - Raf Bölümü' },
    { name: 'B Deposu', isDefault: false, description: 'Motor Bloğu & Ağır Aksam', address: 'B Blok - Zemin Kat' },
    { name: 'C Deposu', isDefault: false, description: 'Sarf Malzemeleri & Elektrik', address: 'C Blok - Kiler' },
  ];

  const warehouseMap = {};
  for (const dw of desiredWarehouses) {
    let w = await prisma.warehouse.findFirst({
      where: { companyId: company.id, name: dw.name }
    });
    if (!w) {
      w = await prisma.warehouse.create({
        data: {
          companyId: company.id,
          name: dw.name,
          description: dw.description,
          address: dw.address,
          isDefault: dw.isDefault,
          isActive: true
        }
      });
      console.log(`✅ Depo oluşturuldu: ${w.name}`);
    } else {
      console.log(`📦 Mevcut depo: ${w.name}`);
    }
    warehouseMap[dw.name] = w;
  }

  // 2. Parçaları al ve depolara dağıt
  const parts = await prisma.part.findMany({ where: { companyId: company.id } });
  console.log(`📋 Toplam ${parts.length} parça dağıtılacak.`);

  const distributions = {
    'Kızdırma Bujisi': { 'Ana Depo': 8, 'A Deposu': 4, 'B Deposu': 2, 'C Deposu': 4 },
    'Motor Yağı 10W-40 (5L)': { 'Ana Depo': 10, 'A Deposu': 5, 'B Deposu': 2, 'C Deposu': 3 },
    'V Kayışı': { 'Ana Depo': 4, 'A Deposu': 2, 'B Deposu': 1, 'C Deposu': 1 },
    'Fren Balatası (Ön)': { 'Ana Depo': 3, 'A Deposu': 2, 'B Deposu': 0, 'C Deposu': 1 },
    'Radyatör': { 'Ana Depo': 2, 'A Deposu': 0, 'B Deposu': 2, 'C Deposu': 0 },
    'Hava Filtresi': { 'Ana Depo': 5, 'A Deposu': 3, 'B Deposu': 1, 'C Deposu': 2 },
    'Zincir Seti': { 'Ana Depo': 3, 'A Deposu': 1, 'B Deposu': 2, 'C Deposu': 0 },
    'Turbo Şarj': { 'Ana Depo': 2, 'A Deposu': 0, 'B Deposu': 2, 'C Deposu': 0 },
    'Conta Takımı': { 'Ana Depo': 3, 'A Deposu': 2, 'B Deposu': 1, 'C Deposu': 1 },
    'Yağ Filtresi': { 'Ana Depo': 8, 'A Deposu': 4, 'B Deposu': 2, 'C Deposu': 3 },
    'Yağ filtresi': { 'Ana Depo': 5, 'A Deposu': 3, 'B Deposu': 1, 'C Deposu': 1 },
  };

  const defaultDist = (qty) => {
    const q = Math.max(qty, 6);
    const ana = Math.ceil(q * 0.45);
    const a = Math.ceil(q * 0.25);
    const b = Math.ceil(q * 0.15);
    const c = Math.max(0, q - ana - a - b);
    return { 'Ana Depo': ana, 'A Deposu': a, 'B Deposu': b, 'C Deposu': c };
  };

  for (const part of parts) {
    const dist = distributions[part.name] || defaultDist(part.quantity);
    let total = 0;

    for (const [wName, qty] of Object.entries(dist)) {
      const w = warehouseMap[wName];
      if (!w) continue;
      total += qty;
      await prisma.warehouseStock.upsert({
        where: { warehouseId_partId: { warehouseId: w.id, partId: part.id } },
        update: { quantity: qty },
        create: { warehouseId: w.id, partId: part.id, quantity: qty }
      });
    }

    await prisma.part.update({
      where: { id: part.id },
      data: { quantity: total }
    });

    console.log(`✨ ${part.name} → Toplam: ${total} adet (${JSON.stringify(dist)})`);
  }

  console.log('🎉 Tüm parçalar depolara başarıyla dağıtıldı!');
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
