const prisma = require('../utils/prisma');
const { success, error, paginated } = require('../utils/apiResponse');

// ─── İş Emirleri Listesi ──────────────────────────────────────────────────────
exports.getWorkOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, search, paymentStatus, myOrders, userId } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      companyId: req.company.id,
      ...(status && { status }),
      ...(paymentStatus && { paymentStatus }),
      ...(myOrders === 'true' && { userId: req.user.id }),
      ...(userId && { userId }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { customerName: { contains: search, mode: 'insensitive' } },
          { vehicleInfo: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [orders, total] = await Promise.all([
      prisma.workOrder.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, fullName: true, role: true } },
          _count: { select: { items: true } },
          items: {
            include: {
              part: { select: { name: true, unit: true } },
            },
          },
        },
      }),
      prisma.workOrder.count({ where }),
    ]);

    // Her iş emrine maliyet ve ödeme hesapla
    const ordersWithCosts = orders.map(order => {
      const isCancelled = order.status === 'IPTAL';

      const partsSaleTotal = isCancelled ? 0 : order.items.reduce((sum, item) => {
        if (item.status !== 'IPTAL') {
          return sum + (parseFloat(item.unitPrice) * item.quantity);
        }
        return sum;
      }, 0);

      const partsCostTotal = isCancelled ? 0 : order.items.reduce((sum, item) => {
        if (item.status !== 'IPTAL' && item.unitCost) {
          return sum + (parseFloat(item.unitCost) * item.quantity);
        }
        return sum;
      }, 0);

      const labor = isCancelled ? 0 : parseFloat(order.laborCost || 0);
      const totalAmount = partsSaleTotal + labor;
      const paid = parseFloat(order.paidAmount || 0);
      const remainingAmount = isCancelled ? 0 : Math.max(0, totalAmount - paid);

      return {
        ...order,
        partsSaleTotal,
        partsCostTotal,
        partsProfit: partsSaleTotal - partsCostTotal,
        laborCost: labor,
        totalAmount,
        paidAmount: paid,
        remainingAmount,
      };
    });

    return paginated(res, ordersWithCosts, total, page, limit, 'İş emirleri listelendi.');
  } catch (err) {
    next(err);
  }
};

