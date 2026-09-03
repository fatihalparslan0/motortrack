/**
 * Başarılı yanıt
 */
const success = (res, data, message = 'İşlem başarılı', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

/**
 * Hata yanıtı
 */
const error = (res, message = 'Bir hata oluştu', statusCode = 400, errors = null) => {
  const response = { success: false, message };
  if (errors) response.errors = errors;
  return res.status(statusCode).json(response);
};

/**
 * Sayfalı liste yanıtı
 */
const paginated = (res, data, total, page, limit, message = 'Başarılı') => {
  return res.status(200).json({
    success: true,
    message,
    data,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit),
    },
  });
};

module.exports = { success, error, paginated };
