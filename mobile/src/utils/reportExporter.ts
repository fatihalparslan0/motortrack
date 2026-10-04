import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Alert } from 'react-native';

const formatCur = (amount?: number | null) => {
  if (amount === undefined || amount === null || isNaN(amount)) return '₺0,00';
  return '₺' + amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

/**
 * Yönetici Raporu için Profesyonel HTML Şablonu Oluşturur
 */
export function buildExecutiveReportHTML(
  report: any,
  companyName: string = 'MotorTrack Servis',
  periodLabel: string = 'Bu Ay',
  generatorName: string = 'Yönetici'
): string {
  const overview = report?.overview || {};
  const technicians: any[] = report?.technicians || [];
  const dailyTrend: any[] = report?.dailyTrend || [];
  const cashFlow = report?.cashFlow || {};
  const topParts: any[] = report?.topParts || [];
  const topVehicles: any[] = report?.topVehicleBrands || [];

  const nowFormatted = new Date().toLocaleString('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <title>${companyName} - ${periodLabel} Yönetici Raporu</title>
  <style>
    @page { size: A4; margin: 15mm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      margin: 0;
      padding: 0;
      font-size: 11pt;
      line-height: 1.4;
    }
    .header {
      border-bottom: 2px solid #4f46e5;
      padding-bottom: 12px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .company-title {
      font-size: 20pt;
      font-weight: 800;
      color: #1e1b4b;
      margin: 0;
    }
    .report-title {
      font-size: 13pt;
      font-weight: 700;
      color: #4f46e5;
      margin-top: 4px;
    }
    .meta-box {
      text-align: right;
      font-size: 9pt;
      color: #64748b;
    }
    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 4px;
      font-weight: 700;
      font-size: 8pt;
      text-transform: uppercase;
    }
    .badge-primary { background: #e0e7ff; color: #3730a3; }
    
    /* KPI Cards */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 16px;
    }
    .kpi-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px;
    }
    .kpi-label {
      font-size: 8pt;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .kpi-value {
      font-size: 14pt;
      font-weight: 800;
      color: #0f172a;
    }
    .kpi-sub {
      font-size: 7.5pt;
      color: #059669;
      font-weight: 600;
      margin-top: 2px;
    }

    /* Section & Tables */
    .section-title {
      font-size: 11pt;
      font-weight: 800;
      color: #0f172a;
      margin-top: 16px;
      margin-bottom: 8px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
      font-size: 9pt;
    }
    th {
      background: #f1f5f9;
      color: #475569;
      font-weight: 700;
      text-align: left;
      padding: 6px 8px;
      border: 1px solid #cbd5e1;
    }
    td {
      padding: 6px 8px;
      border: 1px solid #e2e8f0;
    }
    tr:nth-child(even) {
      background: #fafafa;
    }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .font-bold { font-weight: 700; }
    .text-green { color: #059669; }
    .text-blue { color: #2563eb; }
    .text-red { color: #dc2626; }
    .text-amber { color: #d97706; }

    /* Footer */
    .footer {
      margin-top: 30px;
      padding-top: 10px;
      border-top: 1px dashed #cbd5e1;
      display: flex;
      justify-content: space-between;
      font-size: 8.5pt;
      color: #64748b;
    }
    .signature-area {
      margin-top: 40px;
      display: flex;
      justify-content: space-around;
      text-align: center;
      font-size: 9pt;
    }
    .signature-line {
      width: 180px;
      border-top: 1px solid #000;
      padding-top: 4px;
      margin-top: 35px;
    }
  </style>
</head>
<body>

  <!-- Header -->
  <div class="header">
    <div>
      <h1 class="company-title">${companyName}</h1>
      <div class="report-title">📊 ${periodLabel} Ciro, Kâr ve Personel Performans Raporu</div>
    </div>
    <div class="meta-box">
      <div><strong>Rapor No:</strong> #${Date.now().toString().slice(-6)}</div>
      <div><strong>Tarih:</strong> ${nowFormatted}</div>
      <div><strong>Hazırlayan:</strong> ${generatorName}</div>
      <div style="margin-top: 4px;"><span class="badge badge-primary">RESMİ YÖNETİM RAPORU</span></div>
    </div>
  </div>

  <!-- KPI Özeti -->
  <div class="kpi-grid">
    <div class="kpi-card" style="border-left: 4px solid #4f46e5;">
      <div class="kpi-label">Toplam Ciro</div>
      <div class="kpi-value">${formatCur(overview.totalRevenue)}</div>
      <div class="kpi-sub" style="color: #4f46e5;">${overview.jobCounts?.total || 0} İş Emri</div>
    </div>
    <div class="kpi-card" style="border-left: 4px solid #059669;">
      <div class="kpi-label">Net Kâr</div>
      <div class="kpi-value text-green">${formatCur(overview.grossProfit)}</div>
      <div class="kpi-sub">%${overview.grossMargin || 0} Brüt Kâr Marjı</div>
    </div>
    <div class="kpi-card" style="border-left: 4px solid #f59e0b;">
      <div class="kpi-label">İşçilik Geliri</div>
      <div class="kpi-value text-amber">${formatCur(overview.totalLaborRevenue)}</div>
      <div class="kpi-sub" style="color: #64748b;">Atölye El Emeği</div>
    </div>
    <div class="kpi-card" style="border-left: 4px solid #2563eb;">
      <div class="kpi-label">Tahsil Edilen</div>
      <div class="kpi-value text-blue">${formatCur(overview.totalPaid)}</div>
      <div class="kpi-sub" style="color: ${overview.totalReceivables > 0 ? '#dc2626' : '#059669'};">
        ${overview.totalReceivables > 0 ? 'Açık: ' + formatCur(overview.totalReceivables) : 'Tamamı Tahsil'}
      </div>
    </div>
  </div>

  <!-- 1. Teknisyen / Personel Performans Tablosu -->
  <div class="section-title">👨‍🔧 Personel & Teknisyen Performans ve Ciro Katkı Dökümü</div>
  <table>
    <thead>
      <tr>
        <th class="text-center" style="width: 30px;">#</th>
        <th>Personel Adı</th>
        <th>Görevi</th>
        <th class="text-center">İş Sayısı</th>
        <th class="text-right">Kazandırdığı Ciro</th>
        <th class="text-right">İşçilik Katkısı</th>
        <th class="text-right">Parça Hasılatı</th>
        <th class="text-right">Net Şirket Katkısı</th>
        <th class="text-center">Başarı</th>
      </tr>
    </thead>
    <tbody>
      ${technicians.length === 0 ? '<tr><td colspan="9" class="text-center">Kayıtlı personel verisi yok</td></tr>' : 
        technicians.map((t, idx) => `
        <tr>
          <td class="text-center font-bold">${idx + 1}</td>
          <td class="font-bold">${t.fullName}</td>
          <td>${t.role === 'TECHNICIAN' ? 'Teknisyen' : t.role}</td>
          <td class="text-center">${t.completedJobs} / ${t.totalJobs}</td>
          <td class="text-right font-bold text-blue">${formatCur(t.totalRevenue)}</td>
          <td class="text-right text-amber font-bold">${formatCur(t.laborRevenue)}</td>
          <td class="text-right">${formatCur(t.partsRevenue)}</td>
          <td class="text-right text-green font-bold">${formatCur(t.netContribution)}</td>
          <td class="text-center">%${t.completionRate}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <!-- 2. Günlük Trend ve Kasa Özeti (İki Kolon) -->
  <div style="display: flex; gap: 14px;">
    <!-- Günlük Trend -->
    <div style="flex: 1.2;">
      <div class="section-title">📅 Günlük Ciro ve Kâr Gelişimi</div>
      <table>
        <thead>
          <tr>
            <th>Tarih</th>
            <th class="text-right">Ciro</th>
            <th class="text-right">Maliyet</th>
            <th class="text-right">Net Kâr</th>
            <th class="text-center">İş</th>
          </tr>
        </thead>
        <tbody>
          ${dailyTrend.length === 0 ? '<tr><td colspan="5" class="text-center">Günlük veri yok</td></tr>' :
            dailyTrend.slice(0, 10).map(d => `
            <tr>
              <td>${new Date(d.date).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })}</td>
              <td class="text-right font-bold">${formatCur(d.totalRevenue)}</td>
              <td class="text-right text-red">${formatCur(d.partsCost)}</td>
              <td class="text-right text-green font-bold">${formatCur(d.profit)}</td>
              <td class="text-center">${d.jobsCount}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <!-- Kasa ve Giderler -->
    <div style="flex: 0.8;">
      <div class="section-title">💵 Kasa & Gider Özeti</div>
      <table>
        <tbody>
          <tr>
            <td><strong>Kasa Toplam Giriş</strong></td>
            <td class="text-right text-green font-bold">${formatCur(cashFlow.totalCashIn)}</td>
          </tr>
          <tr>
            <td><strong>Kasa Toplam Çıkış (Gider)</strong></td>
            <td class="text-right text-red font-bold">${formatCur(cashFlow.totalCashOut)}</td>
          </tr>
          <tr style="background: #f1f5f9;">
            <td><strong>Net Kasa Akışı</strong></td>
            <td class="text-right font-bold" style="color: ${cashFlow.netCashFlow >= 0 ? '#059669' : '#dc2626'};">
              ${formatCur(cashFlow.netCashFlow)}
            </td>
          </tr>
        </tbody>
      </table>

      <div class="section-title" style="margin-top: 10px;">📦 Popüler Yedek Parçalar</div>
      <table>
        <tbody>
          ${topParts.slice(0, 4).map(p => `
            <tr>
              <td>${p.name} <small style="color:#64748b;">(${p.brand || 'Genel'})</small></td>
              <td class="text-right font-bold text-blue">${p.quantity} ad. • ${formatCur(p.revenue)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  </div>

  <!-- İmza Alanı -->
  <div class="signature-area">
    <div>
      <div>Raporu Düzenleyen</div>
      <div class="signature-line">${generatorName}</div>
    </div>
    <div>
      <div>Atölye / Şirket Müdürü</div>
      <div class="signature-line">İmza & Kaşe</div>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <div>MotorTrack Servis & Atölye Yönetim Sistemi</div>
    <div>Sayfa 1 / 1</div>
  </div>

</body>
</html>
  `;
}

/**
 * Excel ile Tam Uyumlu (.csv) Tablo Metni Üretir (Türkçe Karakter ve Sütun Düzeni)
 */
export function buildExecutiveReportCSV(
  report: any,
  companyName: string = 'MotorTrack Servis',
  periodLabel: string = 'Bu Ay'
): string {
  const overview = report?.overview || {};
  const technicians: any[] = report?.technicians || [];
  const dailyTrend: any[] = report?.dailyTrend || [];
  const cashFlow = report?.cashFlow || {};

  // UTF-8 BOM (\uFEFF) Excel'in Türkçe karakterleri düzgün açması için zorunludur.
  let csv = '\uFEFF';

  // 1. Şirket & Başlık
  csv += `"${companyName} - ${periodLabel} Ciro ve Performans Raporu"\n`;
  csv += `"Oluşturulma Tarihi";"${new Date().toLocaleString('tr-TR')}"\n\n`;

  // 2. Finansal Genel Özet
  csv += `"FİNANSAL GENEL ÖZET"\n`;
  csv += `"Metrik";"Tutar / Değer"\n`;
  csv += `"Toplam Ciro (₺)";"${overview.totalRevenue || 0}"\n`;
  csv += `"Net Kâr (₺)";"${overview.grossProfit || 0}"\n`;
  csv += `"Brüt Kâr Marjı (%)";"%${overview.grossMargin || 0}"\n`;
  csv += `"Toplam İşçilik Geliri (₺)";"${overview.totalLaborRevenue || 0}"\n`;
  csv += `"Toplam Parça Satış Hasılatı (₺)";"${overview.totalPartsRevenue || 0}"\n`;
  csv += `"Toplam Parça Alış Maliyeti (₺)";"${overview.totalPartsCost || 0}"\n`;
  csv += `"Tahsil Edilen Tutar (₺)";"${overview.totalPaid || 0}"\n`;
  csv += `"Bekleyen Açık Hesap / Veresiye (₺)";"${overview.totalReceivables || 0}"\n`;
  csv += `"Toplam İş Emri Adedi";"${overview.jobCounts?.total || 0}"\n`;
  csv += `"Tamamlanan İş Adedi";"${overview.jobCounts?.completed || 0}"\n`;
  csv += `"Ortalama İş Emri Tutarı (₺)";"${overview.averageTicket || 0}"\n\n`;

  // 3. Personel & Teknisyen Tablosu
  csv += `"PERSONEL & TEKNİSYEN PERFORMANS SIRALAMASI"\n`;
  csv += `"Sıra";"Personel Adı";"Görevi";"Toplam İş";"Tamamlanan İş";"Toplam Ciro (₺)";"İşçilik Katkısı (₺)";"Parça Satışı (₺)";"Parça Maliyeti (₺)";"Net Kâr Katkısı (₺)";"Tamamlama Oranı (%)"\n`;

  technicians.forEach((t, i) => {
    csv += `"${i + 1}";"${t.fullName}";"${t.role}";"${t.totalJobs}";"${t.completedJobs}";"${t.totalRevenue}";"${t.laborRevenue}";"${t.partsRevenue}";"${t.partsCost}";"${t.netContribution}";"%${t.completionRate}"\n`;
  });

  csv += `\n"GÜNLÜK CİRO VE KÂR TRENDİ"\n`;
  csv += `"Tarih";"İş Emri Sayısı";"Toplam Ciro (₺)";"Parça Maliyeti (₺)";"Net Kâr (₺)"\n`;

  dailyTrend.forEach(d => {
    csv += `"${d.date}";"${d.jobsCount}";"${d.totalRevenue}";"${d.partsCost}";"${d.profit}"\n`;
  });

  csv += `\n"KASA NAKİT AKIŞI"\n`;
  csv += `"Kasa Toplam Giriş (₺)";"${cashFlow.totalCashIn || 0}"\n`;
  csv += `"Kasa Toplam Çıkış / Gider (₺)";"${cashFlow.totalCashOut || 0}"\n`;
  csv += `"Net Kasa Akışı (₺)";"${cashFlow.netCashFlow || 0}"\n`;

  return csv;
}

/**
 * PDF Olarak Dışa Aktar ve Paylaşım Menüsünü Aç
 */
export async function exportAndSharePDF(
  report: any,
  companyName?: string,
  periodLabel?: string,
  generatorName?: string
): Promise<void> {
  try {
    const html = buildExecutiveReportHTML(report, companyName, periodLabel, generatorName);
    const { uri } = await Print.printToFileAsync({ html });

    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert('Bilgi', 'Bu cihazda dosya paylaşımı desteklenmiyor.');
      return;
    }

    await Sharing.shareAsync(uri, {
      UTI: '.pdf',
      mimeType: 'application/pdf',
      dialogTitle: `${companyName || 'MotorTrack'} PDF Yönetim Raporu`,
    });
  } catch (error: any) {
    console.error('PDF export error:', error);
    Alert.alert('Hata', 'PDF raporu oluşturulurken bir sorun meydana geldi.');
  }
}

/**
 * Excel (.csv) Olarak Dışa Aktar ve Paylaşım Menüsünü Aç
 */
export async function exportAndShareExcel(
  report: any,
  companyName?: string,
  periodLabel?: string
): Promise<void> {
  try {
    const csvContent = buildExecutiveReportCSV(report, companyName, periodLabel);
    const fileName = `Ciro_Raporu_${Date.now()}.csv`;
    const filePath = `${FileSystem.cacheDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(filePath, csvContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert('Bilgi', 'Bu cihazda dosya paylaşımı desteklenmiyor.');
      return;
    }

    await Sharing.shareAsync(filePath, {
      mimeType: 'text/csv',
      UTI: 'public.comma-separated-values-text',
      dialogTitle: `${companyName || 'MotorTrack'} Excel Raporu`,
    });
  } catch (error: any) {
    console.error('Excel export error:', error);
    Alert.alert('Hata', 'Excel raporu oluşturulurken bir sorun meydana geldi.');
  }
}
