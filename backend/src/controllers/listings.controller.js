const prisma = require('../utils/prisma');
const { success, error, paginated } = require('../utils/apiResponse');

exports.getMarketplace = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, condition, minPrice, maxPrice, category } = req.query;
    const skip = (page - 1) * limit;

    const where = {
      status: 'ACTIVE',
      companyId: { not: req.company.id }, // Kendi ilanları hariç
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(condition && { condition }),
      ...(minPrice && { price: { gte: parseFloat(minPrice) } }),
      ...(maxPrice && { price: { lte: parseFloat(maxPrice) } }),
    };

    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          company: { select: { id: true, name: true, logoUrl: true, city: true } },
          part: { select: { partNumber: true, category: true } },
        },
      }),
      prisma.listing.count({ where }),
    ]);

    // View sayısını artır (toplu değil, arka planda)
    return paginated(res, listings, total, page, limit, 'Pazar yeri ilanları');
  } catch (err) {
    next(err);
  }
};

exports.getMyListings = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const where = {
      companyId: req.company.id,
      ...(status && { status }),
    };

    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        skip: (page - 1) * limit,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { messages: true } },
        },
      }),
      prisma.listing.count({ where }),
    ]);

    return paginated(res, listings, total, page, limit, 'İlanlarım');
  } catch (err) {
    next(err);
  }
};

exports.getListingById = async (req, res, next) => {
  try {
    const listing = await prisma.listing.findUnique({
      where: { id: req.params.id },
      include: {
        company: { select: { id: true, name: true, logoUrl: true, city: true, phone: true } },
        part: true,
        _count: { select: { messages: true } },
      },
    });

    if (!listing || listing.status === 'DELETED') {
      return error(res, 'İlan bulunamadı.', 404);
    }

    // Görüntülenme sayısını artır
    if (listing.companyId !== req.company.id) {
      await prisma.listing.update({
        where: { id: listing.id },
        data: { viewsCount: { increment: 1 } },
      });
    }

    return success(res, listing);
  } catch (err) {
    next(err);
  }
};

exports.createListing = async (req, res, next) => {
  try {
    // Plan limiti kontrolü
    const plan = req.company.subscription?.plan;
    if (plan?.maxListings) {
      const count = await prisma.listing.count({
        where: { companyId: req.company.id, status: 'ACTIVE' },
      });
      if (count >= plan.maxListings) {
        return error(res, `Planınız en fazla ${plan.maxListings} aktif ilan destekler. Planınızı yükseltin.`, 403);
      }
    }

    const { title, description, price, currency, quantity, condition, partId, imageUrls } = req.body;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 gün geçerli

    const listing = await prisma.listing.create({
      data: {
        companyId: req.company.id,
        userId: req.user.id,
        title, description,
        price: parseFloat(price),
        currency: currency || 'TRY',
        quantity: parseInt(quantity) || 1,
        condition: condition || 'USED',
        partId: partId || null,
        imageUrls: imageUrls || [],
        status: 'ACTIVE',
        expiresAt,
      },
    });

    return success(res, listing, 'İlan başarıyla yayınlandı.', 201);
  } catch (err) {
    next(err);
  }
};

exports.updateListing = async (req, res, next) => {
  try {
    const listing = await prisma.listing.findFirst({
      where: { id: req.params.id, companyId: req.company.id },
    });
    if (!listing) return error(res, 'İlan bulunamadı.', 404);

    const updated = await prisma.listing.update({
      where: { id: req.params.id },
      data: {
        ...(req.body.title && { title: req.body.title }),
        ...(req.body.description && { description: req.body.description }),
        ...(req.body.price && { price: parseFloat(req.body.price) }),
        ...(req.body.quantity && { quantity: parseInt(req.body.quantity) }),
        ...(req.body.status && { status: req.body.status }),
        ...(req.body.condition && { condition: req.body.condition }),
        ...(req.body.imageUrls && { imageUrls: req.body.imageUrls }),
      },
    });

    return success(res, updated, 'İlan güncellendi.');
  } catch (err) {
    next(err);
  }
};

exports.deleteListing = async (req, res, next) => {
  try {
    const listing = await prisma.listing.findFirst({
      where: { id: req.params.id, companyId: req.company.id },
    });
    if (!listing) return error(res, 'İlan bulunamadı.', 404);

    await prisma.listing.update({
      where: { id: req.params.id },
      data: { status: 'DELETED' },
    });

    return success(res, null, 'İlan silindi.');
  } catch (err) {
    next(err);
  }
};

exports.getMessages = async (req, res, next) => {
  try {
    const listing = await prisma.listing.findUnique({ where: { id: req.params.id } });
    if (!listing) return error(res, 'İlan bulunamadı.', 404);

    // Sadece ilan sahibi veya mesaj gönderen görebilir
    const messages = await prisma.listingMessage.findMany({
      where: {
        listingId: req.params.id,
        OR: [
          { senderCompanyId: req.company.id },
          { receiverCompanyId: req.company.id },
        ],
      },
      orderBy: { createdAt: 'asc' },
      include: {
        senderCompany: { select: { id: true, name: true, logoUrl: true } },
      },
    });

    // Okunmamış mesajları okundu olarak işaretle
    await prisma.listingMessage.updateMany({
      where: {
        listingId: req.params.id,
        receiverCompanyId: req.company.id,
        isRead: false,
      },
      data: { isRead: true },
    });

    return success(res, messages, 'Mesajlar');
  } catch (err) {
    next(err);
  }
};

exports.sendMessage = async (req, res, next) => {
  try {
    const listing = await prisma.listing.findUnique({
      where: { id: req.params.id },
      include: { company: true },
    });

    if (!listing || listing.status !== 'ACTIVE') {
      return error(res, 'İlan bulunamadı veya aktif değil.', 404);
    }

    if (listing.companyId === req.company.id) {
      return error(res, 'Kendi ilanınıza mesaj gönderemezsiniz.', 400);
    }

    const message = await prisma.listingMessage.create({
      data: {
        listingId: listing.id,
        senderCompanyId: req.company.id,
        receiverCompanyId: listing.companyId,
        message: req.body.message,
      },
      include: {
        senderCompany: { select: { id: true, name: true, logoUrl: true } },
      },
    });

    return success(res, message, 'Mesaj gönderildi.', 201);
  } catch (err) {
    next(err);
  }
};
