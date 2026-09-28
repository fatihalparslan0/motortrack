/**
 * Seed: Ana Depo oluştur ve mevcut şirketlere varsayılan depo ekle
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Depo seed başlatılıyor...');

  // Tüm şirketleri al
  const companies = await prisma.company.findMany({ where: { isActive: true } });
  console.log(`📦 ${companies.length} şirket bulundu.`);

  for (const company of companies) {
    // Zaten varsayılan depo var mı?
    const existing = await prisma.warehouse.findFirst({
      where: { companyId: company.id, isDefault: true },
    });

    if (!existing) {
      const warehouse = await prisma.warehouse.create({
        data: {
          companyId: company.id,
          name: 'Merkez Yedek Parça Deposu',
          description: 'Sıfır ambalajlı orijinal ve muadil yedek parçalar (Filtreler, bujiler, frenler, kayışlar)',
          address: 'Asma Kat / A-B Raf Reyonu',
          isDefault: true,
          isActive: true,
        },
      });
      console.log(`✅ ${company.name} için "Merkez Yedek Parça Deposu" oluşturuldu: ${warehouse.id}`);
    } else {
      console.log(`⏭️  ${company.name} zaten varsayılan depoya sahip: ${existing.name}`);
    }
  }

  console.log('✅ Seed tamamlandı!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
