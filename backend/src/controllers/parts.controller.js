const prisma = require('../utils/prisma');
const { success, error, paginated } = require('../utils/apiResponse');
const XLSX = require('xlsx');

exports.getParts = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, category, condition, motorId, lowStock, active } = req.query;
    const skip = (page - 1) * limit;

    const where = {
      companyId: req.company.id,
      // Varsayılan olarak aktif ürünleri göster (active=false gelirse pasifler de dahil)
      ...(active !== 'false' && { isActive: true }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { partNumber: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
          { barcode: { contains: search, mode: 'insensitive' } },
          { oemCode: { contains: search, mode: 'insensitive' } },
          { brand: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(category && { category }),
      ...(condition && { condition }),
      ...(motorId && { motorId }),
    };

    let parts, total;

    if (lowStock === 'true') {
      // Kritik stok filtreleme - JS tarafında yap
      const allParts = await prisma.part.findMany({
        where: { ...where, minQuantity: { gt: 0 } },
        include: {
          motor: { select: { id: true, brand: true, model: true, serialNumber: true } },
        },
        orderBy: { name: 'asc' },
      });
      parts = allParts.filter(p => p.quantity <= p.minQuantity);
      total = parts.length;
      parts = parts.slice(skip, skip + parseInt(limit));
    } else {
      [parts, total] = await Promise.all([
        prisma.part.findMany({
          where,
          skip: parseInt(skip),
          take: parseInt(limit),
          orderBy: { name: 'asc' },
          include: {
            motor: { select: { id: true, brand: true, model: true, serialNumber: true } },
            warehouseStocks: { include: { warehouse: { select: { name: true } } } },
          },
        }),
        prisma.part.count({ where }),
      ]);
    }

    const isTech = req.user.role === 'TECHNICIAN';
    const sanitized = isTech ? parts.map(p => ({ ...p, purchasePrice: null })) : parts;
    return paginated(res, sanitized, total, page, limit, 'Parçalar listelendi.');
  } catch (err) {
    next(err);
  }
};

exports.getLowStockParts = async (req, res, next) => {
  try {
    // quantity <= minQuantity olan parçalar
    const parts = await prisma.$queryRaw`
      SELECT p.*, m.brand as motor_brand, m.model as motor_model
      FROM parts p
      LEFT JOIN motors m ON p."motorId" = m.id
      WHERE p."companyId" = ${req.company.id}
        AND p.quantity <= p."minQuantity"
        AND p."minQuantity" > 0
      ORDER BY (p.quantity - p."minQuantity") ASC
      LIMIT 50
    `;

    const isTech = req.user.role === 'TECHNICIAN';
    const sanitized = isTech ? parts.map(p => ({ ...p, purchasePrice: null })) : parts;
    return success(res, sanitized, 'Düşük stok parçaları');
  } catch (err) {
    next(err);
  }
};

exports.getPartsStats = async (req, res, next) => {
  try {
    const companyId = req.company.id;
    const isTech = req.user.role === 'TECHNICIAN';

    const [totalParts, totalValue, lowStockCount, categories] = await Promise.all([
      prisma.part.count({ where: { companyId } }),
      prisma.part.aggregate({
        where: { companyId },
        _sum: { purchasePrice: true },
      }),
      prisma.$queryRaw`
        SELECT COUNT(*) as count FROM parts
        WHERE "companyId" = ${companyId} AND quantity <= "minQuantity" AND "minQuantity" > 0
      `,
      prisma.part.groupBy({
        by: ['category'],
        where: { companyId },
        _count: { id: true },
      }),
    ]);

    return success(res, {
      totalParts,
      totalValue: isTech ? null : totalValue._sum.purchasePrice,
      lowStockCount: parseInt(lowStockCount[0]?.count || 0),
      categories,
    });
  } catch (err) {
    next(err);
  }
};

exports.getPartById = async (req, res, next) => {
  try {
    const part = await prisma.part.findFirst({
      where: { id: req.params.id, companyId: req.company.id },
      include: {
        motor: { select: { id: true, brand: true, model: true, serialNumber: true } },
        movements: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { user: { select: { fullName: true } } },
        },
        warehouseStocks: { include: { warehouse: { select: { name: true } } } },
      },
    });

    if (!part) return error(res, 'Parça bulunamadı.', 404);
    const isTech = req.user.role === 'TECHNICIAN';
    const sanitized = isTech ? { ...part, purchasePrice: null } : part;
    return success(res, sanitized);
  } catch (err) {
    next(err);
  }
};

