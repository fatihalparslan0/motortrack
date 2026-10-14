const prisma = require('../utils/prisma');
const { success, error, paginated } = require('../utils/apiResponse');
const XLSX = require('xlsx');

// ─── Depo Listesi ─────────────────────────────────────────────────────────────
exports.getWarehouses = async (req, res, next) => {
  try {
    const warehouses = await prisma.warehouse.findMany({
      where: { companyId: req.company.id, isActive: true },
      include: {
        _count: { select: { stocks: true } },
      },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
    return success(res, warehouses, 'Depolar listelendi.');
  } catch (err) {
    next(err);
  }
};

// ─── Depo Oluştur ─────────────────────────────────────────────────────────────
exports.createWarehouse = async (req, res, next) => {
  try {
    const { name, type, address, description, isDefault } = req.body;

    // Eğer varsayılan yapılıyorsa diğerlerini güncelle
    if (isDefault) {
      await prisma.warehouse.updateMany({
        where: { companyId: req.company.id },
        data: { isDefault: false },
      });
    }

    const warehouse = await prisma.warehouse.create({
      data: {
        companyId: req.company.id,
        name,
        type: type || 'MAIN',
        address: address || null,
        description: description || null,
        isDefault: isDefault || false,
      },
    });

    return success(res, warehouse, 'Depo oluşturuldu.', 201);
  } catch (err) {
    next(err);
  }
};

// ─── Depo Güncelle ────────────────────────────────────────────────────────────
exports.updateWarehouse = async (req, res, next) => {
  try {
    const existing = await prisma.warehouse.findFirst({
      where: { id: req.params.id, companyId: req.company.id },
    });
    if (!existing) return error(res, 'Depo bulunamadı.', 404);

    const { name, type, address, description, isDefault, isActive } = req.body;

    if (isDefault) {
      await prisma.warehouse.updateMany({
        where: { companyId: req.company.id, id: { not: req.params.id } },
        data: { isDefault: false },
      });
    }

    const warehouse = await prisma.warehouse.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(type !== undefined && { type }),
        ...(address !== undefined && { address }),
        ...(description !== undefined && { description }),
        ...(isDefault !== undefined && { isDefault }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return success(res, warehouse, 'Depo güncellendi.');
  } catch (err) {
    next(err);
  }
};

// ─── Depo Detayı ve İçindeki Stoklar ─────────────────────────────────────────
exports.getWarehouseDetail = async (req, res, next) => {
  try {
    const { id } = req.params;
    const warehouse = await prisma.warehouse.findFirst({
      where: { id, companyId: req.company.id },
      include: {
        stocks: {
          include: {
            part: {
              select: {
                id: true,
                name: true,
                brand: true,
                category: true,
                sku: true,
                barcode: true,
                oemCode: true,
                partNumber: true,
                unit: true,
                purchasePrice: true,
                sellingPrice: true,
                minQuantity: true,
                quantity: true,
                condition: true,
                warehouseLocation: true,
              },
            },
          },
          orderBy: { updatedAt: 'desc' },
        },
        _count: { select: { stocks: true, partMovements: true } },
      },
    });

    if (!warehouse) return error(res, 'Depo bulunamadı.', 404);

    const isTech = req.user.role === 'TECHNICIAN';
    if (isTech) {
      warehouse.stocks = warehouse.stocks.map(s => ({
        ...s,
        part: { ...s.part, purchasePrice: null },
      }));
    }

    return success(res, warehouse, 'Depo detayları ve stokları getirildi.');
  } catch (err) {
    next(err);
  }
};

// ─── Depo Stok Raf / Göz Konumu Güncelle ─────────────────────────────────────
exports.updateStockShelfLocation = async (req, res, next) => {
  try {
    const { warehouseId, partId, shelfLocation } = req.body;

    const warehouse = await prisma.warehouse.findFirst({
      where: { id: warehouseId, companyId: req.company.id },
    });
    if (!warehouse) return error(res, 'Depo bulunamadı.', 404);

    const part = await prisma.part.findFirst({
      where: { id: partId, companyId: req.company.id },
    });
    if (!part) return error(res, 'Parça bulunamadı.', 404);

    const stock = await prisma.warehouseStock.upsert({
      where: { warehouseId_partId: { warehouseId, partId } },
      update: { shelfLocation: shelfLocation ? shelfLocation.trim() : null },
      create: {
        warehouseId,
        partId,
        quantity: 0,
        shelfLocation: shelfLocation ? shelfLocation.trim() : null,
      },
    });

    return success(res, stock, 'Raf konumu başarıyla güncellendi.');
  } catch (err) {
    next(err);
  }
};


// ─── Depo İstatistikleri ──────────────────────────────────────────────────────
exports.getWarehouseStats = async (req, res, next) => {
  try {
    const companyId = req.company.id;

    const [totalParts, criticalStockCount, recentMovements, warehouses] = await Promise.all([
      prisma.part.count({ where: { companyId, isActive: true } }),
      prisma.$queryRaw`
        SELECT COUNT(*) as count FROM parts
        WHERE "companyId" = ${companyId} 
          AND quantity <= "minQuantity" 
          AND "minQuantity" > 0
          AND "isActive" = true
      `,
      prisma.partMovement.findMany({
        where: { part: { companyId } },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          part: { select: { name: true, unit: true } },
          user: { select: { fullName: true } },
        },
      }),
      prisma.warehouse.count({ where: { companyId, isActive: true } }),
    ]);

    const totalStockQty = await prisma.part.aggregate({
      where: { companyId, isActive: true },
      _sum: { quantity: true },
    });

    return success(res, {
      totalParts,
      totalStockQuantity: totalStockQty._sum.quantity || 0,
      criticalStockCount: parseInt(criticalStockCount[0]?.count || 0),
      totalWarehouses: warehouses,
      recentMovements,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Kritik Stok Listesi ──────────────────────────────────────────────────────
exports.getCriticalStock = async (req, res, next) => {
  try {
    const companyId = req.company.id;
    const parts = await prisma.part.findMany({
      where: {
        companyId,
        isActive: true,
        minQuantity: { gt: 0 },
      },
      include: {
        warehouseStocks: { include: { warehouse: { select: { name: true } } } },
      },
      orderBy: { quantity: 'asc' },
    });

    // JS tarafında filtrele (Prisma'nın field referansı sorunu nedeniyle)
    const criticalParts = parts.filter(p => p.quantity <= p.minQuantity);
    const isTech = req.user.role === 'TECHNICIAN';
    const sanitized = isTech
      ? criticalParts.map(p => ({ ...p, purchasePrice: null }))
      : criticalParts;

    return success(res, sanitized, 'Kritik stok ürünleri');
  } catch (err) {
    next(err);
  }
};

// ─── Depo Sil ────────────────────────────────────────────────────────────────
exports.deleteWarehouse = async (req, res, next) => {
  try {
    const warehouse = await prisma.warehouse.findFirst({
      where: { id: req.params.id, companyId: req.company.id },
      include: { stocks: true },
    });

    if (!warehouse) return error(res, 'Depo bulunamadı.', 404);

    if (warehouse.isDefault) {
      return error(res, 'Ana depo silinemez. Lütfen önce başka bir depoyu ana depo olarak belirleyin.', 400);
    }

    const hasStock = warehouse.stocks.some((s) => s.quantity > 0);
    if (hasStock) {
      return error(
        res,
        'Bu depoda mevcut stok bulunmaktadır. Silmeden önce stokları başka bir depoya transfer ediniz.',
        400
      );
    }

    await prisma.warehouse.delete({ where: { id: req.params.id } });
    return success(res, null, 'Depo başarıyla silindi.');
  } catch (err) {
    next(err);
  }
};

// ─── Yardımcı Format Fonksiyonları ──────────────────────────────────────────
function formatCondition(cond) {
  switch (cond) {
    case 'NEW': return 'Sıfır';
    case 'USED': return 'İkinci El / Çıkma';
    case 'REFURBISHED': return 'Revizyonlu';
    case 'DAMAGED': return 'Hasarlı / Hurda';
    default: return cond || 'Sıfır';
  }
}

function formatWarehouseType(type) {
  switch (type) {
    case 'MAIN': return 'Ana Yedek Parça Deposu';
    case 'WORKSHOP_CONSUMABLES': return 'Atölye Sarfiyat & Yağ Reyonu';
    case 'USED_PARTS': return 'Çıkma & Revizyon Deposu';
    case 'SCRAP': return 'Eski & Hurda Parça';
    case 'OTHER': return 'Diğer / Harici Depo';
    default: return type || 'Depo';
  }
}

function autoFitColumns(aoa, minWidth = 10, maxWidth = 45) {
  if (!aoa || aoa.length === 0) return [];
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
    widths.push({ wch: Math.min(Math.max(maxLen + 3, minWidth), maxWidth) });
  }
  return widths;
}

// ─── Tek Bir Depodaki Malzemeleri Excel (.xlsx / .csv) Olarak İndir ───────────
exports.exportWarehouseExcel = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isTech = req.user.role === 'TECHNICIAN';

    const warehouse = await prisma.warehouse.findFirst({
      where: { id, companyId: req.company.id },
      include: {
        stocks: {
          include: {
            part: true,
          },
          orderBy: [{ shelfLocation: 'asc' }, { updatedAt: 'desc' }],
        },
      },
    });

    if (!warehouse) return error(res, 'Depo bulunamadı.', 404);

    const nowStr = new Date().toLocaleString('tr-TR');
    const companyName = req.company.name || 'MotorTrack Servis';
    const typeLabel = formatWarehouseType(warehouse.type);

    const headers = [
      '#',
      'Malzeme / Parça Adı',
      'Marka',
      'Kategori',
      'Raf / Göz Konumu',
      'Depodaki Miktar',
      'Birim',
      'Stok Kodu (SKU)',
      'Parça No (P/N)',
      'OEM Kodu',
      'Barkod',
      'Durum',
      'Kritik Eşik',
      ...(isTech ? [] : ['Alış Fiyatı (₺)']),
      'Satış Fiyatı (₺)',
      ...(isTech ? [] : ['Toplam Değer (₺)']),
      'Genel Toplam Stok',
    ];

    const aoa = [
      [`${companyName} - ${warehouse.name} Depo Malzeme Listesi`],
      [`Depo Tipi: ${typeLabel}`, `Konum / Adres: ${warehouse.address || '-'}`, `Rapor Tarihi: ${nowStr}`],
      [],
      headers,
    ];

    let totalQty = 0;
    let totalVal = 0;

    warehouse.stocks.forEach((ws, idx) => {
      const p = ws.part;
      const shelf = ws.shelfLocation || p?.warehouseLocation || '-';
      const qty = ws.quantity || 0;
      const pPrice = p?.purchasePrice ? Number(p.purchasePrice) : 0;
      const sPrice = p?.sellingPrice ? Number(p.sellingPrice) : 0;
      const subtotalVal = qty * pPrice;

      totalQty += qty;
      totalVal += subtotalVal;

      const row = [
        idx + 1,
        p?.name || '-',
        p?.brand || '-',
        p?.category || '-',
        shelf,
        qty,
        p?.unit || 'adet',
        p?.sku || '-',
        p?.partNumber || '-',
        p?.oemCode || '-',
        p?.barcode || '-',
        formatCondition(p?.condition),
        p?.minQuantity || 0,
        ...(isTech ? [] : [pPrice > 0 ? pPrice : 0]),
        sPrice > 0 ? sPrice : 0,
        ...(isTech ? [] : [subtotalVal]),
        p?.quantity || 0,
      ];
      aoa.push(row);
    });

    // Alt Toplam Satırı
    aoa.push([]);
    const summaryRow = [
      'TOPLAM',
      `${warehouse.stocks.length} Kalem Malzeme`,
      '',
      '',
      '',
      totalQty,
      'adet',
      '',
      '',
      '',
      '',
      '',
      '',
      ...(isTech ? [] : ['']),
      '',
      ...(isTech ? [] : [totalVal]),
      '',
    ];
    aoa.push(summaryRow);

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = autoFitColumns(aoa);

    const sheetTitle = (warehouse.name || 'Depo').replace(/[*?:/\\\[\]]/g, '').slice(0, 31);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetTitle);

    const filePrefix = warehouse.name.replace(/[^a-zA-Z0-9çÇğĞıİöÖşŞüÜ_-]/g, '_');
    const dateTag = new Date().toISOString().slice(0, 10);

    if (req.query.format === 'csv') {
      const csv = '\uFEFF' + XLSX.utils.sheet_to_csv(ws, { FS: ';' });
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filePrefix)}_Malzemeler_${dateTag}.csv"`);
      return res.send(csv);
    }

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(filePrefix)}_Malzemeler_${dateTag}.xlsx"; filename*=UTF-8''${encodeURIComponent(filePrefix)}_Malzemeler_${dateTag}.xlsx`
    );
    return res.send(buffer);
  } catch (err) {
    next(err);
  }
};

