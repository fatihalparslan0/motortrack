import { Linking, Alert } from 'react-native';

/**
 * Türkiye telefon numarasını WhatsApp formatına (905XXXXXXXXX) dönüştürür
 */
export function formatWhatsAppPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  // Sadece rakamları al
  let cleaned = phone.replace(/\D/g, '');

  // Başında 0 varsa kaldır (0532 -> 532)
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }

  // Başında 90 yoksa ekle (532 -> 90532)
  if (!cleaned.startsWith('90')) {
    cleaned = '90' + cleaned;
  }

  return cleaned;
}

/**
 * WhatsApp uygulamasını veya web linkini açar
 */
export async function openWhatsApp(phone: string | null | undefined, text: string): Promise<boolean> {
  const cleanPhone = formatWhatsAppPhone(phone);
  const encodedText = encodeURIComponent(text);

  if (!cleanPhone || cleanPhone.length < 10) {
    Alert.alert('Telefon Eksik', 'Geçerli bir telefon numarası bulunamadı.');
    return false;
  }

  const appUrl = `whatsapp://send?phone=${cleanPhone}&text=${encodedText}`;
  const webUrl = `https://wa.me/${cleanPhone}?text=${encodedText}`;

  try {
    const supported = await Linking.canOpenURL(appUrl);
    if (supported) {
      await Linking.openURL(appUrl);
      return true;
    } else {
      await Linking.openURL(webUrl);
      return true;
    }
  } catch (err) {
    try {
      await Linking.openURL(webUrl);
      return true;
    } catch (e) {
      Alert.alert('Hata', 'WhatsApp açılamadı. Lütfen WhatsApp uygulamasının yüklü olduğundan emin olun.');
      return false;
    }
  }
}

/**
 * İş Emri için şık bir WhatsApp Müşteri Bilgilendirme / Servis Fişi metni oluşturur
 */