// ─── İş Emri Detayı ───────────────────────────────────────────────────────────
exports.getWorkOrderById = async (req, res, next) => {
  try {
    const order = await prisma.workOrder.findFirst({
      where: { id: req.params.id, companyId: req.company.id },
      include: {
        user: { select: { fullName: true, avatarUrl: true } },
        items: {
          include: {
            part: {
              select: {
                id: true, name: true, unit: true, quantity: true,
                reservedQuantity: true, purchasePrice: true, sellingPrice: true,
                warehouseLocation: true, partNumber: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!order) return error(res, 'İş emri bulunamadı.', 404);

    const partsSaleTotal = order.items.reduce((sum, item) => {
      if (item.status !== 'IPTAL') {
        return sum + (parseFloat(item.unitPrice) * item.quantity);
      }
      return sum;
    }, 0);

    const partsCostTotal = order.items.reduce((sum, item) => {
      if (item.status !== 'IPTAL' && item.unitCost) {
        return sum + (parseFloat(item.unitCost) * item.quantity);
      }
      return sum;
    }, 0);

    const labor = parseFloat(order.laborCost || 0);
    const totalAmount = partsSaleTotal + labor;
    const paid = parseFloat(order.paidAmount || 0);
    const remainingAmount = Math.max(0, totalAmount - paid);

    const isTech = req.user.role === 'TECHNICIAN';

    // Bahşiş / Usta İkramiyesi toplamını kasadan çek
    const tipTransactions = await prisma.cashTransaction.findMany({
      where: {
        companyId: req.company.id,
        category: 'BAHSIS',
        documentNo: order.id,
      },
      select: {
        id: true,
        amount: true,
        paymentMethod: true,
        description: true,
        createdAt: true,
      },
    });

    let dbTipSum = tipTransactions.reduce((sum, tx) => sum + parseFloat(tx.amount || 0), 0);
    if (dbTipSum === 0 && order.paymentNotes) {
      const match = order.paymentNotes.match(/\[₺([0-9.,]+)\s*Bahşiş\/İkramiye\]/i);
      if (match && match[1]) {
        const parsed = parseFloat(match[1].replace(/\./g, '').replace(',', '.'));
        if (!isNaN(parsed)) dbTipSum = parsed;
      }
    }

    // Teknisyen için maliyet ve kâr bilgilerini gizle
    const sanitizedItems = order.items.map((item) => {
      if (!isTech) return item;
      const { unitCost, ...restItem } = item;
      if (restItem.part) {
        const { purchasePrice, ...restPart } = restItem.part;
        restItem.part = restPart;
      }
      return restItem;
    });

    return success(res, {
      ...order,
      items: sanitizedItems,
      partsSaleTotal,
      partsCostTotal: isTech ? undefined : partsCostTotal,
      partsProfit: isTech ? undefined : (partsSaleTotal - partsCostTotal),
      laborCost: labor,
      totalAmount,
      paidAmount: paid,
      remainingAmount,
      tipAmount: dbTipSum,
      tipTransactions,
    });
  } catch (err) {
    next(err);
  }
};

// ─── İş Emri Oluştur ──────────────────────────────────────────────────────────
exports.createWorkOrder = async (req, res, next) => {
  try {
    const { title, description, customerName, customerPhone, vehicleInfo, laborCost, notes, paymentStatus, paidAmount, paymentMethod, paymentNotes } = req.body;

    const order = await prisma.workOrder.create({
      data: {
        companyId: req.company.id,
        userId: req.user.id,
        title, description, customerName, customerPhone, vehicleInfo,
        laborCost: laborCost ? parseFloat(laborCost) : null,
        notes,
        status: 'ACIK',
        paymentStatus: paymentStatus || 'BEKLIYOR',
        paidAmount: paidAmount ? parseFloat(paidAmount) : 0,
        paymentMethod: paymentMethod || null,
        paymentNotes: paymentNotes || null,
      },
      include: {
        user: { select: { fullName: true } },
        items: true,
      },
    });

    return success(res, order, 'İş emri oluşturuldu.', 201);
  } catch (err) {
    next(err);
  }
};

// ─── İş Emri Güncelle ─────────────────────────────────────────────────────────
exports.updateWorkOrder = async (req, res, next) => {
  try {
    const existing = await prisma.workOrder.findFirst({
      where: { id: req.params.id, companyId: req.company.id },
      include: { items: true },
    });
    if (!existing) return error(res, 'İş emri bulunamadı.', 404);

    const { title, description, customerName, customerPhone, vehicleInfo, 
            laborCost, notes, status, startedAt, completedAt,
            paymentStatus, paidAmount, paymentMethod, paymentNotes,
            beforeImages, afterImages } = req.body;

    const isTech = req.user.role === 'TECHNICIAN';

    // 1. TEKNİSYEN ROL KISITLAMALARI
    if (isTech) {
      if (laborCost !== undefined || paidAmount !== undefined || paymentStatus !== undefined || paymentMethod !== undefined || paymentNotes !== undefined) {
        return error(res, 'Teknisyenlerin ödeme, tahsilat ve işçilik tutarını düzenleme yetkisi bulunmamaktadır.', 403);
      }
      if (status === 'IPTAL') {
        return error(res, 'Teknisyenlerin iş emrini iptal etme yetkisi bulunmamaktadır. İptal işlemi için yöneticiye danışınız.', 403);
      }
      // Teknisyen sadece ACIK, DEVAM_EDIYOR veya TAMAMLANDI durumlarına geçiş yapabilir
      if (status !== undefined && !['ACIK', 'DEVAM_EDIYOR', 'TAMAMLANDI'].includes(status)) {
        return error(res, 'Geçersiz durum geçişi.', 400);
      }
    }

    // 2. İPTAL DURUMUNDAKİ İŞ EMRİ KONTROLÜ
    if (existing.status === 'IPTAL') {
      // İptal edilmiş iş emri üzerinde yalnızca Admin/Yönetici durumu ACIK yaparak işi yeniden açabilir
      if (status !== 'ACIK') {
        return error(res, 'İptal edilmiş bir iş emri üzerinde işlem veya tahsilat yapılamaz. Değişiklik yapmak için önce iş emrini yeniden açınız.', 400);
      }
      if (isTech) {
        return error(res, 'İptal edilmiş bir iş emrini yalnızca Yönetici veya Admin yeniden açabilir.', 403);
      }
    }

    // 3. İŞ EMRİNİ İPTAL DURUMUNA ALMA GÜVENLİK KURALLARI
    let targetPaymentStatus = paymentStatus;
    if (status === 'IPTAL' && existing.status !== 'IPTAL') {
      // Tahsilat kontrolü: Tahsilat yapılmış iş emri doğrudan iptal edilemez!
      const currentPaid = parseFloat(existing.paidAmount || 0);
      if (currentPaid > 0) {
        return error(
          res,
          `Bu iş emrinde ₺${currentPaid.toLocaleString('tr-TR')} tutarında tahsilat mevcuttur. Tahsilatı bulunan iş emri iptal edilemez. Önce kasa kaydını iade ediniz veya sıfırlayınız.`,
          400
        );
      }

      // Parçaların depoya iadesi ve rezervasyonların çözülmesi
      const defW = await prisma.warehouse.findFirst({
        where: { isDefault: true, companyId: req.company.id },
      });

      await prisma.$transaction(async (tx) => {
        for (const item of existing.items) {
          if (item.status === 'REZERVE') {
            // Rezerve stoku çöz
            await tx.part.update({
              where: { id: item.partId },
              data: { reservedQuantity: { decrement: item.quantity } },
            });
          } else if (item.status === 'KULLANILDI') {
            // Araçtan sökülen / montajı iptal edilen parçayı depoya fiziki olarak geri iade et
            const wId = item.warehouseId || defW?.id;
            await tx.part.update({
              where: { id: item.partId },
              data: { quantity: { increment: item.quantity } },
            });
            await tx.partMovement.create({
              data: {
                partId: item.partId,
                warehouseId: wId || null,
                userId: req.user.id,
                movementType: 'IADE',
                quantity: item.quantity,
                referenceType: 'WORK_ORDER',
                referenceId: existing.id,
                notes: `İş Emri İptali — Parça iadesi: ${existing.title}`,
              },
            });
            if (wId) {
              await tx.warehouseStock.upsert({
                where: { warehouseId_partId: { warehouseId: wId, partId: item.partId } },
                update: { quantity: { increment: item.quantity } },
                create: { warehouseId: wId, partId: item.partId, quantity: item.quantity },
              });
            }
          }
        }

        // Tüm iş emri kalemlerini IPTAL olarak işaretle
        await tx.workOrderItem.updateMany({
          where: { workOrderId: req.params.id },
          data: { status: 'IPTAL' },
        });
      });

      targetPaymentStatus = 'IPTAL';
    }

    // 4. İŞİ BAŞLATMA / GERİ ALMA / TAMAMLAMA ZAMAN DAMGALARI & OTOMATİK STOK DÜŞÜŞÜ
    let finalStartedAt = startedAt !== undefined ? (startedAt ? new Date(startedAt) : null) : existing.startedAt;
    let finalCompletedAt = completedAt !== undefined ? (completedAt ? new Date(completedAt) : null) : existing.completedAt;
    let finalUserId = undefined;

    if (!isTech && req.body.userId !== undefined) {
      finalUserId = req.body.userId;
    }

    if (status === 'DEVAM_EDIYOR') {
      if (!existing.startedAt && startedAt === undefined) {
        finalStartedAt = new Date(); // İşe başlama saati
      }
      finalCompletedAt = null; // Devam ediyorsa tamamlanma tarihi sıfır
      // Eğer iş emrini bir teknisyen başlatıyorsa, iş emrini bu teknisyene zimmetle
      if (isTech) {
        finalUserId = req.user.id;
      }
    } else if (status === 'ACIK') {
      // İşi geri alma / beklemeye alma
      finalCompletedAt = null;
    } else if (status === 'TAMAMLANDI' && existing.status !== 'TAMAMLANDI') {
      finalCompletedAt = new Date();

      // İş tamamlandığında henüz BEKLIYOR veya REZERVE olan parçaları otomatik KULLANILDI yap ve depodan düş
      const pendingOrReserved = existing.items.filter(
        (i) => i.status === 'BEKLIYOR' || i.status === 'REZERVE'
      );

      if (pendingOrReserved.length > 0) {
        const defW = await prisma.warehouse.findFirst({
          where: { isDefault: true, companyId: req.company.id },
        });

        await prisma.$transaction(async (tx) => {
          for (const item of pendingOrReserved) {
            const part = await tx.part.findUnique({ where: { id: item.partId } });
            if (!part) continue;

            const wId = item.warehouseId || defW?.id;

            if (item.status === 'REZERVE') {
              await tx.part.update({
                where: { id: part.id },
                data: {
                  quantity: { decrement: item.quantity },
                  reservedQuantity: { decrement: item.quantity },
                },
              });
            } else {
              // BEKLIYOR
              await tx.part.update({
                where: { id: part.id },
                data: {
                  quantity: { decrement: item.quantity },
                },
              });
            }

            await tx.workOrderItem.update({
              where: { id: item.id },
              data: { status: 'KULLANILDI' },
            });

            await tx.partMovement.create({
              data: {
                partId: part.id,
                warehouseId: wId || null,
                userId: req.user.id,
                movementType: 'IS_EMRI_KULLANIMI',
                quantity: item.quantity,
                unitCost: item.unitCost || (part.purchasePrice ? parseFloat(part.purchasePrice) : null),
                referenceType: 'WORK_ORDER',
                referenceId: existing.id,
                notes: `İş Emri Tamamlandı — Otomatik Kullanım: ${existing.title}`,
              },
            });

            if (wId) {
              await tx.warehouseStock.upsert({
                where: { warehouseId_partId: { warehouseId: wId, partId: part.id } },
                update: { quantity: { decrement: item.quantity } },
                create: { warehouseId: wId, partId: part.id, quantity: 0 },
              });
            }
          }
        });
      }
    }

    const order = await prisma.workOrder.update({
      where: { id: req.params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(customerName !== undefined && { customerName }),
        ...(customerPhone !== undefined && { customerPhone }),
        ...(vehicleInfo !== undefined && { vehicleInfo }),
        ...(laborCost !== undefined && { laborCost: laborCost ? parseFloat(laborCost) : null }),
        ...(notes !== undefined && { notes }),
        ...(status !== undefined && { status }),
        startedAt: finalStartedAt,
        completedAt: finalCompletedAt,
        ...(finalUserId && { userId: finalUserId }),
        ...(targetPaymentStatus !== undefined && { paymentStatus: targetPaymentStatus }),
        ...(paidAmount !== undefined && { paidAmount: parseFloat(paidAmount || 0) }),
        ...(paymentMethod !== undefined && { paymentMethod }),
        ...(paymentNotes !== undefined && { paymentNotes }),
        ...(beforeImages !== undefined && { beforeImages }),
        ...(afterImages !== undefined && { afterImages }),
      },
    });

    if (paidAmount !== undefined && !isTech) {
      const prevPaid = parseFloat(existing.paidAmount || 0);
      const newPaid = parseFloat(paidAmount || 0);
      const diff = newPaid - prevPaid;
      if (diff > 0) {
        try {
          await prisma.cashTransaction.create({
            data: {
              companyId: req.company.id,
              userId: req.user.id,
              type: 'IN',
              category: 'IS_EMRI_TAHSILAT',
              amount: diff,
              paymentMethod: paymentMethod || existing.paymentMethod || 'NAKIT',
              documentNo: existing.id,
              description: `İş Emri Tahsilatı: ${existing.customerName ? existing.customerName + ' - ' : ''}${existing.title}`,
              date: new Date(),
            },
          });
        } catch (cashErr) {
          console.error('Kasa kaydı oluşturulurken hata:', cashErr);
        }
      }
    }

    return success(res, order, 'İş emri güncellendi.');
  } catch (err) {
    next(err);
  }
};

// ─── İş Emri Sil ─────────────────────────────────────────────────────────────
exports.deleteWorkOrder = async (req, res, next) => {
  try {
    const existing = await prisma.workOrder.findFirst({
      where: { id: req.params.id, companyId: req.company.id },
      include: { items: { where: { status: 'REZERVE' } } },
    });
    if (!existing) return error(res, 'İş emri bulunamadı.', 404);

    // Rezerve stokları serbest bırak
    if (existing.items.length > 0) {
      await prisma.$transaction(
        existing.items.map(item =>
          prisma.part.update({
            where: { id: item.partId },
            data: { reservedQuantity: { decrement: item.quantity } },
          })
        )
      );
    }

    await prisma.workOrder.delete({ where: { id: req.params.id } });
    return success(res, null, 'İş emri silindi.');
  } catch (err) {
    next(err);
  }
};

// ─── İş Emrine Parça Ekle ────────────────────────────────────────────────────
exports.addWorkOrderItem = async (req, res, next) => {
  try {
    const { partId, quantity, unitPrice, unitCost, warehouseId, notes } = req.body;

    const order = await prisma.workOrder.findFirst({
      where: { id: req.params.id, companyId: req.company.id },
    });
    if (!order) return error(res, 'İş emri bulunamadı.', 404);
    if (order.status === 'TAMAMLANDI' || order.status === 'IPTAL') {
      return error(res, 'Tamamlanmış veya iptal edilmiş iş emrine parça eklenemez.', 400);
    }

    const part = await prisma.part.findFirst({
      where: { id: partId, companyId: req.company.id, isActive: true },
    });
    if (!part) return error(res, 'Parça bulunamadı.', 404);

    const qty = parseInt(quantity);
    const price = parseFloat(unitPrice);
    const cost = unitCost ? parseFloat(unitCost) : (part.purchasePrice ? parseFloat(part.purchasePrice) : null);
    const salePrice = isNaN(price) || price === 0 
      ? (part.sellingPrice ? parseFloat(part.sellingPrice) : 0) 
      : price;

    const warehouse = warehouseId
      ? await prisma.warehouse.findFirst({ where: { id: warehouseId, companyId: req.company.id } })
      : await prisma.warehouse.findFirst({ where: { isDefault: true, companyId: req.company.id } });
    const wId = warehouse?.id;

    const item = await prisma.workOrderItem.create({
      data: {
        workOrderId: req.params.id,
        partId,
        warehouseId: wId || null,
        quantity: qty,
        unitPrice: salePrice,
        unitCost: cost,
        notes,
        status: 'BEKLIYOR',
      },
      include: {
        part: { select: { id: true, name: true, unit: true, quantity: true, reservedQuantity: true } },
      },
    });

    return success(res, item, 'Parça iş emrine eklendi.', 201);
  } catch (err) {
    next(err);
  }
};

// ─── İş Emrine Çoklu / Toplu Parça Ekle ──────────────────────────────────────
exports.addWorkOrderBatchItems = async (req, res, next) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return error(res, 'En az bir parça seçilmelidir.', 400);
    }

    const order = await prisma.workOrder.findFirst({
      where: { id: req.params.id, companyId: req.company.id },
    });
    if (!order) return error(res, 'İş emri bulunamadı.', 404);
    if (order.status === 'TAMAMLANDI' || order.status === 'IPTAL') {
      return error(res, 'Tamamlanmış veya iptal edilmiş iş emrine parça eklenemez.', 400);
    }

    const defaultWarehouse = await prisma.warehouse.findFirst({
      where: { isDefault: true, companyId: req.company.id },
    });

    const createdItems = await prisma.$transaction(async (tx) => {
      const results = [];
      for (const it of items) {
        const part = await tx.part.findFirst({
          where: { id: it.partId, companyId: req.company.id, isActive: true },
        });
        if (!part) continue;

        const qty = parseInt(it.quantity) || 1;
        const price = parseFloat(it.unitPrice);
        const cost = it.unitCost ? parseFloat(it.unitCost) : (part.purchasePrice ? parseFloat(part.purchasePrice) : null);
        const salePrice = isNaN(price) || price === 0 
          ? (part.sellingPrice ? parseFloat(part.sellingPrice) : 0) 
          : price;
        const wId = it.warehouseId || defaultWarehouse?.id || null;

        const created = await tx.workOrderItem.create({
          data: {
            workOrderId: req.params.id,
            partId: it.partId,
            warehouseId: wId,
            quantity: qty,
            unitPrice: salePrice,
            unitCost: cost,
            notes: it.notes || null,
            status: 'BEKLIYOR',
          },
          include: {
            part: { select: { id: true, name: true, unit: true, quantity: true, reservedQuantity: true } },
          },
        });
        results.push(created);
      }
      return results;
    });

    return success(res, createdItems, `${createdItems.length} parça iş emrine başarıyla eklendi.`, 201);
  } catch (err) {
    next(err);
  }
};

// ─── Parça Durumu Güncelle (BEKLIYOR → REZERVE → KULLANILDI) ─────────────────
exports.updateWorkOrderItemStatus = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const { status } = req.body;

    const item = await prisma.workOrderItem.findFirst({
      where: { 
        id: itemId, 
        workOrder: { companyId: req.company.id } 
      },
      include: { part: true, workOrder: true },
    });
    if (!item) return error(res, 'Parça kalemi bulunamadı.', 404);

    const part = item.part;
    const prevStatus = item.status;

    // Durum geçişi kuralları (sanayide bekleyen parça doğrudan lifte takılıp kullanıldıya çekilebilir)
    const allowed = {
      BEKLIYOR: ['REZERVE', 'KULLANILDI', 'IPTAL'],
      REZERVE: ['KULLANILDI', 'IPTAL'],
      KULLANILDI: [],
      IPTAL: [],
    };

    if (!allowed[prevStatus]?.includes(status)) {
      return error(res, `${prevStatus} durumundan ${status} durumuna geçiş yapılamaz.`, 400);
    }

    let wId = item.warehouseId;
    if (!wId) {
      const defW = await prisma.warehouse.findFirst({ where: { isDefault: true, companyId: req.company.id } });
      wId = defW?.id;
    }

    if (status === 'REZERVE' && prevStatus === 'BEKLIYOR') {
      // Kullanılabilir stok kontrolü
      const available = part.quantity - part.reservedQuantity;
      if (available < item.quantity) {
        return error(
          res,
          `Yetersiz kullanılabilir stok. Kullanılabilir: ${available} ${part.unit}, İstenen: ${item.quantity} ${part.unit}`,
          400
        );
      }

      await prisma.$transaction([
        prisma.workOrderItem.update({
          where: { id: itemId },
          data: { status: 'REZERVE' },
        }),
        prisma.part.update({
          where: { id: part.id },
          data: { reservedQuantity: { increment: item.quantity } },
        }),
      ]);

    } else if (status === 'KULLANILDI' && prevStatus === 'REZERVE') {
      // Fiziksel stoktan düş + rezerveyi sıfırla + stok hareketi oluştur + depo stoku düş
      if (part.quantity < item.quantity) {
        return error(res, `Yetersiz fiziksel stok. Mevcut: ${part.quantity} ${part.unit}`, 400);
      }

      await prisma.$transaction([
        prisma.workOrderItem.update({
          where: { id: itemId },
          data: { status: 'KULLANILDI' },
        }),
        prisma.part.update({
          where: { id: part.id },
          data: {
            quantity: { decrement: item.quantity },
            reservedQuantity: { decrement: item.quantity },
          },
        }),
        prisma.partMovement.create({
          data: {
            partId: part.id,
            warehouseId: wId || null,
            userId: req.user.id,
            movementType: 'IS_EMRI_KULLANIMI',
            quantity: item.quantity,
            unitCost: item.unitCost,
            referenceType: 'WORK_ORDER',
            referenceId: item.workOrderId,
            notes: `İş Emri: ${item.workOrder.title}`,
          },
        }),
        ...(wId ? [
          prisma.warehouseStock.upsert({
            where: { warehouseId_partId: { warehouseId: wId, partId: part.id } },
            update: { quantity: { decrement: item.quantity } },
            create: { warehouseId: wId, partId: part.id, quantity: 0 }
          })
        ] : []),
      ]);

    } else if (status === 'KULLANILDI' && prevStatus === 'BEKLIYOR') {
      // Doğrudan kullanım (rezerve edilmeden direkt araca montaj) + depo stoku düş
      if (part.quantity < item.quantity) {
        return error(res, `Yetersiz fiziksel stok. Mevcut: ${part.quantity} ${part.unit}`, 400);
      }

      await prisma.$transaction([
        prisma.workOrderItem.update({
          where: { id: itemId },
          data: { status: 'KULLANILDI' },
        }),
        prisma.part.update({
          where: { id: part.id },
          data: {
            quantity: { decrement: item.quantity },
          },
        }),
        prisma.partMovement.create({
          data: {
            partId: part.id,
            warehouseId: wId || null,
            userId: req.user.id,
            movementType: 'IS_EMRI_KULLANIMI',
            quantity: item.quantity,
            unitCost: item.unitCost,
            referenceType: 'WORK_ORDER',
            referenceId: item.workOrderId,
            notes: `İş Emri: ${item.workOrder.title}`,
          },
        }),
        ...(wId ? [
          prisma.warehouseStock.upsert({
            where: { warehouseId_partId: { warehouseId: wId, partId: part.id } },
            update: { quantity: { decrement: item.quantity } },
            create: { warehouseId: wId, partId: part.id, quantity: 0 }
          })
        ] : []),
      ]);

    } else if (status === 'IPTAL') {
      const ops = [
        prisma.workOrderItem.update({
          where: { id: itemId },
          data: { status: 'IPTAL' },
        }),
      ];

      if (prevStatus === 'REZERVE') {
        ops.push(
          prisma.part.update({
            where: { id: part.id },
            data: { reservedQuantity: { decrement: item.quantity } },
          })
        );
      } else if (prevStatus === 'KULLANILDI') {
        // Sanayi Depo Düzeltmesi: Araçtan sökülen / iptal edilen parçayı depoya geri al
        ops.push(
          prisma.part.update({
            where: { id: part.id },
            data: { quantity: { increment: item.quantity } },
          }),
          prisma.partMovement.create({
            data: {
              partId: part.id,
              warehouseId: wId || null,
              userId: req.user.id,
              movementType: 'IADE',
              quantity: item.quantity,
              referenceType: 'WORK_ORDER',
              referenceId: item.workOrderId,
              notes: `İş Emri İptali — Parça söküldü, depoya geri alındı: ${item.workOrder.title}`,
            },
          })
        );

        if (wId) {
          ops.push(
            prisma.warehouseStock.upsert({
              where: { warehouseId_partId: { warehouseId: wId, partId: part.id } },
              update: { quantity: { increment: item.quantity } },
              create: { warehouseId: wId, partId: part.id, quantity: item.quantity },
            })
          );
        }
      }

      await prisma.$transaction(ops);
    }


    updatedItem = await prisma.workOrderItem.findUnique({
      where: { id: itemId },
      include: { part: { select: { id: true, name: true, unit: true, quantity: true, reservedQuantity: true } } },
    });

    return success(res, updatedItem, `Parça durumu ${status} olarak güncellendi.`);
  } catch (err) {
    next(err);
  }
};

// ─── Parçayı İş Emrinden Sil ─────────────────────────────────────────────────
exports.removeWorkOrderItem = async (req, res, next) => {
  try {
    const { itemId } = req.params;

    const item = await prisma.workOrderItem.findFirst({
      where: {
        id: itemId,
        workOrder: { companyId: req.company.id },
      },
    });
    if (!item) return error(res, 'Parça kalemi bulunamadı.', 404);
    if (item.status === 'KULLANILDI') {
      return error(res, 'Kullanılmış parça iş emrinden çıkarılamaz.', 400);
    }

    // Rezerve ise stoku geri ver
    const ops = [prisma.workOrderItem.delete({ where: { id: itemId } })];
    if (item.status === 'REZERVE') {
      ops.push(
        prisma.part.update({
          where: { id: item.partId },
          data: { reservedQuantity: { decrement: item.quantity } },
        })
      );
    }

    await prisma.$transaction(ops);
    return success(res, null, 'Parça iş emrinden çıkarıldı.');
  } catch (err) {
    next(err);
  }
};

// ─── İş Emri İstatistikleri ───────────────────────────────────────────────────
exports.getWorkOrderStats = async (req, res, next) => {
  try {
    const companyId = req.company.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [openCount, inProgressCount, todayCount, monthlyOrders] = await Promise.all([
      prisma.workOrder.count({ where: { companyId, status: 'ACIK' } }),
      prisma.workOrder.count({ where: { companyId, status: 'DEVAM_EDIYOR' } }),
      prisma.workOrder.count({
        where: {
          companyId,
          createdAt: { gte: today, lt: tomorrow },
        },
      }),
      prisma.workOrder.findMany({
        where: {
          companyId,
          status: 'TAMAMLANDI',
          completedAt: { gte: firstDayOfMonth },
        },
        include: {
          items: {
            where: { status: 'KULLANILDI' },
            select: { quantity: true, unitPrice: true, unitCost: true },
          },
        },
      }),
    ]);

    let monthlyPartsSale = 0;
    let monthlyPartsCost = 0;
    let monthlyLabor = 0;

    for (const order of monthlyOrders) {
      monthlyLabor += parseFloat(order.laborCost || 0);
      for (const item of order.items) {
        monthlyPartsSale += parseFloat(item.unitPrice) * item.quantity;
        if (item.unitCost) {
          monthlyPartsCost += parseFloat(item.unitCost) * item.quantity;
        }
      }
    }

    return success(res, {
      openCount,
      inProgressCount,
      todayCount,
      monthly: {
        orderCount: monthlyOrders.length,
        partsSale: monthlyPartsSale,
        partsCost: monthlyPartsCost,
        partsProfit: monthlyPartsSale - monthlyPartsCost,
        labor: monthlyLabor,
        total: monthlyPartsSale + monthlyLabor,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Plaka ile Araç Geçmişi & Servis Karnesi ─────────────────────────────────
exports.getPlateHistory = async (req, res, next) => {
  try {
    const { plate } = req.query;
    if (!plate || !plate.trim()) {
      return error(res, 'Plaka bilgisi gerekli.', 400);
    }

    const trimmed = plate.trim();
    const cleanPlate = trimmed.replace(/\s+/g, '');

    const orders = await prisma.workOrder.findMany({
      where: {
        companyId: req.company.id,
        OR: [
          { vehicleInfo: { contains: trimmed, mode: 'insensitive' } },
          { vehicleInfo: { contains: cleanPlate, mode: 'insensitive' } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { fullName: true } },
        items: {
          include: {
            part: { select: { name: true, unit: true, brand: true, category: true, sku: true } },
          },
        },
      },
    });

    if (orders.length === 0) {
      return success(res, {
        found: false,
        plate: trimmed.toUpperCase(),
        orders: [],
        allParts: [],
        totalServices: 0,
        totalSpent: 0,
      });
    }

    let totalSpent = 0;
    const allParts = [];

    orders.forEach((order) => {
      const labor = parseFloat(order.laborCost || 0);
      let partsTotal = 0;

      order.items.forEach((item) => {
        const itemTotal = parseFloat(item.unitPrice || 0) * (item.quantity || 1);
        partsTotal += itemTotal;
        allParts.push({
          orderId: order.id,
          orderTitle: order.title,
          date: order.createdAt,
          partName: item.part?.name,
          partBrand: item.part?.brand,
          partCategory: item.part?.category,
          quantity: item.quantity,
          unit: item.part?.unit,
          unitPrice: item.unitPrice,
          status: item.status,
        });
      });

      totalSpent += labor + partsTotal;
    });

    const latestOrder = orders[0];

    return success(res, {
      found: true,
      plate: trimmed.toUpperCase(),
      customerName: latestOrder.customerName,
      customerPhone: latestOrder.customerPhone,
      vehicleInfo: latestOrder.vehicleInfo,
      totalServices: orders.length,
      totalSpent,
      orders,
      allParts,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Ödeme Durumu ve Tutarını Güncelle ──────────────────────────────────────
exports.updateWorkOrderPayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amountCollected, paidAmount, paymentStatus, paymentMethod, paymentNotes, isTip } = req.body;

    const order = await prisma.workOrder.findFirst({
      where: { id, companyId: req.company.id },
      include: {
        items: true,
      },
    });
    if (!order) return error(res, 'İş emri bulunamadı.', 404);

    if (order.status === 'IPTAL') {
      return error(res, 'İptal edilmiş bir iş emrine ödeme veya tahsilat alınamaz.', 400);
    }

    const partsTotal = order.items.reduce((sum, item) => {
      if (item.status !== 'IPTAL') {
        return sum + (parseFloat(item.unitPrice) * item.quantity);
      }
      return sum;
    }, 0);
    const totalAmount = partsTotal + parseFloat(order.laborCost || 0);

    const prevPaid = parseFloat(order.paidAmount || 0);
    let numericPaid = prevPaid;
    let tipAmount = 0;
    let woPaymentPortion = 0;

    const remainingBefore = Math.max(0, totalAmount - prevPaid);

    if (amountCollected !== undefined) {
      // YENİ TAHSİLAT AL MODU:
      const rawCollected = parseFloat(amountCollected || 0);

      if (isTip || (remainingBefore === 0 && totalAmount > 0)) {
        // Ödemenin tamamı yapıldıktan sonra girilen bahşiş veya açıkça bahşiş seçilmişse:
        tipAmount = rawCollected;
        woPaymentPortion = 0;
        numericPaid = prevPaid;
      } else if (totalAmount === 0 || remainingBefore === 0) {
        // Ön Ödeme / Kapora Modu: İş emri henüz fiyatlandırılmamış veya bakiye yokken kapora alınıyor
        woPaymentPortion = rawCollected;
        tipAmount = 0;
        numericPaid = prevPaid + rawCollected;
      } else if (rawCollected > remainingBefore) {
        // Kalan tutardan fazla girildi: Akıllı Bahşiş Modu
        woPaymentPortion = remainingBefore;
        tipAmount = Math.round((rawCollected - remainingBefore) * 100) / 100;
        numericPaid = prevPaid + woPaymentPortion; // İş emri tutarını aşamaz!
      } else {
        woPaymentPortion = rawCollected;
        tipAmount = 0;
        numericPaid = prevPaid + woPaymentPortion;
      }
    } else if (paidAmount !== undefined) {
      // TOPLAMI DÜZELT MODU:
      const requestedPaid = parseFloat(paidAmount || 0);
      if (totalAmount > 0 && requestedPaid > totalAmount) {
        // En fazla totalAmount kadar düzeltilebilir
        numericPaid = totalAmount;
      } else {
        numericPaid = requestedPaid;
      }
      const cashIncrement = numericPaid - prevPaid;
      woPaymentPortion = Math.max(0, cashIncrement);
      tipAmount = 0;
    }

    let calculatedStatus = paymentStatus;
    if (amountCollected !== undefined) {
      // YENİ TAHSİLAT AL MODU: Tahsilat sonrasındaki toplam ödemeye göre durum kesinleştirilir
      if (totalAmount > 0 && numericPaid >= totalAmount - 0.01) {
        calculatedStatus = 'ODENDI';
      } else if (numericPaid > 0) {
        calculatedStatus = 'KISMI';
      } else if (numericPaid <= 0) {
        calculatedStatus = order.paymentStatus || 'VERESIYE';
      }
    } else if (!paymentStatus) {
      if (totalAmount > 0 && numericPaid >= totalAmount - 0.01) {
        calculatedStatus = 'ODENDI';
      } else if (numericPaid > 0) {
        calculatedStatus = 'KISMI';
      } else if (numericPaid === 0 && order.paymentStatus === 'VERESIYE') {
        calculatedStatus = 'VERESIYE';
      } else {
        calculatedStatus = order.paymentStatus || 'BEKLIYOR';
      }
    }

    let finalPaymentNotes = paymentNotes !== undefined ? paymentNotes : order.paymentNotes;
    if (tipAmount > 0) {
      const tipNoteTag = `[₺${tipAmount.toLocaleString('tr-TR')} Bahşiş/İkramiye]`;
      if (finalPaymentNotes && !finalPaymentNotes.includes(tipNoteTag)) {
        finalPaymentNotes = `${finalPaymentNotes} ${tipNoteTag}`.trim();
      } else if (!finalPaymentNotes) {
        finalPaymentNotes = tipNoteTag;
      }
    }

    const updated = await prisma.workOrder.update({
      where: { id },
      data: {
        paymentStatus: calculatedStatus,
        paidAmount: numericPaid,
        ...(paymentMethod !== undefined && { paymentMethod }),
        ...(finalPaymentNotes !== undefined && { paymentNotes: finalPaymentNotes }),
      },
      include: {
        user: { select: { fullName: true } },
        items: {
          include: {
            part: { select: { name: true, unit: true } },
          },
        },
      },
    });

    // Atölye kasasına tahsilat hareketi olarak kaydet
    // 1. İş Emri Tahsilatı (Kalan borç kadar veya tahsil edilen kadar)
    if (woPaymentPortion > 0) {
      try {
        const isAdvance = totalAmount === 0 || prevPaid >= totalAmount;
        await prisma.cashTransaction.create({
          data: {
            companyId: req.company.id,
            userId: req.user.id,
            type: 'IN',
            category: 'IS_EMRI_TAHSILAT',
            amount: woPaymentPortion,
            paymentMethod: paymentMethod || order.paymentMethod || 'NAKIT',
            documentNo: order.id,
            description: `${isAdvance ? 'İş Emri Ön Ödeme (Kapora)' : 'İş Emri Tahsilatı'}: ${order.customerName ? order.customerName + ' - ' : ''}${order.title}`,
            date: new Date(),
          },
        });
      } catch (cashErr) {
        console.error('Kasa tahsilat kaydı oluşturulurken hata:', cashErr);
      }
    }

    // 2. Bahşiş / Usta İkramiyesi (Fazla tutar kasaya ayrı gelir olarak girer)
    if (tipAmount > 0) {
      try {
        await prisma.cashTransaction.create({
          data: {
            companyId: req.company.id,
            userId: req.user.id,
            type: 'IN',
            category: 'BAHSIS',
            amount: tipAmount,
            paymentMethod: paymentMethod || order.paymentMethod || 'NAKIT',
            documentNo: order.id,
            description: `Bahşiş / Usta İkramiyesi: ${order.customerName ? order.customerName + ' - ' : ''}${order.title} (₺${tipAmount.toLocaleString('tr-TR')})`,
            date: new Date(),
          },
        });
      } catch (cashErr) {
        console.error('Kasa bahşiş kaydı oluşturulurken hata:', cashErr);
      }
    }

    const remainingAmount = Math.max(0, totalAmount - numericPaid);
    const msg = tipAmount > 0
      ? (remainingBefore === 0 && totalAmount > 0
          ? `₺${tipAmount.toLocaleString('tr-TR')} tutarındaki Bahşiş/İkramiye kasaya başarıyla işlendi! 🎁`
          : `Tahsilat kaydedildi. ₺${tipAmount.toLocaleString('tr-TR')} tutarındaki fazlalık Bahşiş/İkramiye olarak kasaya işlendi. 🎁`)
      : (totalAmount === 0 ? 'Ön ödeme (kapora) başarıyla tahsil edildi ve kasaya işlendi! ✅' : 'Tahsilat başarıyla kaydedildi ve kasaya işlendi! ✅');

    return success(res, {
      ...updated,
      totalAmount,
      paidAmount: numericPaid,
      remainingAmount,
      tipAmount,
      woPaymentPortion,
    }, msg);
  } catch (err) {
    next(err);
  }
};

// ─── Veresiye & Açık Hesap Takibi ──────────────────────────────────────────
exports.getReceivables = async (req, res, next) => {
  try {
    const { search } = req.query;

    const where = {
      companyId: req.company.id,
      status: { not: 'IPTAL' },
      paymentStatus: { in: ['VERESIYE', 'KISMI', 'BEKLIYOR'] },
      ...(search && {
        OR: [
          { customerName: { contains: search, mode: 'insensitive' } },
          { vehicleInfo: { contains: search, mode: 'insensitive' } },
          { title: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const orders = await prisma.workOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          select: {
            quantity: true,
            unitPrice: true,
            status: true,
          },
        },
      },
    });

    let totalReceivables = 0;
    let totalPaid = 0;
    let totalAmountAll = 0;

    const formattedOrders = [];

    orders.forEach((order) => {
      const partsTotal = order.items.reduce((sum, item) => {
        if (item.status !== 'IPTAL') {
          return sum + (parseFloat(item.unitPrice) * item.quantity);
        }
        return sum;
      }, 0);

      const total = partsTotal + parseFloat(order.laborCost || 0);
      const paid = parseFloat(order.paidAmount || 0);
      const remaining = Math.max(0, total - paid);

      if (remaining > 0 || order.paymentStatus === 'VERESIYE') {
        totalReceivables += remaining;
        totalPaid += paid;
        totalAmountAll += total;

        const daysPassed = Math.floor((new Date() - new Date(order.createdAt)) / (1000 * 60 * 60 * 24));

        formattedOrders.push({
          id: order.id,
          title: order.title,
          customerName: order.customerName || 'İsimsiz Müşteri',
          customerPhone: order.customerPhone,
          vehicleInfo: order.vehicleInfo,
          totalAmount: total,
          paidAmount: paid,
          remainingAmount: remaining,
          paymentStatus: order.paymentStatus,
          paymentMethod: order.paymentMethod,
          paymentNotes: order.paymentNotes,
          createdAt: order.createdAt,
          daysPassed,
        });
      }
    });

    const uniqueCustomers = new Set(formattedOrders.map(o => o.customerName)).size;

    return success(res, {
      totalReceivables,
      totalPaid,
      totalAmountAll,
      debtorOrdersCount: formattedOrders.length,
      customerCount: uniqueCustomers,
      orders: formattedOrders,
    }, 'Veresiye ve alacak listesi getirildi.');
  } catch (err) {
    next(err);
  }
};

// ─── İş Emrine Fotoğraf Ekle (Öncesi / Sonrası) ──────────────────────────────
exports.addWorkOrderPhoto = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { type, imageUrl } = req.body; // type: 'before' | 'after'

    if (!imageUrl) return error(res, 'Görsel linki zorunludur.', 400);
    if (!['before', 'after'].includes(type)) {
      return error(res, 'Fotoğraf türü "before" veya "after" olmalıdır.', 400);
    }

    const order = await prisma.workOrder.findFirst({
      where: { id, companyId: req.company.id },
    });
    if (!order) return error(res, 'İş emri bulunamadı.', 404);

    const field = type === 'before' ? 'beforeImages' : 'afterImages';
    const currentList = order[field] || [];

    const updated = await prisma.workOrder.update({
      where: { id },
      data: {
        [field]: [...currentList, imageUrl],
      },
    });

    return success(res, updated, 'Fotoğraf iş emrine eklendi.');
  } catch (err) {
    next(err);
  }
};

// ─── İş Emrinden Fotoğraf Sil ────────────────────────────────────────────────
exports.removeWorkOrderPhoto = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { type, imageUrl } = req.body;

    if (!imageUrl || !['before', 'after'].includes(type)) {
      return error(res, 'Geçersiz parametreler.', 400);
    }

    const order = await prisma.workOrder.findFirst({
      where: { id, companyId: req.company.id },
    });
    if (!order) return error(res, 'İş emri bulunamadı.', 404);

    const field = type === 'before' ? 'beforeImages' : 'afterImages';
    const currentList = order[field] || [];

    const updated = await prisma.workOrder.update({
      where: { id },
      data: {
        [field]: currentList.filter(url => url !== imageUrl),
      },
    });

    return success(res, updated, 'Fotoğraf silindi.');
  } catch (err) {
    next(err);
  }
};


