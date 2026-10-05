const prisma = require('../utils/prisma');
const { success } = require('../utils/apiResponse');

/**
 * GET /api/analytics/executive-summary
 * Yönetici için kapsamlı Ciro, Maliyet, Kâr ve Teknisyen Performans Analizi
 */
exports.getExecutiveSummary = async (req, res, next) => {
  try {
    const { period = 'month', startDate, endDate, technicianId } = req.query;
    const companyId = req.company.id;

    // ─── 1. Tarih Aralığı Hesaplama ──────────────────────────────────────────
    const now = new Date();
    let start = new Date();
    let end = new Date();

    if (period === 'today') {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (period === 'week') {
      // Son 7 gün
      start.setDate(now.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (period === 'month') {
      // Bu ayın ilk gününden itibaren
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (period === 'year') {
      // Bu yılın başından itibaren
      start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (period === 'custom' && startDate) {
      start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      end = endDate ? new Date(endDate) : new Date();
      end.setHours(23, 59, 59, 999);
    } else {
      // Varsayılan: Son 30 gün
      start.setDate(now.getDate() - 29);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    }

    // ─── 2. Şirket Personellerini Çek ─────────────────────────────────────────
    const staffList = await prisma.user.findMany({
      where: { companyId, isActive: true },
      select: { id: true, fullName: true, role: true, email: true },
    });

    // ─── 3. İş Emirlerini Çek (WorkOrders + Items) ───────────────────────────
    const woFilter = {
      companyId,
      createdAt: { gte: start, lte: end },
    };
    if (technicianId) {
      woFilter.userId = technicianId;
    }

    const workOrders = await prisma.workOrder.findMany({
      where: woFilter,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, fullName: true, role: true } },
        items: {
          include: {
            part: {
              select: {
                id: true,
                name: true,
                brand: true,
                sku: true,
                purchasePrice: true,
                sellingPrice: true,
              },
            },
          },
        },
      },
    });

    // ─── 4. Kasa Hareketlerini Çek (CashTransactions) ────────────────────────
    const cashTransactions = await prisma.cashTransaction.findMany({
      where: {
        companyId,
        date: { gte: start, lte: end },
      },
      orderBy: { date: 'desc' },
    });

    // ─── 5. Finansal Toplamları Hesapla ──────────────────────────────────────
    let totalLaborRevenue = 0;
    let totalPartsRevenue = 0;
    let totalPartsCost = 0;
    let totalPaid = 0;
    let completedCount = 0;
    let inProgressCount = 0;
    let openCount = 0;
    let cancelledCount = 0;

    // Teknisyen bazlı veri haritası
    const techMap = new Map();
    for (const staff of staffList) {
      techMap.set(staff.id, {
        id: staff.id,
        fullName: staff.fullName,
        role: staff.role,
        totalJobs: 0,
        completedJobs: 0,
        inProgressJobs: 0,
        laborRevenue: 0,
        partsRevenue: 0,
        partsCost: 0,
        totalRevenue: 0,
        netContribution: 0,
        recentJobs: [],
      });
    }

    // Popüler parçalar ve araç markaları
    const partStatsMap = new Map();
    const brandStatsMap = new Map();

    // Günlük trend haritası
    const dailyTrendMap = new Map();

    workOrders.forEach(wo => {
      // Durum sayıları
      if (wo.status === 'TAMAMLANDI') completedCount++;
      else if (wo.status === 'DEVAM_EDIYOR') inProgressCount++;
      else if (wo.status === 'ACIK') openCount++;
      else if (wo.status === 'IPTAL') {
        cancelledCount++;
        return; // İptal edilen iş emri ciro, maliyet ve kâra dahil edilmez
      }

      const labor = Number(wo.laborCost || 0);
      totalLaborRevenue += labor;

      let woPartsRevenue = 0;
      let woPartsCost = 0;

      if (Array.isArray(wo.items)) {
        wo.items.forEach(item => {
          if (item.status === 'IPTAL') return; // İptal edilmiş parça kalemi hesaba katılmaz

          const qty = item.quantity || 0;
          const uPrice = Number(item.unitPrice || 0);
          const uCost = item.unitCost !== null && item.unitCost !== undefined
            ? Number(item.unitCost)
            : Number(item.part?.purchasePrice || 0);

          const pRev = qty * uPrice;
          const pCost = qty * uCost;

          woPartsRevenue += pRev;
          woPartsCost += pCost;

          // Parça popülaritesi
          if (item.part) {
            const pKey = item.part.id;
            const existing = partStatsMap.get(pKey) || {
              id: item.part.id,
              name: item.part.name,
              brand: item.part.brand,
              quantity: 0,
              revenue: 0,
              profit: 0,
            };
            existing.quantity += qty;
            existing.revenue += pRev;
            existing.profit += (pRev - pCost);
            partStatsMap.set(pKey, existing);
          }
        });
      }

      totalPartsRevenue += woPartsRevenue;
      totalPartsCost += woPartsCost;
      totalPaid += Number(wo.paidAmount || 0);

      const woTotalRevenue = labor + woPartsRevenue;
      const woNetProfit = woTotalRevenue - woPartsCost;

      // Araç Marka Analizi
      if (wo.vehicleInfo) {
        const firstWord = wo.vehicleInfo.trim().split(/\s+/)[0];
        if (firstWord && firstWord.length > 1) {
          const brandKey = firstWord.toUpperCase();
          const existingBrand = brandStatsMap.get(brandKey) || { brand: firstWord, count: 0, revenue: 0 };
          existingBrand.count += 1;
          existingBrand.revenue += woTotalRevenue;
          brandStatsMap.set(brandKey, existingBrand);
        }
      }

      // Günlük Trend Analizi
      const dayKey = new Date(wo.createdAt).toISOString().split('T')[0];
      const existingDay = dailyTrendMap.get(dayKey) || {
        date: dayKey,
        laborRevenue: 0,
        partsRevenue: 0,
        totalRevenue: 0,
        partsCost: 0,
        profit: 0,
        jobsCount: 0,
      };
      existingDay.laborRevenue += labor;
      existingDay.partsRevenue += woPartsRevenue;
      existingDay.totalRevenue += woTotalRevenue;
      existingDay.partsCost += woPartsCost;
      existingDay.profit += woNetProfit;
      existingDay.jobsCount += 1;
      dailyTrendMap.set(dayKey, existingDay);

      // Teknisyen Haritası Güncelle
      const techId = wo.userId;
      if (techMap.has(techId)) {
        const t = techMap.get(techId);
        t.totalJobs += 1;
        if (wo.status === 'TAMAMLANDI') t.completedJobs += 1;
        if (wo.status === 'DEVAM_EDIYOR') t.inProgressJobs += 1;
        t.laborRevenue += labor;
        t.partsRevenue += woPartsRevenue;
        t.partsCost += woPartsCost;
        t.totalRevenue += woTotalRevenue;
        t.netContribution += woNetProfit;
        if (t.recentJobs.length < 5) {
          t.recentJobs.push({
            id: wo.id,
            title: wo.title,
            customerName: wo.customerName,
            status: wo.status,
            totalRevenue: woTotalRevenue,
            createdAt: wo.createdAt,
          });
        }
      }
    });

    const totalRevenue = totalLaborRevenue + totalPartsRevenue;
    const grossProfit = totalRevenue - totalPartsCost;
    const grossMargin = totalRevenue > 0 ? Number(((grossProfit / totalRevenue) * 100).toFixed(1)) : 0;
    const totalReceivables = Math.max(0, totalRevenue - totalPaid);
    const averageTicket = workOrders.length > 0 ? Number((totalRevenue / workOrders.length).toFixed(2)) : 0;

    // ─── 6. Kasa & Gider Özeti ────────────────────────────────────────────────
    let totalCashIn = 0;
    let totalCashOut = 0;
    const expenseCategoriesMap = new Map();
    const paymentMethodsMap = new Map();

    cashTransactions.forEach(tx => {
      const amount = Number(tx.amount || 0);
      if (tx.type === 'IN') {
        totalCashIn += amount;
        const method = tx.paymentMethod || 'NAKIT';
        paymentMethodsMap.set(method, (paymentMethodsMap.get(method) || 0) + amount);
      } else {
        totalCashOut += amount;
        const cat = tx.category || 'DIGER_CIKIS';
        expenseCategoriesMap.set(cat, (expenseCategoriesMap.get(cat) || 0) + amount);
      }
    });

    const netCashFlow = totalCashIn - totalCashOut;

    // Teknisyenleri ciroya ve katkıya göre sırala
    const technicians = Array.from(techMap.values())
      .map(t => ({
        ...t,
        averageJobValue: t.totalJobs > 0 ? Number((t.totalRevenue / t.totalJobs).toFixed(2)) : 0,
        completionRate: t.totalJobs > 0 ? Number(((t.completedJobs / t.totalJobs) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    // Günlük trendi kronolojik diz
    const dailyTrend = Array.from(dailyTrendMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    // En çok kazandıran parçalar (Top 5)
    const topParts = Array.from(partStatsMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);

    // En çok gelen araç markaları (Top 5)
    const topVehicleBrands = Array.from(brandStatsMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    // Gider kategori dağılımı
    const expenseBreakdown = Array.from(expenseCategoriesMap.entries()).map(([category, amount]) => ({
      category,
      amount,
    })).sort((a, b) => b.amount - a.amount);

    // Tahsilat yöntemleri dağılımı
    const paymentBreakdown = Array.from(paymentMethodsMap.entries()).map(([method, amount]) => ({
      method,
      amount,
    })).sort((a, b) => b.amount - a.amount);

    return success(res, {
      period: {
        type: period,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      },
      overview: {
        totalRevenue,
        totalLaborRevenue,
        totalPartsRevenue,
        totalPartsCost,
        grossProfit,
        grossMargin,
        totalPaid,
        totalReceivables,
        averageTicket,
        jobCounts: {
          total: workOrders.length,
          completed: completedCount,
          inProgress: inProgressCount,
          open: openCount,
          cancelled: cancelledCount,
        },
      },
      cashFlow: {
        totalCashIn,
        totalCashOut,
        netCashFlow,
        expenseBreakdown,
        paymentBreakdown,
      },
      technicians,
      dailyTrend,
      topParts,
      topVehicleBrands,
    });
  } catch (err) {
    next(err);
  }
};
