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

  // 1. Gerçek Otomotiv Sanayi Depoları
  const desiredWarehouses = [
    { name: 'Merkez Yedek Parça Deposu', isDefault: true, description: 'Sıfır ambalajlı orijinal ve muadil yedek parçalar (Filtreler, bujiler, frenler, kayışlar)', address: 'Asma Kat / A-B Raf Reyonu' },
    { name: 'Atölye Hızlı Sarfiyat & Yağ Reyonu', isDefault: false, description: 'Motor/şanzıman yağları, balata spreyleri, sıvılar, contalar ve hızlı tüketim sarfiyatı', address: 'Zemin Kat / 1. & 2. Lift Yanı (Hızlı İstasyon)' },
    { name: 'Ağır Mekanik & Motor Revizyon Deposu', isDefault: false, description: 'Sandık motorlar, silindir kapakları, turboşarjlar, krank milleri, radyatörler ve aktarma organları', address: 'Arka Atölye / Vinç & Palet Bölümü' },
    { name: 'Çıkma & İkinci El Parça Rafı', isDefault: false, description: 'Araçlardan sökülen sağlam çıkma parçalar, revizyonluk dinamolar, marş motorları ve yedekler', address: 'D Blok / 2. El Reyonu - Raf D-1' },
    { name: 'Müşteri Emanet & Kurye Kabul Dolabı', isDefault: false, description: 'Müşterinin getirdiği parçalar ile parçacıdan kuryeyle gelen, montaj bekleyen etiketli parçalar', address: 'Servis Danışmanı / Müşteri Kabul Bölümü' },
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
