const prisma = require('../utils/prisma');
const { success, error, paginated } = require('../utils/apiResponse');

/**
 * GET /api/cash/daily?date=YYYY-MM-DD
 * Günlük Atölye Kasası ve Anlık Kasa Durumu
 */
exports.getDailyRegister = async (req, res, next) => {
  try {
    const companyId = req.company.id;
    const targetDateStr = req.query.date || new Date().toISOString().split('T')[0];

    // Günün başlangıç ve bitiş zamanı (Hem Türkiye UTC+3 hem UTC aralığını kapsar)
    const localStart = new Date(`${targetDateStr}T00:00:00+03:00`);
    const utcStart = new Date(`${targetDateStr}T00:00:00.000Z`);
    const startOfDay = localStart < utcStart ? localStart : utcStart;

    const localEnd = new Date(`${targetDateStr}T23:59:59.999+03:00`);
    const utcEnd = new Date(`${targetDateStr}T23:59:59.999Z`);
    const endOfDay = localEnd > utcEnd ? localEnd : utcEnd;

    // 1. Bu gün için alınmış Z-Raporu (Kasa Kapatma) var mı?
    const existingClose = await prisma.dailyRegisterClose.findFirst({
      where: {
        companyId,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        user: { select: { fullName: true } },
      },
    });

    // 2. Bir önceki günün kapanışından devreden nakit
    const previousClose = await prisma.dailyRegisterClose.findFirst({
      where: {
        companyId,
        date: { lt: startOfDay },
      },
      orderBy: { date: 'desc' },
    });

    const previousDevir = previousClose ? parseFloat(previousClose.transferredToNextDay || 0) : 0;

    // 3. Günün Kasa Hareketleri (Masraflar, Devirler, İş Emri Tahsilatları)
    const manualTransactions = await prisma.cashTransaction.findMany({
      where: {
        companyId,
        date: { gte: startOfDay, lte: endOfDay },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { fullName: true } },
      },
    });

    let manualCashIn = 0;
    let manualCashOut = 0;
    let manualDevirIn = 0;
    let woTxCashIncome = 0;
    let woTxPosIncome = 0;
    let woTxTransferIncome = 0;
    let manualSupplierCashOut = 0;
    let manualSupplierBankOut = 0;

    const recordedOrderIds = new Set();
    const recordedSupplierTxIds = new Set();

    let tipIncome = 0;

    for (const tx of manualTransactions) {
      const amt = parseFloat(tx.amount || 0);
      const method = (tx.paymentMethod || 'NAKIT').toUpperCase();

      if (tx.type === 'IN') {
        if (tx.category === 'DEVIR_GIRIS') {
          manualDevirIn += amt;
        } else if (tx.category === 'IS_EMRI_TAHSILAT') {
          if (tx.documentNo) recordedOrderIds.add(tx.documentNo);
          if (method === 'NAKIT') {
            woTxCashIncome += amt;
          } else if (method === 'KREDI_KARTI' || method === 'POS') {
            woTxPosIncome += amt;
          } else if (method === 'HAVALE' || method === 'EFT') {
            woTxTransferIncome += amt;
          } else {
            woTxCashIncome += amt;
          }
        } else if (tx.category === 'BAHSIS') {
          tipIncome += amt;
          if (method === 'NAKIT') {
            woTxCashIncome += amt;
          } else if (method === 'KREDI_KARTI' || method === 'POS') {
            woTxPosIncome += amt;
          } else if (method === 'HAVALE' || method === 'EFT') {
            woTxTransferIncome += amt;
          } else {
            woTxCashIncome += amt;
          }
        } else {
          manualCashIn += amt;
        }
      } else if (tx.type === 'OUT') {
        if (tx.category === 'TEDARIKCI' || tx.category === 'TEDARIKCI_ODEME') {
          if (tx.documentNo) recordedSupplierTxIds.add(tx.documentNo);
          if (method === 'NAKIT') {
            manualSupplierCashOut += amt;
          } else {
            manualSupplierBankOut += amt;
          }
        } else {
          if (method === 'NAKIT') {
            manualCashOut += amt;
          }
        }
      }
    }

    const openingCash = previousDevir > 0 ? previousDevir : manualDevirIn;

    // 4. Günün Doğrudan İş Emri Tahsilatları (Henüz CashTransaction olarak kaydedilmemiş olanlar)
    const workOrdersToday = await prisma.workOrder.findMany({
      where: {
        companyId,
        updatedAt: { gte: startOfDay, lte: endOfDay },
        paidAmount: { gt: 0 },
        ...(recordedOrderIds.size > 0 && {
          id: { notIn: Array.from(recordedOrderIds) },
        }),
      },
      select: {
        id: true,
        title: true,
        customerName: true,
        vehicleInfo: true,
        status: true,
        paymentStatus: true,
        paidAmount: true,
        paymentMethod: true,
        updatedAt: true,
      },
    });

    let woDirectCashIncome = 0;
    let woDirectPosIncome = 0;
    let woDirectTransferIncome = 0;

    for (const wo of workOrdersToday) {
      const paid = parseFloat(wo.paidAmount || 0);
      const method = (wo.paymentMethod || 'NAKIT').toUpperCase();

      if (method === 'NAKIT') {
        woDirectCashIncome += paid;
      } else if (method === 'KREDI_KARTI' || method === 'POS') {
        woDirectPosIncome += paid;
      } else if (method === 'HAVALE' || method === 'EFT') {
        woDirectTransferIncome += paid;
      } else {
        woDirectCashIncome += paid;
      }
    }

    const woCashIncome = woTxCashIncome + woDirectCashIncome;
    const woPosIncome = woTxPosIncome + woDirectPosIncome;
    const woTransferIncome = woTxTransferIncome + woDirectTransferIncome;

    // 5. Günün Tedarikçi / Parçacı Ödemeleri (Henüz CashTransaction olarak kaydedilmemiş olanlar)
    const directSupplierPayments = await prisma.supplierTransaction.findMany({
      where: {
        companyId,
        createdAt: { gte: startOfDay, lte: endOfDay },
        type: 'ODEME',
        ...(recordedSupplierTxIds.size > 0 && {
          id: { notIn: Array.from(recordedSupplierTxIds) },
        }),
      },
      include: {
        supplier: { select: { name: true } },
        user: { select: { fullName: true } },
      },
    });

    let directSupplierCashOut = 0;
    let directSupplierBankOut = 0;

    for (const sp of directSupplierPayments) {
      const amt = parseFloat(sp.amount || 0);
      const method = (sp.paymentMethod || 'NAKIT').toUpperCase();
      if (method === 'NAKIT') {
        directSupplierCashOut += amt;
      } else {
        directSupplierBankOut += amt;
      }
    }

    const supplierCashOut = manualSupplierCashOut + directSupplierCashOut;
    const supplierBankOut = manualSupplierBankOut + directSupplierBankOut;
    const totalSupplierOut = supplierCashOut + supplierBankOut;

    // 6. Günün Tamamlanan İş Emri Sayısı
    const completedOrdersCount = await prisma.workOrder.count({
      where: {
        companyId,
        completedAt: { gte: startOfDay, lte: endOfDay },
      },
    });

    // 7. Kasa ve Ciro Matematiksel Hesaplamaları
    const totalCashIncome = woCashIncome + manualCashIn;
    const totalCashExpense = manualCashOut + supplierCashOut;
    const expectedCash = openingCash + totalCashIncome - totalCashExpense;
    const totalRevenue = woCashIncome + woPosIncome + woTransferIncome + manualCashIn;

    // 8. Zaman Tüneli (Günün tüm mali hareketleri)
    const timeline = [];

    // İş emri tahsilatları (Doğrudan iş emirlerinden gelenler)
    for (const wo of workOrdersToday) {
      timeline.push({
        id: `wo-${wo.id}`,
        source: 'WORK_ORDER',
        title: wo.customerName ? `${wo.customerName} (${wo.vehicleInfo || wo.title})` : wo.title,
        subtitle: 'İş Emri Tahsilatı',
        amount: parseFloat(wo.paidAmount || 0),
        type: 'IN',
        paymentMethod: (wo.paymentMethod || 'NAKIT').toUpperCase(),
        time: wo.updatedAt,
        badgeColor: '#10B981',
      });
    }

    // Doğrudan Parçacı ödemeleri
    for (const sp of directSupplierPayments) {
      const method = (sp.paymentMethod || 'NAKIT').toUpperCase();
      const isCash = method === 'NAKIT';
      timeline.push({
        id: `sp-${sp.id}`,
        source: 'SUPPLIER_PAYMENT',
        title: sp.supplier?.name || 'Tedarikçi',
        subtitle: sp.notes ? sp.notes : (isCash ? 'Parçacı Nakit Ödemesi' : `Parçacı Ödemesi (${method})`),
        amount: parseFloat(sp.amount || 0),
        type: 'OUT',
        category: 'TEDARIKCI',
        paymentMethod: method,
        time: sp.createdAt,
        badgeColor: isCash ? '#EF4444' : '#3B82F6',
      });
    }

    // Manuel masraf / harici girişler / iş emri ve tedarikçi tahsilatları
    for (const tx of manualTransactions) {
      const isDevir = tx.category === 'DEVIR_GIRIS';
      const isWoPayment = tx.category === 'IS_EMRI_TAHSILAT';
      const isSupplier = tx.category === 'TEDARIKCI' || tx.category === 'TEDARIKCI_ODEME';
      const isTip = tx.category === 'BAHSIS';
      timeline.push({
        id: `tx-${tx.id}`,
        source: isWoPayment ? 'WORK_ORDER' : isSupplier ? 'SUPPLIER_PAYMENT' : isTip ? 'TIP' : 'MANUAL',
        title: tx.description || (isSupplier ? 'Tedarikçi Ödemesi' : isTip ? 'Bahşiş / Usta İkramiyesi' : tx.category),
        subtitle: isDevir
          ? 'Sabah Açılış Devri'
          : isWoPayment
          ? 'İş Emri Tahsilatı'
          : isSupplier
          ? `Parçacı Ödemesi (${tx.paymentMethod || 'NAKIT'})`
          : isTip
          ? '🎁 Bahşiş / Usta İkramiyesi'
          : tx.type === 'IN'
          ? 'Harici Kasa Girişi'
          : 'Atölye Masrafı',
        amount: parseFloat(tx.amount || 0),
        type: tx.type,
        category: tx.category,
        paymentMethod: tx.paymentMethod || 'NAKIT',
        documentNo: tx.documentNo,
        time: tx.date || tx.createdAt,
        badgeColor: tx.type === 'IN' ? (isTip ? '#059669' : '#10B981') : isSupplier ? '#EF4444' : '#F59E0B',
      });
    }

    // Zamana göre sırala (en yeniden en eskiye)
    timeline.sort((a, b) => new Date(b.time) - new Date(a.time));

    return success(res, {
      date: targetDateStr,
      isClosed: !!existingClose,
      registerClose: existingClose,
      summary: {
        openingCash,
        woCashIncome,
        woPosIncome,
        woTransferIncome,
        tipIncome,
        manualCashIn,
        manualCashOut, // Dükkan masrafları (yemek, kira, harçlık vb.)
        supplierCashOut, // Kasadan nakit çıkan parçacı ödemeleri
        supplierBankOut, // Banka/Havale ile ödenen parçacı ödemeleri
        totalSupplierOut, // Toplam parçacı ödemesi
        totalCashIncome,
        totalCashExpense, // Kasadan çıkan tüm nakit (dükkan masrafı + parçacı nakit)
        expectedCash, // Kasada olması gereken fiziki nakit
        totalRevenue,
        completedOrdersCount,
      },
      timeline,
      manualTransactions,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/cash/transactions
 * Manuel Kasa Hareketi Ekleme (Masraf, Harçlık, Devir, vb.)
 */
exports.addCashTransaction = async (req, res, next) => {
  try {
    const companyId = req.company.id;
    const userId = req.user.id;
    const { type, category, amount, paymentMethod, documentNo, description, date, supplierId } = req.body;

    if (!type || !amount || parseFloat(amount) <= 0) {
      return error(res, 'Geçerli bir işlem türü ve tutar belirtilmelidir.', 400);
    }

    const payAmount = parseFloat(amount);
    let finalDocNo = documentNo ? documentNo.trim() : null;
    let finalDescription = description ? description.trim() : null;

    // Tedarikçi / Parçacı Ödemesi ise tedarikçi cari bakiyesini düş ve SupplierTransaction oluştur
    if (type === 'OUT' && (category === 'TEDARIKCI' || category === 'TEDARIKCI_ODEME') && supplierId) {
      const supplier = await prisma.supplier.findFirst({
        where: { id: supplierId, companyId },
      });
      if (supplier) {
        const [updatedSupplier, supTx] = await prisma.$transaction([
          prisma.supplier.update({
            where: { id: supplierId },
            data: { balance: { decrement: payAmount } },
          }),
          prisma.supplierTransaction.create({
            data: {
              companyId,
              supplierId,
              userId,
              type: 'ODEME',
              amount: payAmount,
              paymentMethod: paymentMethod || 'NAKIT',
              documentNo: finalDocNo,
              notes: finalDescription || `${supplier.name} - Atölye Kasasından Ödeme`,
            },
          }),
        ]);
        finalDocNo = supTx.id;
        if (!finalDescription) {
          finalDescription = `Tedarikçi Ödemesi: ${supplier.name}`;
        }
      }
    }

    const transaction = await prisma.cashTransaction.create({
      data: {
        companyId,
        userId,
        type, // 'IN' | 'OUT'
        category: category || 'DIGER',
        amount: payAmount,
        paymentMethod: paymentMethod || 'NAKIT',
        documentNo: finalDocNo,
        description: finalDescription,
        date: date ? new Date(date) : new Date(),
      },
      include: {
        user: { select: { fullName: true } },
      },
    });

    return success(res, transaction, 'Kasa işlemi başarıyla kaydedildi.', 201);
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/cash/transactions/:id
 * Manuel Kasa Hareketini Silme
 */
exports.deleteCashTransaction = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma.cashTransaction.findFirst({
      where: { id, companyId: req.company.id },
    });
    if (!existing) return error(res, 'Kasa hareketi bulunamadı.', 404);

    await prisma.cashTransaction.delete({ where: { id } });
    return success(res, null, 'Kasa hareketi silindi.');
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/cash/close-day
 * Gün Sonu Kasa Kapatma (Z-Raporu Al)
 */
exports.closeDay = async (req, res, next) => {
  try {
    const companyId = req.company.id;
    const userId = req.user.id;
    const {
      date,
      actualCash,
      transferredToNextDay,
      takenByOwner,
      notes,
    } = req.body;

    const targetDateStr = date || new Date().toISOString().split('T')[0];
    const targetDate = new Date(`${targetDateStr}T12:00:00.000Z`);
    const startOfDay = new Date(`${targetDateStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${targetDateStr}T23:59:59.999Z`);

    // Günü yeniden hesapla
    const previousClose = await prisma.dailyRegisterClose.findFirst({
      where: { companyId, date: { lt: startOfDay } },
      orderBy: { date: 'desc' },
    });
    const openingCash = previousClose ? parseFloat(previousClose.transferredToNextDay || 0) : 0;

    // Manuel işlemler
    const manualTransactions = await prisma.cashTransaction.findMany({
      where: { companyId, date: { gte: startOfDay, lte: endOfDay } },
    });

    let manualCashIn = 0;
    let manualCashOut = 0;
    let manualSupplierCash = 0;
    const recordedOrderIds = new Set();
    const recordedSupplierTxIds = new Set();

    for (const tx of manualTransactions) {
      const amt = parseFloat(tx.amount || 0);
      const method = (tx.paymentMethod || 'NAKIT').toUpperCase();
      if (tx.type === 'IN') {
        if (tx.category === 'IS_EMRI_TAHSILAT' && tx.documentNo) recordedOrderIds.add(tx.documentNo);
        if (tx.category !== 'DEVIR_GIRIS') manualCashIn += amt;
      } else if (tx.type === 'OUT') {
        if (tx.category === 'TEDARIKCI' || tx.category === 'TEDARIKCI_ODEME') {
          if (tx.documentNo) recordedSupplierTxIds.add(tx.documentNo);
          if (method === 'NAKIT') manualSupplierCash += amt;
        } else {
          if (method === 'NAKIT') manualCashOut += amt;
        }
      }
    }

    // İş emirleri (Henüz manual olarak işlenmemişler)
    const workOrdersToday = await prisma.workOrder.findMany({
      where: {
        companyId,
        updatedAt: { gte: startOfDay, lte: endOfDay },
        paidAmount: { gt: 0 },
        ...(recordedOrderIds.size > 0 && { id: { notIn: Array.from(recordedOrderIds) } }),
      },
    });

    let woCash = 0;
    let woPos = 0;
    let woTransfer = 0;
    for (const wo of workOrdersToday) {
      const paid = parseFloat(wo.paidAmount || 0);
      const m = (wo.paymentMethod || 'NAKIT').toUpperCase();
      if (m === 'NAKIT') woCash += paid;
      else if (m === 'KREDI_KARTI' || m === 'POS') woPos += paid;
      else if (m === 'HAVALE' || m === 'EFT') woTransfer += paid;
      else woCash += paid;
    }

    // Doğrudan Parçacı nakit (Henüz manual olarak işlenmemişler)
    const supplierCashPayments = await prisma.supplierTransaction.findMany({
      where: {
        companyId,
        createdAt: { gte: startOfDay, lte: endOfDay },
        type: 'ODEME',
        paymentMethod: 'NAKIT',
        ...(recordedSupplierTxIds.size > 0 && { id: { notIn: Array.from(recordedSupplierTxIds) } }),
      },
    });
    let directSupplierCash = 0;
    for (const sp of supplierCashPayments) directSupplierCash += parseFloat(sp.amount || 0);

    const supplierCash = manualSupplierCash + directSupplierCash;

    const completedOrders = await prisma.workOrder.count({
      where: { companyId, completedAt: { gte: startOfDay, lte: endOfDay } },
    });

    const cashIncome = woCash + manualCashIn;
    const cashExpense = manualCashOut + supplierCash;
    const expectedCash = openingCash + cashIncome - cashExpense;
    const totalRevenue = woCash + woPos + woTransfer + manualCashIn;

    const countActual = actualCash !== undefined ? parseFloat(actualCash) : expectedCash;
    const discrepancy = countActual - expectedCash; // Pozitif: Kasa fazlası, Negatif: Kasa açığı

    const zReport = await prisma.dailyRegisterClose.upsert({
      where: {
        companyId_date: {
          companyId,
          date: targetDate,
        },
      },
      update: {
        userId,
        openingCash,
        cashIncome,
        posIncome: woPos,
        transferIncome: woTransfer,
        cashExpense,
        expectedCash,
        actualCash: countActual,
        discrepancy,
        transferredToNextDay: transferredToNextDay ? parseFloat(transferredToNextDay) : countActual,
        takenByOwner: takenByOwner ? parseFloat(takenByOwner) : 0,
        totalRevenue,
        workOrdersCompleted: completedOrders,
        notes: notes ? notes.trim() : null,
        status: 'CLOSED',
      },
      create: {
        companyId,
        userId,
        date: targetDate,
        openingCash,
        cashIncome,
        posIncome: woPos,
        transferIncome: woTransfer,
        cashExpense,
        expectedCash,
        actualCash: countActual,
        discrepancy,
        transferredToNextDay: transferredToNextDay ? parseFloat(transferredToNextDay) : countActual,
        takenByOwner: takenByOwner ? parseFloat(takenByOwner) : 0,
        totalRevenue,
        workOrdersCompleted: completedOrders,
        notes: notes ? notes.trim() : null,
        status: 'CLOSED',
      },
      include: {
        user: { select: { fullName: true } },
      },
    });

    return success(res, zReport, 'Günün Z-Raporu başarıyla alındı ve kasa kapatıldı.');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/cash/reports
 * Geçmiş Gün Sonu Z-Raporları Listesi
 */
exports.getZReports = async (req, res, next) => {
  try {
    const companyId = req.company.id;
    const { page = 1, limit = 30 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [reports, total] = await Promise.all([
      prisma.dailyRegisterClose.findMany({
        where: { companyId },
        skip,
        take: parseInt(limit),
        orderBy: { date: 'desc' },
        include: {
          user: { select: { fullName: true } },
        },
      }),
      prisma.dailyRegisterClose.count({ where: { companyId } }),
    ]);

    return paginated(res, reports, total, page, limit, 'Z-Raporları listelendi.');
  } catch (err) {
    next(err);
  }
};
