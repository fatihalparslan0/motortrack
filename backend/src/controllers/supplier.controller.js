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