exports.getPartMovements = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const part = await prisma.part.findFirst({
      where: { id: req.params.id, companyId: req.company.id },
    });
    if (!part) return error(res, 'Parça bulunamadı.', 404);

    const [movements, total] = await Promise.all([
      prisma.partMovement.findMany({
        where: { partId: req.params.id },
        skip: (page - 1) * limit,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { fullName: true } },
          motor: { select: { brand: true, model: true, serialNumber: true } },
        },
      }),
      prisma.partMovement.count({ where: { partId: req.params.id } }),
    ]);

    return paginated(res, movements, total, page, limit);
  } catch (err) {
    next(err);
  }
};

exports.createPart = async (req, res, next) => {
  try {
    const {
      motorId, partNumber, sku, barcode, oemCode,
      name, brand, category, quantity,
      unit, minQuantity, maxQuantity, purchasePrice, sellingPrice,
      warehouseLocation, condition, notes,
    } = req.body;

    // Motor varsa şirkete ait mi kontrol et
    if (motorId) {
      const motor = await prisma.motor.findFirst({
        where: { id: motorId, companyId: req.company.id },
      });
      if (!motor) return error(res, 'Motor bulunamadı.', 404);
    }

    const isTech = req.user.role === 'TECHNICIAN';

    const part = await prisma.part.create({
      data: {
        companyId: req.company.id,
        motorId: motorId || null,
        partNumber, sku, barcode, oemCode,
        name, brand, category,
        quantity: parseInt(quantity) || 0,
        unit: unit || 'adet',
        minQuantity: parseInt(minQuantity) || 0,
        maxQuantity: maxQuantity ? parseInt(maxQuantity) : null,
        purchasePrice: (!isTech && purchasePrice) ? parseFloat(purchasePrice) : null,
        sellingPrice: sellingPrice ? parseFloat(sellingPrice) : null,
        warehouseLocation, condition: condition || 'NEW', notes,
        isActive: true,
      },
    });

    // Başlangıç stok hareketi kaydet ve depo stokunu güncelle
    if (parseInt(quantity) > 0) {
      const warehouse = req.body.warehouseId
        ? await prisma.warehouse.findFirst({ where: { id: req.body.warehouseId, companyId: req.company.id } })
        : await prisma.warehouse.findFirst({ where: { isDefault: true, companyId: req.company.id } });
      const wId = warehouse?.id;

      await prisma.$transaction([
        prisma.partMovement.create({
          data: {
            partId: part.id,
            warehouseId: wId,
            userId: req.user.id,
            movementType: 'IN',
            quantity: parseInt(quantity),
            notes: 'İlk stok girişi',
          },
        }),
        ...(wId ? [
          prisma.warehouseStock.upsert({
            where: { warehouseId_partId: { warehouseId: wId, partId: part.id } },
            update: { quantity: { increment: parseInt(quantity) } },
            create: { warehouseId: wId, partId: part.id, quantity: parseInt(quantity) }
          })
        ] : [])
      ]);
    }

    const sanitizedPart = isTech ? { ...part, purchasePrice: null } : part;
    return success(res, sanitizedPart, 'Parça başarıyla oluşturuldu.', 201);
  } catch (err) {
    next(err);
  }
};

exports.updatePart = async (req, res, next) => {
  try {
    const existing = await prisma.part.findFirst({
      where: { id: req.params.id, companyId: req.company.id },
    });
    if (!existing) return error(res, 'Parça bulunamadı.', 404);

    const isTech = req.user.role === 'TECHNICIAN';

    const {
      motorId, partNumber, sku, barcode, oemCode,
      name, brand, category, quantity,
      unit, minQuantity, maxQuantity, purchasePrice, sellingPrice,
      warehouseLocation, condition, notes, isActive,
    } = req.body;

    const part = await prisma.part.update({
      where: { id: req.params.id },
      data: {
        motorId: motorId !== undefined ? motorId || null : undefined,
        partNumber: partNumber !== undefined ? partNumber : undefined,
        sku: sku !== undefined ? sku : undefined,
        barcode: barcode !== undefined ? barcode : undefined,
        oemCode: oemCode !== undefined ? oemCode : undefined,
        name: name !== undefined ? name : undefined,
        brand: brand !== undefined ? brand : undefined,
        category: category !== undefined ? category : undefined,
        quantity: quantity !== undefined ? parseInt(quantity) : undefined,
        unit: unit !== undefined ? unit : undefined,
        minQuantity: minQuantity !== undefined ? parseInt(minQuantity) : undefined,
        maxQuantity: maxQuantity !== undefined ? (maxQuantity ? parseInt(maxQuantity) : null) : undefined,
        purchasePrice: (!isTech && purchasePrice !== undefined) ? (purchasePrice ? parseFloat(purchasePrice) : null) : undefined,
        sellingPrice: sellingPrice !== undefined ? (sellingPrice ? parseFloat(sellingPrice) : null) : undefined,
        warehouseLocation: warehouseLocation !== undefined ? warehouseLocation : undefined,
        condition: condition !== undefined ? condition : undefined,
        notes: notes !== undefined ? notes : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
      },
    });

    const sanitizedPart = isTech ? { ...part, purchasePrice: null } : part;
    return success(res, sanitizedPart, 'Parça güncellendi.');
  } catch (err) {
    next(err);
  }
};