// ─── Tüm Depoların Malzemelerini Tek Excel Kitabında İndir ─────────────────────
exports.exportAllWarehousesExcel = async (req, res, next) => {
  try {
    const isTech = req.user.role === 'TECHNICIAN';
    const companyName = req.company.name || 'MotorTrack Servis';
    const nowStr = new Date().toLocaleString('tr-TR');

    const warehouses = await prisma.warehouse.findMany({
      where: { companyId: req.company.id, isActive: true },
      include: {
        stocks: {
          include: { part: true },
          orderBy: [{ shelfLocation: 'asc' }, { updatedAt: 'desc' }],
        },
      },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });

    const wb = XLSX.utils.book_new();

    // 1. Konsolide Liste (Tüm depolar bir arada)
    const masterHeaders = [
      '#',
      'Depo Adı',
      'Depo Tipi',
      'Raf / Göz Konumu',
      'Malzeme / Parça Adı',
      'Marka',
      'Kategori',
      'Depodaki Miktar',
      'Birim',
      'Stok Kodu (SKU)',
      'Parça No (P/N)',
      'OEM Kodu',
      'Barkod',
      'Durum',
      ...(isTech ? [] : ['Alış Fiyatı (₺)']),
      'Satış Fiyatı (₺)',
      ...(isTech ? [] : ['Toplam Değer (₺)']),
      'Şirket Toplam Stoğu',
    ];

    const masterAoa = [
      [`${companyName} - Tüm Depolar ve Malzeme Envanteri`],
      [`Rapor Tarihi: ${nowStr}`, `Toplam Depo Sayısı: ${warehouses.length}`],
      [],
      masterHeaders,
    ];

    let grandTotalQty = 0;
    let grandTotalVal = 0;
    let rowNumber = 1;

    warehouses.forEach(w => {
      const typeLabel = formatWarehouseType(w.type);
      w.stocks.forEach(ws => {
        const p = ws.part;
        const shelf = ws.shelfLocation || p?.warehouseLocation || '-';
        const qty = ws.quantity || 0;
        const pPrice = p?.purchasePrice ? Number(p.purchasePrice) : 0;
        const sPrice = p?.sellingPrice ? Number(p.sellingPrice) : 0;
        const subtotal = qty * pPrice;

        grandTotalQty += qty;
        grandTotalVal += subtotal;

        masterAoa.push([
          rowNumber++,
          w.name,
          typeLabel,
          shelf,
          p?.name || '-',
          p?.brand || '-',
          p?.category || '-',
          qty,
          p?.unit || 'adet',
          p?.sku || '-',
          p?.partNumber || '-',
          p?.oemCode || '-',
          p?.barcode || '-',
          formatCondition(p?.condition),
          ...(isTech ? [] : [pPrice > 0 ? pPrice : 0]),
          sPrice > 0 ? sPrice : 0,
          ...(isTech ? [] : [subtotal]),
          p?.quantity || 0,
        ]);
      });
    });

    masterAoa.push([]);
    masterAoa.push([
      'GENEL TOPLAM',
      `${warehouses.length} Depo`,
      '',
      '',
      `${rowNumber - 1} Kalem Kayıt`,
      '',
      '',
      grandTotalQty,
      'adet',
      '',
      '',
      '',
      '',
      '',
      ...(isTech ? [] : ['']),
      '',
      ...(isTech ? [] : [grandTotalVal]),
      '',
    ]);

    const masterWs = XLSX.utils.aoa_to_sheet(masterAoa);
    masterWs['!cols'] = autoFitColumns(masterAoa);
    XLSX.utils.book_append_sheet(wb, masterWs, 'Tüm Depolar Envanteri');

    // 2. Her Depo İçin Ayrı Bir Sayfa (Sheet)
    const usedSheetNames = new Set(['Tüm Depolar Envanteri']);
    warehouses.forEach(w => {
      let baseName = (w.name || 'Depo').replace(/[*?:/\\\[\]]/g, '').trim().slice(0, 25);
      let sName = baseName || 'Depo';
      let counter = 1;
      while (usedSheetNames.has(sName)) {
        sName = `${baseName}_${counter++}`.slice(0, 31);
      }
      usedSheetNames.add(sName);

      const singleAoa = [
        [`${companyName} - ${w.name}`],
        [`Depo Tipi: ${formatWarehouseType(w.type)}`, `Konum: ${w.address || '-'}`, `Tarih: ${nowStr}`],
        [],
        [
          '#',
          'Malzeme Adı',
          'Marka',
          'Kategori',
          'Raf Konumu',
          'Miktar',
          'Birim',
          'SKU',
          'P/N',
          'OEM',
          'Barkod',
          'Durum',
          ...(isTech ? [] : ['Alış (₺)']),
          'Satış (₺)',
          ...(isTech ? [] : ['Toplam Değer (₺)']),
          'Genel Stok',
        ],
      ];

      let wQty = 0;
      let wVal = 0;

      w.stocks.forEach((ws, idx) => {
        const p = ws.part;
        const qty = ws.quantity || 0;
        const pPrice = p?.purchasePrice ? Number(p.purchasePrice) : 0;
        const sPrice = p?.sellingPrice ? Number(p.sellingPrice) : 0;
        const subtotal = qty * pPrice;
        wQty += qty;
        wVal += subtotal;

        singleAoa.push([
          idx + 1,
          p?.name || '-',
          p?.brand || '-',
          p?.category || '-',
          ws.shelfLocation || p?.warehouseLocation || '-',
          qty,
          p?.unit || 'adet',
          p?.sku || '-',
          p?.partNumber || '-',
          p?.oemCode || '-',
          p?.barcode || '-',
          formatCondition(p?.condition),
          ...(isTech ? [] : [pPrice]),
          sPrice,
          ...(isTech ? [] : [subtotal]),
          p?.quantity || 0,
        ]);
      });

      singleAoa.push([]);
      singleAoa.push([
        'TOPLAM',
        `${w.stocks.length} Kalem`,
        '',
        '',
        '',
        wQty,
        'adet',
        '',
        '',
        '',
        '',
        '',
        ...(isTech ? [] : ['']),
        '',
        ...(isTech ? [] : [wVal]),
        '',
      ]);

      const singleWs = XLSX.utils.aoa_to_sheet(singleAoa);
      singleWs['!cols'] = autoFitColumns(singleAoa);
      XLSX.utils.book_append_sheet(wb, singleWs, sName);
    });

    const dateTag = new Date().toISOString().slice(0, 10);
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Tum_Depolar_Malzeme_Listesi_${dateTag}.xlsx"; filename*=UTF-8''Tum_Depolar_Malzeme_Listesi_${dateTag}.xlsx`
    );
    return res.send(buffer);
  } catch (err) {
    next(err);
  }
};
