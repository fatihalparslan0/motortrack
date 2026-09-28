const prisma = require('../utils/prisma');
const { success, error, paginated } = require('../utils/apiResponse');

// ─── Tedarikçi Listesi ────────────────────────────────────────────────────────
exports.getSuppliers = async (req, res, next) => {
  try {
    const { search } = req.query;
    const where = {
      companyId: req.company.id,
      isActive: true,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { contactPerson: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const suppliers = await prisma.supplier.findMany({
      where,
      orderBy: { name: 'asc' },
      include: { _count: { select: { purchaseRecords: true } } },
    });

    return success(res, suppliers, 'Tedarikçiler listelendi.');
  } catch (err) {
    next(err);
  }
};

// ─── Tedarikçi Detayı ─────────────────────────────────────────────────────────
exports.getSupplierById = async (req, res, next) => {
  try {
    const supplier = await prisma.supplier.findFirst({
      where: { id: req.params.id, companyId: req.company.id },
      include: {
        purchaseRecords: {
          orderBy: { purchasedAt: 'desc' },
          take: 10,
          include: { part: { select: { name: true, unit: true } } },
        },
        _count: { select: { purchaseRecords: true } },
      },
    });
    if (!supplier) return error(res, 'Tedarikçi bulunamadı.', 404);
    return success(res, supplier);
  } catch (err) {
    next(err);
  }
};

// ─── Tedarikçi Oluştur ────────────────────────────────────────────────────────
exports.createSupplier = async (req, res, next) => {
  try {
    const { name, contactPerson, phone, email, address, notes } = req.body;
    const supplier = await prisma.supplier.create({
      data: {
        companyId: req.company.id,
        name, contactPerson, phone, email, address, notes,
      },
    });
    return success(res, supplier, 'Tedarikçi oluşturuldu.', 201);
  } catch (err) {
    next(err);
  }
};

// ─── Tedarikçi Güncelle ───────────────────────────────────────────────────────
exports.updateSupplier = async (req, res, next) => {
  try {
    const existing = await prisma.supplier.findFirst({
      where: { id: req.params.id, companyId: req.company.id },
    });
    if (!existing) return error(res, 'Tedarikçi bulunamadı.', 404);

    const { name, contactPerson, phone, email, address, notes, isActive } = req.body;
    const supplier = await prisma.supplier.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(contactPerson !== undefined && { contactPerson }),
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email }),
        ...(address !== undefined && { address }),
        ...(notes !== undefined && { notes }),
        ...(isActive !== undefined && { isActive }),
      },
    });
    return success(res, supplier, 'Tedarikçi güncellendi.');
  } catch (err) {
    next(err);
  }
};

// ─── Tedarikçi Sil (Pasifleştir) ─────────────────────────────────────────────
exports.deleteSupplier = async (req, res, next) => {
  try {
    const existing = await prisma.supplier.findFirst({
      where: { id: req.params.id, companyId: req.company.id },
    });
    if (!existing) return error(res, 'Tedarikçi bulunamadı.', 404);

    await prisma.supplier.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    return success(res, null, 'Tedarikçi pasifleştirildi.');
  } catch (err) {
    next(err);
  }
};

// ─── Tedarikçiye Ödeme Yap (Cari Borçtan Düş) ─────────────────────────────────
exports.recordSupplierPayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount, paymentMethod, documentNo, notes } = req.body;

    const payAmount = parseFloat(amount);
    if (isNaN(payAmount) || payAmount <= 0) {
      return error(res, 'Geçerli bir ödeme tutarı girin.', 400);
    }

    const supplier = await prisma.supplier.findFirst({
      where: { id, companyId: req.company.id },
    });
    if (!supplier) return error(res, 'Tedarikçi bulunamadı.', 404);

    const [updatedSupplier, transaction] = await prisma.$transaction([
      prisma.supplier.update({
        where: { id },
        data: { balance: { decrement: payAmount } },
      }),
      prisma.supplierTransaction.create({
        data: {
          companyId: req.company.id,
          supplierId: id,
          userId: req.user.id,
          type: 'ODEME',
          amount: payAmount,
          paymentMethod: paymentMethod || 'NAKIT',
          documentNo: documentNo || null,
          notes: notes || `${supplier.name} - Ödeme Yapıldı (${paymentMethod || 'NAKIT'})`,
        },
      }),
    ]);

    return success(res, {
      supplier: updatedSupplier,
      transaction,
    }, `₺${payAmount.toLocaleString('tr-TR')} tutarında ödeme kaydedildi. Kalan borç: ₺${parseFloat(updatedSupplier.balance).toLocaleString('tr-TR')}`);
  } catch (err) {
    next(err);
  }
};

// ─── Tedarikçi Cari / Borç Hareketleri ────────────────────────────────────────
exports.getSupplierTransactions = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 100, startDate, endDate, type } = req.query;

    const supplier = await prisma.supplier.findFirst({
      where: { id, companyId: req.company.id },
    });
    if (!supplier) return error(res, 'Tedarikçi bulunamadı.', 404);

    const where = {
      supplierId: id,
      ...(type && type !== 'ALL' && { type }),
      ...((startDate || endDate) && {
        createdAt: {
          ...(startDate && { gte: new Date(startDate) }),
          ...(endDate && { lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)) }),
        },
      }),
    };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [transactions, total, allPeriodItems] = await Promise.all([
      prisma.supplierTransaction.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { fullName: true } } },
      }),
      prisma.supplierTransaction.count({ where }),
      prisma.supplierTransaction.findMany({
        where,
        select: { type: true, amount: true },
      }),
    ]);

    // Dönem bazlı toplamlar
    let totalAlis = 0;
    let totalOdeme = 0;
    let totalIade = 0;

    for (const item of allPeriodItems) {
      const val = parseFloat(item.amount || 0);
      if (item.type === 'ALIS') totalAlis += val;
      else if (item.type === 'ODEME') totalOdeme += val;
      else if (item.type === 'IADE') totalIade += val;
    }

    const netChange = totalAlis - totalOdeme - totalIade;

    return res.status(200).json({
      success: true,
      message: 'Tedarikçi cari hareketleri listelendi.',
      data: transactions,
      periodSummary: {
        totalAlis,
        totalOdeme,
        totalIade,
        netChange,
        currentBalance: parseFloat(supplier.balance || 0),
      },
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Tedarikçi Borç Özeti (Genel Sanayi Carisi) ───────────────────────────────
exports.getSuppliersSummary = async (req, res, next) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      where: { companyId: req.company.id, isActive: true },
      orderBy: { balance: 'desc' },
    });

    const totalDebt = suppliers.reduce((sum, s) => sum + Math.max(0, parseFloat(s.balance || 0)), 0);
    const topDebtors = suppliers.filter(s => parseFloat(s.balance || 0) > 0).slice(0, 5);

    return success(res, {
      totalDebt,
      totalSuppliers: suppliers.length,
      suppliersWithDebtCount: topDebtors.length,
      topDebtors,
    });
  } catch (err) {
    next(err);
  }
};