exports.deletePart = async (req, res, next) => {
  try {
    const existing = await prisma.part.findFirst({
      where: { id: req.params.id, companyId: req.company.id },
    });
    if (!existing) return error(res, 'Parça bulunamadı.', 404);
    // Silmek yerine pasifleştir (stok geçmişi korunsun)
    await prisma.part.update({ 
      where: { id: req.params.id },
      data: { isActive: false },
    });
    return success(res, null, 'Parça pasifleştirildi.');
  } catch (err) {
    next(err);
  }
};

exports.addMovement = async (req, res, next) => {
  try {
    const { movementType, quantity, motorId, warehouseId, notes, unitCost, referenceType, referenceId } = req.body;

    const part = await prisma.part.findFirst({
      where: { id: req.params.id, companyId: req.company.id },
    });
    if (!part) return error(res, 'Parça bulunamadı.', 404);

    const qty = parseInt(quantity);

    // Çıkış türleri (Tedarikçiye iade durumunda parça dükkandan çıktığı için stok düşer)
    const isSupplierReturn = referenceType === 'SUPPLIER_RETURN';
    const outTypes = ['OUT', 'TRANSFER', 'IS_EMRI_KULLANIMI', 'SATIS', 'FIRE'];
    if (isSupplierReturn) {
      outTypes.push('IADE');
      outTypes.push('RETURN');
    }
    const inTypes = ['IN', 'SATIN_ALMA'];

    if (outTypes.includes(movementType)) {
      const available = part.quantity - part.reservedQuantity;
      if (available < qty) {
        return error(
          res,
          `Yetersiz kullanılabilir stok. Kullanılabilir: ${available} ${part.unit} (Toplam: ${part.quantity}, Rezerve: ${part.reservedQuantity})`,
          400
        );
      }
    }

    // Stok değişiklik miktarı hesapla
    const isOut = outTypes.includes(movementType);
    const quantityChange = isOut ? -qty : qty;

    const warehouse = warehouseId 
      ? await prisma.warehouse.findFirst({ where: { id: warehouseId, companyId: req.company.id } }) 
      : await prisma.warehouse.findFirst({ where: { isDefault: true, companyId: req.company.id } });
    const wId = warehouse?.id;

    await prisma.$transaction([
      prisma.part.update({
        where: { id: part.id },
        data: { quantity: { increment: quantityChange } },
      }),
      prisma.partMovement.create({
        data: {
          partId: part.id,
          warehouseId: wId,
          userId: req.user.id,
          motorId: motorId || null,
          movementType,
          quantity: qty,
          unitCost: unitCost ? parseFloat(unitCost) : null,
          referenceType: referenceType || null,
          referenceId: referenceId || null,
          notes,
        },
      }),
      ...(wId ? [
        prisma.warehouseStock.upsert({
          where: { warehouseId_partId: { warehouseId: wId, partId: part.id } },
          update: { quantity: { increment: quantityChange } },
          create: { warehouseId: wId, partId: part.id, quantity: Math.max(0, quantityChange) },
        })
      ] : [])
    ]);

    const updatedPart = await prisma.part.findUnique({ 
      where: { id: part.id },
      include: {
        warehouseStocks: { include: { warehouse: { select: { name: true } } } },
      }
    });
    return success(res, updatedPart, 'Stok hareketi kaydedildi.');
  } catch (err) {
    next(err);
  }
};