export function generateWorkOrderMessage(order: any, companyName: string = 'MotorTrack Servis'): string {
  const itemsText = (order.items && order.items.length > 0)
    ? order.items.map((i: any) => {
        const qty = i.quantity || 1;
        const price = parseFloat(i.unitPrice || '0');
        const total = (qty * price).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        return `• ${i.part?.name || 'Parça'} (${qty} ${i.part?.unit || 'adet'}) = ₺${total}`;
      }).join('\n')
    : '• Parça kullanımı bulunmuyor';

  const labor = parseFloat(order.laborCost || '0').toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const total = parseFloat(order.totalAmount || '0').toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const paid = parseFloat(order.paidAmount || '0').toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const remaining = parseFloat(order.remainingAmount !== undefined ? order.remainingAmount : (order.totalAmount - (order.paidAmount || 0))).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const paymentStatusMap: Record<string, string> = {
    ODENDI: '✅ ÖDENDİ',
    KISMI: `⚠️ KISMİ ÖDENDİ (Kalan: ₺${remaining})`,
    VERESIYE: `🔴 VERESİYE / AÇIK HESAP (Kalan: ₺${remaining})`,
    BEKLIYOR: '⏳ ÖDEME BEKLİYOR',
  };
  const payStatusText = paymentStatusMap[order.paymentStatus] || '⏳ Ödeme Bekliyor';

  const photoCount = (order.beforeImages?.length || 0) + (order.afterImages?.length || 0);
  const photoNote = photoCount > 0 ? `\n📸 *Ekspertiz & Parça Fotoğrafları:* ${photoCount} adet fotoğraf servis arşivine işlenmiştir.` : '';

  const dateStr = new Date(order.createdAt || Date.now()).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return `🔧 *${companyName.toUpperCase()} — SERVİS BİLGİ FORMU*
━━━━━━━━━━━━━━━━━━━━
🚗 *Araç:* ${order.vehicleInfo || 'Belirtilmedi'}
👤 *Müşteri:* ${order.customerName || 'Sayın Müşterimiz'}
📋 *İşlem:* ${order.title}
📅 *Tarih:* ${dateStr}

🛠️ *DEĞİŞEN PARÇALAR:*
${itemsText}

🔧 *İşçilik Ücreti:* ₺${labor}
💰 *TOPLAM TUTAR:* ₺${total}
💳 *Ödeme Durumu:* ${payStatusText}
${parseFloat(order.paidAmount || 0) > 0 ? `💵 *Tahsil Edilen:* ₺${paid}\n` : ''}${parseFloat(order.tipAmount || 0) > 0 ? `🎁 *Bahşiş / İkramiye:* ₺${parseFloat(order.tipAmount).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` : ''}${order.paymentNotes ? `📝 *Ödeme Notu:* ${order.paymentNotes}\n` : ''}${photoNote}
${order.notes ? `\n📝 *Servis Notu:* ${order.notes}` : ''}
━━━━━━━━━━━━━━━━━━━━
Bizi tercih ettiğiniz için teşekkür eder, iyi ve güvenli sürüşler dileriz! 🏍️`;
}

/**
 * Müşteriye WhatsApp Açık Hesap / Borç Hatırlatma Mesajı
 */
export function generateDebtReminderMessage(order: any, companyName: string = 'MotorTrack Servis'): string {
  const total = parseFloat(order.totalAmount || '0').toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const paid = parseFloat(order.paidAmount || '0').toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const remaining = parseFloat(order.remainingAmount || (order.totalAmount - (order.paidAmount || 0))).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return `Selamlar Sayın ${order.customerName || 'Müşterimiz'},

*${companyName}* olarak hayırlı günler dileriz. 🛠️

${order.vehicleInfo ? `🚗 *Araç:* ${order.vehicleInfo}\n` : ''}📋 *İşlem:* ${order.title}

💰 *Toplam Tutar:* ₺${total}
${parseFloat(order.paidAmount || 0) > 0 ? `💵 *Ödenen Tutar:* ₺${paid}\n` : ''}🔴 *Kalan Bakiye:* ₺${remaining}
${order.paymentNotes ? `📝 *Not:* ${order.paymentNotes}\n` : ''}
Müsait bir zamanınızda ödemenizi dükkanımıza uğrayarak (Nakit / Kredi Kartı) veya banka hesabımıza gerçekleştirebilirsiniz.

Hesap bilgisi veya detay için bu mesaja yanıt verebilirsiniz.
Hayırlı işler, kazasız belasız sürüşler dileriz! 🏍️`;
}

/**
 * Tedarikçiye WhatsApp Parça Sorusu / Sipariş metni oluşturur
 */
export function generateSupplierInquiryMessage(part: any, qty: number = 1, companyName: string = 'MotorTrack'): string {
  const brandStr = part.brand ? ` (${part.brand})` : '';
  const partNoStr = part.partNumber ? `\n• Parça Kodu: ${part.partNumber}` : '';
  const oemStr = part.oemCode ? `\n• OEM: ${part.oemCode}` : '';

  return `Selamlar, hayırlı işler! 
Aşağıdaki parça için stok ve güncel fiyat bilgisi alabilir miyiz?

📦 *${part.name}*${brandStr}${partNoStr}${oemStr}
🔢 *Talep Edilen Miktar:* ${qty} ${part.unit || 'adet'}

Teşekkürler,
*${companyName}*`;
}

/**
 * Parçacıya / Tedarikçiye Toplu Kritik Parça Siparişi WhatsApp metni
 */
export function generateBatchOrderMessage(items: any[], companyName: string = 'MotorTrack Servis'): string {
  const dateStr = new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const itemsList = items.map((item, idx) => {
    const missing = Math.max(1, (item.minQuantity || 1) - (item.quantity || 0));
    const code = item.partNumber || item.oemCode || '';
    const codeStr = code ? ` [${code}]` : '';
    const brandStr = item.brand ? ` (${item.brand})` : '';
    return `${idx + 1}. *${item.name}*${brandStr}${codeStr} — 🔢 *${missing} ${item.unit || 'adet'}*`;
  }).join('\n');

  return `Selamlar, hayırlı işler! 🛠️
*${companyName}* adına tükenen kritik parçalarımız için sipariş geçmek istiyoruz:
📅 Tarih: ${dateStr}

📦 *SİPARİŞ LİSTESİ:*
${itemsList}

Müsaitlik ve fiyat teyidi ile birlikte kurye/servis ile göndermenizi rica ederiz.
Kolay gelsin, bereketli kazançlar!`;
}

/**
 * Parçacıya / Tedarikçiye Uymayan Parça İadesi Bildirim Metni
 */
export function generateReturnSupplierMessage(
  part: any, 
  qty: number = 1, 
  reason: string = 'Araca uymadı / yanlış parça',
  companyName: string = 'MotorTrack Servis'
): string {
  const code = part.partNumber || part.oemCode ? `\n• Kod: ${part.partNumber || part.oemCode}` : '';
  const brand = part.brand ? ` (${part.brand})` : '';

  return `Selamlar, hayırlı işler!
Aşağıda bilgileri bulunan parçayı iadeye gönderiyoruz:

📦 *${part.name}*${brand}${code}
🔢 *İade Miktarı:* ${qty} ${part.unit || 'adet'}
📝 *İade Sebebi:* ${reason}

Lütfen cari hesabımıza iade olarak işleyiniz.
Teşekkür eder, iyi çalışmalar dileriz.
*${companyName}*`;
}