// ─── Tüm Parça Envanterini Excel Olarak İndir ─────────────────────────────────
exports.exportPartsExcel = async (req, res, next) => {
  try {
    const isTech = req.user.role === 'TECHNICIAN';
    const companyName = req.company.name || 'MotorTrack Servis';
    const nowStr = new Date().toLocaleString('tr-TR');
    const { search, category, lowStock } = req.query;

    const where = {
      companyId: req.company.id,
      isActive: true,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { partNumber: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
          { barcode: { contains: search, mode: 'insensitive' } },
          { oemCode: { contains: search, mode: 'insensitive' } },
          { brand: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(category && category !== 'Tümü' && { category }),
    };

    let parts = await prisma.part.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        warehouseStocks: {
          include: { warehouse: { select: { name: true, type: true } } },
        },
      },
    });

    if (lowStock === 'true') {
      parts = parts.filter(p => p.quantity <= p.minQuantity && p.minQuantity > 0);
    }

    const headers = [
      '#',
      'Malzeme / Parça Adı',
      'Marka',
      'Kategori',
      'Toplam Stok',
      'Birim',
      'Depo Dağılımı (Depo: Miktar)',
      'Stok Kodu (SKU)',
      'Parça No (P/N)',
      'OEM Kodu',
      'Barkod',
      'Durum',
      'Kritik Eşik',
      ...(isTech ? [] : ['Birim Alış (₺)']),
      'Birim Satış (₺)',
      ...(isTech ? [] : ['Toplam Stok Değeri (₺)']),
    ];

    const aoa = [
      [`${companyName} - Parça & Malzeme Envanteri`],
      [`Rapor Tarihi: ${nowStr}`, `Toplam Kalem: ${parts.length}`, category ? `Kategori: ${category}` : 'Tüm Kategoriler'],
      [],
      headers,
    ];

    let grandQty = 0;
    let grandVal = 0;

    parts.forEach((p, idx) => {
      const qty = p.quantity || 0;
      const pPrice = p.purchasePrice ? Number(p.purchasePrice) : 0;
      const sPrice = p.sellingPrice ? Number(p.sellingPrice) : 0;
      const subtotal = qty * pPrice;

      grandQty += qty;
      grandVal += subtotal;

      const warehouseBreakdown = (p.warehouseStocks || [])
        .filter(ws => ws.quantity > 0)
        .map(ws => `${ws.warehouse?.name || 'Depo'}: ${ws.quantity} ${p.unit || 'ad.'}${ws.shelfLocation ? ' (Raf: ' + ws.shelfLocation + ')' : ''}`)
        .join('; ') || '-';

      const row = [
        idx + 1,
        p.name || '-',
        p.brand || '-',
        p.category || '-',
        qty,
        p.unit || 'adet',
        warehouseBreakdown,
        p.sku || '-',
        p.partNumber || '-',
        p.oemCode || '-',
        p.barcode || '-',
        p.condition === 'NEW' ? 'Sıfır' : (p.condition === 'USED' ? 'Çıkma / 2. El' : (p.condition || 'Sıfır')),
        p.minQuantity || 0,
        ...(isTech ? [] : [pPrice > 0 ? pPrice : 0]),
        sPrice > 0 ? sPrice : 0,
        ...(isTech ? [] : [subtotal]),
      ];
      aoa.push(row);
    });

    aoa.push([]);
    aoa.push([
      'TOPLAM',
      `${parts.length} Kalem Malzeme`,
      '',
      '',
      grandQty,
      'adet',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      ...(isTech ? [] : ['']),
      '',
      ...(isTech ? [] : [grandVal]),
    ]);

    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Auto-fit column widths
    const colCount = Math.max(...aoa.map(row => (row ? row.length : 0)));
    const widths = [];
    for (let c = 0; c < colCount; c++) {
      let maxLen = 0;
      for (let r = 0; r < aoa.length; r++) {
        const cell = aoa[r] ? aoa[r][c] : null;
        if (cell != null) {
          const str = String(cell);
          if (str.length > maxLen) maxLen = str.length;
        }
      }
      widths.push({ wch: Math.min(Math.max(maxLen + 3, 10), 45) });
    }
    ws['!cols'] = widths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Parça Envanteri');

    const dateTag = new Date().toISOString().slice(0, 10);

    if (req.query.format === 'csv') {
      const csv = '\uFEFF' + XLSX.utils.sheet_to_csv(ws, { FS: ';' });
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="Parca_Malzeme_Envanteri_${dateTag}.csv"`);
      return res.send(csv);
    }

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Parca_Malzeme_Envanteri_${dateTag}.xlsx"; filename*=UTF-8''Parca_Malzeme_Envanteri_${dateTag}.xlsx`
    );
    return res.send(buffer);
  } catch (err) {
    next(err);
  }
};
