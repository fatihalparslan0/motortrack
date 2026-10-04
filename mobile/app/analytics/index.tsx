import React, { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Share, Dimensions,
  Modal, Alert, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { analyticsAPI } from '../../src/api/client';
import { Typography, Spacing, BorderRadius, Shadows } from '../../src/constants/theme';
import { useAppTheme } from '../../src/hooks/useAppTheme';
import { useAuthStore, isTechnicianRole } from '../../src/store/auth.store';
import {
  ArrowLeft, Calendar, DollarSign, TrendingUp, Users,
  Wrench, Package, Share2, Award, ChevronRight, CheckCircle2,
  Clock, AlertTriangle, ShieldCheck, PieChart, BarChart3, Filter,
  FileText, FileSpreadsheet, MessageSquare, X, Download, FileDown,
} from 'lucide-react-native';
import { exportAndSharePDF, exportAndShareExcel } from '../../src/utils/reportExporter';

const PERIOD_OPTIONS = [
  { key: 'today', label: 'Bugün' },
  { key: 'week', label: 'Bu Hafta' },
  { key: 'month', label: 'Bu Ay' },
  { key: 'year', label: 'Bu Yıl' },
];

const formatCurrency = (amount?: number | null) => {
  if (amount === undefined || amount === null || isNaN(amount)) return '₺0';
  return '₺' + amount.toLocaleString('tr-TR', { maximumFractionDigits: 0 });
};

const formatCurrencyDetailed = (amount?: number | null) => {
  if (amount === undefined || amount === null || isNaN(amount)) return '₺0,00';
  return '₺' + amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function ExecutiveAnalyticsScreen() {
  const { colors: theme, isDark } = useAppTheme();
  const { user } = useAuthStore();
  const isTechnician = isTechnicianRole(user?.role);

  // Güvenlik Koruması: Sadece Yönetici ve Müdürler erişebilir
  if (isTechnician) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl }}>
        <Text style={{ fontSize: 56, marginBottom: Spacing.md }}>🔒</Text>
        <Text style={{ fontSize: Typography.fontSize.xl, fontWeight: '800', color: theme.textPrimary, marginBottom: Spacing.xs, textAlign: 'center' }}>
          Yetkisiz Erişim
        </Text>
        <Text style={{ color: theme.textSecondary, textAlign: 'center', marginBottom: Spacing.xl, fontSize: Typography.fontSize.sm, lineHeight: 20 }}>
          Ciro, maliyet ve personel performans raporları ticari gizlilik sebebiyle sadece Atölye Yöneticisi ve Admin yetkisine açıktır.
        </Text>
        <TouchableOpacity
          style={{
            backgroundColor: theme.primary,
            paddingHorizontal: Spacing.xl,
            paddingVertical: Spacing.md,
            borderRadius: BorderRadius.md,
          }}
          onPress={() => router.back()}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: Typography.fontSize.sm }}>Geri Dön</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month' | 'year'>('month');
  const [selectedTechId, setSelectedTechId] = useState<string>('');
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportLoadingMsg, setExportLoadingMsg] = useState<string>('');

  const { data: reportData, isLoading, refetch } = useQuery({
    queryKey: ['executive-analytics', selectedPeriod, selectedTechId],
    queryFn: () => analyticsAPI.getExecutiveSummary({
      period: selectedPeriod,
      technicianId: selectedTechId || undefined,
    }),
  });

  const report = (reportData as any)?.data;
  const overview = report?.overview;
  const technicians: any[] = report?.technicians || [];
  const cashFlow = report?.cashFlow;
  const dailyTrend: any[] = report?.dailyTrend || [];
  const topParts: any[] = report?.topParts || [];
  const topVehicleBrands: any[] = report?.topVehicleBrands || [];

  const selectedTechObj = useMemo(() => {
    if (!selectedTechId) return null;
    return technicians.find(t => t.id === selectedTechId);
  }, [selectedTechId, technicians]);

  const periodLabel = useMemo(() => {
    return PERIOD_OPTIONS.find(p => p.key === selectedPeriod)?.label || 'Dönem';
  }, [selectedPeriod]);

  const fullPeriodDescription = useMemo(() => {
    return selectedTechObj
      ? `${periodLabel} (Personel: ${selectedTechObj.fullName})`
      : `${periodLabel} (Tüm Ekip)`;
  }, [periodLabel, selectedTechObj]);

  const handleOpenExportModal = () => {
    if (!report || !overview) {
      Alert.alert('Bilgi', 'Rapor verisi henüz yüklenmedi veya boş.');
      return;
    }
    setShowExportModal(true);
  };

  // 1. PDF Belgesi Dışa Aktarma
  const handleSharePDF = async () => {
    try {
      setIsExporting(true);
      setExportLoadingMsg('📄 Resmi PDF raporu derleniyor...');
      await exportAndSharePDF(
        report,
        user?.companyName || 'MotorTrack Servis',
        fullPeriodDescription,
        user?.fullName || 'Yönetici'
      );
      setShowExportModal(false);
    } catch (error: any) {
      console.error('PDF export error:', error);
      Alert.alert('Hata', 'PDF raporu oluşturulurken bir hata oluştu.');
    } finally {
      setIsExporting(false);
      setExportLoadingMsg('');
    }
  };

  // 2. Excel Tablosu Dışa Aktarma
  const handleShareExcel = async () => {
    try {
      setIsExporting(true);
      setExportLoadingMsg('📊 Excel elektronik tablosu oluşturuluyor...');
      await exportAndShareExcel(
        report,
        user?.companyName || 'MotorTrack Servis',
        fullPeriodDescription
      );
      setShowExportModal(false);
    } catch (error: any) {
      console.error('Excel export error:', error);
      Alert.alert('Hata', 'Excel tablosu oluşturulurken bir hata oluştu.');
    } finally {
      setIsExporting(false);
      setExportLoadingMsg('');
    }
  };

  // 3. WhatsApp veya Metin Paylaşımı
  const handleShareText = async () => {
    setShowExportModal(false);
    if (!overview) return;
    const techFilterName = selectedTechObj ? ` (Personel: ${selectedTechObj.fullName})` : '';

    let text = `📊 *${user?.companyName || 'MotorTrack'} - ${periodLabel} Finansal & Performans Raporu*${techFilterName}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `💰 *Toplam Ciro:* ${formatCurrencyDetailed(overview.totalRevenue)}\n`;
    text += `📈 *Net Kâr:* ${formatCurrencyDetailed(overview.grossProfit)} (%${overview.grossMargin} Marj)\n`;
    text += `🛠️ *İşçilik Geliri:* ${formatCurrencyDetailed(overview.totalLaborRevenue)}\n`;
    text += `📦 *Parça Satış Hasılatı:* ${formatCurrencyDetailed(overview.totalPartsRevenue)}\n`;
    text += `🧾 *Parça Maliyeti:* ${formatCurrencyDetailed(overview.totalPartsCost)}\n`;
    text += `💳 *Tahsil Edilen:* ${formatCurrencyDetailed(overview.totalPaid)}\n`;
    if (overview.totalReceivables > 0) {
      text += `⚠️ *Açık / Veresiye:* ${formatCurrencyDetailed(overview.totalReceivables)}\n`;
    }
    text += `📋 *İş Emri Sayısı:* ${overview.jobCounts?.total || 0} (${overview.jobCounts?.completed || 0} Tamamlandı)\n`;
    text += `🎯 *Ortalama İş Tutarı:* ${formatCurrencyDetailed(overview.averageTicket)}\n`;

    if (technicians.length > 0 && !selectedTechId) {
      text += `\n👨‍🔧 *Teknisyen Ciro Sıralaması:*\n`;
      technicians.slice(0, 5).forEach((t, i) => {
        text += `${i + 1}. ${t.fullName}: ${formatCurrency(t.totalRevenue)} (İşçilik: ${formatCurrency(t.laborRevenue)} • ${t.completedJobs} iş)\n`;
      });
    }

    text += `\n_MotorTrack Yönetim Paneli üzerinden oluşturuldu._`;

    try {
      await Share.share({
        title: `${periodLabel} Raporu`,
        message: text,
      });
    } catch (e) {
      console.error('Share text error:', e);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top']}>
      {/* ─── Header ─── */}
      <LinearGradient
        colors={[theme.primary, theme.primaryDark || '#312E81'] as [string, string]}
        style={{
          paddingHorizontal: Spacing.lg,
          paddingTop: Spacing.md,
          paddingBottom: Spacing.lg,
          borderBottomLeftRadius: BorderRadius.xl,
          borderBottomRightRadius: BorderRadius.xl,
          ...Shadows.md,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              width: 38,
              height: 38,
              borderRadius: BorderRadius.full,
              backgroundColor: 'rgba(255,255,255,0.2)',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <ArrowLeft size={20} color="#fff" />
          </TouchableOpacity>

          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: Typography.fontSize.lg, fontWeight: '800', color: '#fff' }}>
              📈 Ciro & Personel Analizi
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: Typography.fontSize.xs }}>
              Yönetici Finansal ve Operasyonel Denetim
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleOpenExportModal}
            style={{
              width: 38,
              height: 38,
              borderRadius: BorderRadius.full,
              backgroundColor: 'rgba(255,255,255,0.2)',
              justifyContent: 'center',
              alignItems: 'center',
            }}
            activeOpacity={0.8}
          >
            <Share2 size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Dönem Seçici (Bugün, Hafta, Ay, Yıl) */}
        <View style={{ flexDirection: 'row', gap: 6, backgroundColor: 'rgba(0,0,0,0.2)', padding: 4, borderRadius: BorderRadius.lg, marginTop: Spacing.xs }}>
          {PERIOD_OPTIONS.map(p => {
            const active = selectedPeriod === p.key;
            return (
              <TouchableOpacity
                key={p.key}
                onPress={() => setSelectedPeriod(p.key as any)}
                style={{
                  flex: 1,
                  paddingVertical: 7,
                  alignItems: 'center',
                  borderRadius: BorderRadius.md,
                  backgroundColor: active ? '#FFFFFF' : 'transparent',
                }}
              >
                <Text
                  style={{
                    fontSize: Typography.fontSize.xs,
                    fontWeight: active ? '800' : '600',
                    color: active ? theme.primary : '#FFFFFF',
                  }}
                >
                  {p.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </LinearGradient>

      {/* ─── Personel / Teknisyen Hızlı Filtre Çubuğu ─── */}
      <View style={{ backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border, paddingVertical: 8 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: Spacing.lg, gap: 8 }}>
          <TouchableOpacity
            onPress={() => setSelectedTechId('')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: Spacing.md,
              paddingVertical: 6,
              borderRadius: BorderRadius.full,
              backgroundColor: !selectedTechId ? theme.primary : theme.background,
              borderWidth: 1,
              borderColor: !selectedTechId ? theme.primary : theme.border,
              gap: 4,
            }}
          >
            <Users size={14} color={!selectedTechId ? '#fff' : theme.textSecondary} />
            <Text style={{ fontSize: Typography.fontSize.xs, fontWeight: !selectedTechId ? '800' : '600', color: !selectedTechId ? '#fff' : theme.textSecondary }}>
              👥 Tüm Ekip
            </Text>
          </TouchableOpacity>

          {technicians.map(t => {
            const active = selectedTechId === t.id;
            return (
              <TouchableOpacity
                key={t.id}
                onPress={() => setSelectedTechId(active ? '' : t.id)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: Spacing.md,
                  paddingVertical: 6,
                  borderRadius: BorderRadius.full,
                  backgroundColor: active ? '#6366F1' : theme.background,
                  borderWidth: 1,
                  borderColor: active ? '#6366F1' : theme.border,
                  gap: 4,
                }}
              >
                <Text style={{ fontSize: 12 }}>👨‍🔧</Text>
                <Text style={{ fontSize: Typography.fontSize.xs, fontWeight: active ? '800' : '600', color: active ? '#fff' : theme.textSecondary }}>
                  {t.fullName}
                </Text>
                {t.completedJobs > 0 && (
                  <View style={{ backgroundColor: active ? 'rgba(255,255,255,0.25)' : theme.surfaceElevated, borderRadius: 10, paddingHorizontal: 5, paddingVertical: 1 }}>
                    <Text style={{ fontSize: 9, fontWeight: '700', color: active ? '#fff' : theme.textMuted }}>
                      {t.completedJobs} iş
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ─── Ana İçerik ─── */}
      <ScrollView
        contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={theme.primary} />}
      >
        {isLoading && !report ? (
          <View style={{ paddingVertical: 60, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={{ color: theme.textMuted, marginTop: Spacing.sm, fontSize: Typography.fontSize.sm }}>
              Finansal ve personel raporu hesaplanıyor...
            </Text>
          </View>
        ) : (
          <>
            {/* Personel Filtresi Aktif Uyarısı */}
            {selectedTechObj && (
              <View style={{ backgroundColor: '#6366F115', borderWidth: 1, borderColor: '#6366F1', borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: Typography.fontSize.sm, fontWeight: '800', color: '#6366F1' }}>
                    👨‍🔧 {selectedTechObj.fullName} Filtrelendi
                  </Text>
                  <Text style={{ fontSize: Typography.fontSize.xs, color: theme.textSecondary, marginTop: 2 }}>
                    Aşağıdaki tüm ciro, işçilik ve kâr verileri sadece bu personelin işlerini yansıtır.
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedTechId('')} style={{ backgroundColor: '#6366F1', paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.sm }}>
                  <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>Tüm Ekip ✕</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ─── 1. BÜYÜK CİRO & KÂR KARTLARI ─── */}
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
              {/* Toplam Ciro Kartı */}
              <LinearGradient
                colors={['#1E1B4B', '#312E81']}
                style={{ flex: 1, padding: Spacing.md, borderRadius: BorderRadius.lg, ...Shadows.sm }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <Text style={{ fontSize: 11, color: '#C7D2FE', fontWeight: '700' }}>TOPLAM CİRO</Text>
                  <DollarSign size={16} color="#A5B4FC" />
                </View>
                <Text style={{ fontSize: Typography.fontSize.xl, fontWeight: '900', color: '#FFFFFF' }} numberOfLines={1}>
                  {formatCurrency(overview?.totalRevenue)}
                </Text>
                <Text style={{ fontSize: 10, color: '#E0E7FF', marginTop: 4 }}>
                  {overview?.jobCounts?.total || 0} İş Emri Toplamı
                </Text>
              </LinearGradient>

              {/* Net Kâr Kartı */}
              <LinearGradient
                colors={['#064E3B', '#065F46']}
                style={{ flex: 1, padding: Spacing.md, borderRadius: BorderRadius.lg, ...Shadows.sm }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <Text style={{ fontSize: 11, color: '#A7F3D0', fontWeight: '700' }}>NET KÂR</Text>
                  <TrendingUp size={16} color="#6EE7B7" />
                </View>
                <Text style={{ fontSize: Typography.fontSize.xl, fontWeight: '900', color: '#FFFFFF' }} numberOfLines={1}>
                  {formatCurrency(overview?.grossProfit)}
                </Text>
                <Text style={{ fontSize: 10, color: '#D1FAE5', marginTop: 4 }}>
                  %{overview?.grossMargin || 0} Brüt Kâr Marjı
                </Text>
              </LinearGradient>
            </View>

            {/* ─── 2. DETAYLI GELİR & MALİYET AYRIMI ─── */}
            <View style={{ backgroundColor: theme.surface, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: theme.border, padding: Spacing.md, marginBottom: Spacing.lg, ...Shadows.sm }}>
              <Text style={{ fontSize: Typography.fontSize.xs, fontWeight: '800', color: theme.textSecondary, textTransform: 'uppercase', marginBottom: Spacing.sm }}>
                Gelir & Maliyet Dağılımı
              </Text>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: theme.border }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Wrench size={16} color="#F59E0B" />
                  <Text style={{ fontSize: Typography.fontSize.sm, color: theme.textPrimary, fontWeight: '600' }}>
                    İşçilik Geliri (El Emeği)
                  </Text>
                </View>
                <Text style={{ fontSize: Typography.fontSize.sm, fontWeight: '800', color: '#F59E0B' }}>
                  {formatCurrencyDetailed(overview?.totalLaborRevenue)}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: theme.border }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Package size={16} color="#3B82F6" />
                  <Text style={{ fontSize: Typography.fontSize.sm, color: theme.textPrimary, fontWeight: '600' }}>
                    Parça Satış Hasılatı
                  </Text>
                </View>
                <Text style={{ fontSize: Typography.fontSize.sm, fontWeight: '800', color: '#3B82F6' }}>
                  {formatCurrencyDetailed(overview?.totalPartsRevenue)}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: theme.border }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <AlertTriangle size={16} color="#EF4444" />
                  <Text style={{ fontSize: Typography.fontSize.sm, color: theme.textPrimary, fontWeight: '600' }}>
                    Parça Maliyetleri (Alış)
                  </Text>
                </View>
                <Text style={{ fontSize: Typography.fontSize.sm, fontWeight: '800', color: '#EF4444' }}>
                  -{formatCurrencyDetailed(overview?.totalPartsCost)}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, marginTop: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <CheckCircle2 size={16} color="#10B981" />
                  <Text style={{ fontSize: Typography.fontSize.sm, color: theme.textPrimary, fontWeight: '800' }}>
                    Tahsil Edilen Tutar
                  </Text>
                </View>
                <Text style={{ fontSize: Typography.fontSize.sm, fontWeight: '800', color: '#10B981' }}>
                  {formatCurrencyDetailed(overview?.totalPaid)}
                </Text>
              </View>

              {overview?.totalReceivables > 0 && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#FEF3C7', padding: 8, borderRadius: BorderRadius.sm, marginTop: 4 }}>
                  <Text style={{ fontSize: Typography.fontSize.xs, color: '#92400E', fontWeight: '700' }}>
                    ⚠️ Açık Hesap / Bekleyen Veresiye:
                  </Text>
                  <Text style={{ fontSize: Typography.fontSize.xs, color: '#B45309', fontWeight: '800' }}>
                    {formatCurrencyDetailed(overview.totalReceivables)}
                  </Text>
                </View>
              )}
            </View>

            {/* ─── 3. PERSONEL & TEKNİSYEN PERFORMANS LİDERLİĞİ ─── */}
            <View style={{ marginBottom: Spacing.lg }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Award size={18} color={theme.primary} />
                  <Text style={{ fontSize: Typography.fontSize.base, fontWeight: '800', color: theme.textPrimary }}>
                    Teknisyen & Personel Performansı
                  </Text>
                </View>
                <Text style={{ fontSize: 11, color: theme.textMuted }}>
                  {technicians.length} Personel
                </Text>
              </View>

              <View style={{ gap: Spacing.sm }}>
                {technicians.map((tech, index) => {
                  const rankIcons = ['🥇', '🥈', '🥉'];
                  const rankBadge = index < 3 ? rankIcons[index] : `#${index + 1}`;
                  const isSelected = selectedTechId === tech.id;

                  return (
                    <TouchableOpacity
                      key={tech.id}
                      style={{
                        backgroundColor: theme.surface,
                        borderRadius: BorderRadius.lg,
                        borderWidth: 1.5,
                        borderColor: isSelected ? theme.primary : theme.border,
                        padding: Spacing.md,
                        ...Shadows.sm,
                      }}
                      onPress={() => setSelectedTechId(isSelected ? '' : tech.id)}
                      activeOpacity={0.8}
                    >
                      {/* Üst Kısım: İsim, Sıra ve Ciro */}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                          <Text style={{ fontSize: 20 }}>{rankBadge}</Text>
                          <View>
                            <Text style={{ fontSize: Typography.fontSize.base, fontWeight: '800', color: theme.textPrimary }}>
                              {tech.fullName}
                            </Text>
                            <Text style={{ fontSize: 11, color: theme.textMuted }}>
                              {tech.role === 'TECHNICIAN' ? 'Usta / Teknisyen' : tech.role} • {tech.totalJobs} İş Emri
                            </Text>
                          </View>
                        </View>

                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={{ fontSize: 10, color: theme.textMuted, fontWeight: '600' }}>KAZANDIRDIĞI CİRO</Text>
                          <Text style={{ fontSize: Typography.fontSize.base, fontWeight: '900', color: theme.primary }}>
                            {formatCurrency(tech.totalRevenue)}
                          </Text>
                        </View>
                      </View>

                      {/* İstatistik Çubukları */}
                      <View style={{ backgroundColor: isDark ? theme.surfaceElevated : '#F8FAFC', borderRadius: BorderRadius.md, padding: 8, gap: 4 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={{ fontSize: 11, color: theme.textSecondary }}>🛠️ İşçilik Katkısı:</Text>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#D97706' }}>
                            {formatCurrency(tech.laborRevenue)}
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={{ fontSize: 11, color: theme.textSecondary }}>📦 Taktığı Parça Hasılatı:</Text>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#2563EB' }}>
                            {formatCurrency(tech.partsRevenue)}
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={{ fontSize: 11, color: theme.textSecondary }}>📈 Net Şirket Kâr Katkısı:</Text>
                          <Text style={{ fontSize: 11, fontWeight: '800', color: '#059669' }}>
                            {formatCurrency(tech.netContribution)}
                          </Text>
                        </View>
                      </View>

                      {/* İş Tamamlama & Ortalama */}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 6, borderTopWidth: 1, borderTopColor: theme.border }}>
                        <Text style={{ fontSize: 11, color: theme.textMuted }}>
                          ✅ {tech.completedJobs} Tamamlandı • {tech.inProgressJobs} Devam Ediyor
                        </Text>
                        <Text style={{ fontSize: 11, color: theme.primary, fontWeight: '700' }}>
                          İş Başı: {formatCurrency(tech.averageJobValue)} ➔
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* ─── 4. GÜNLÜK CİRO & KÂR TRENDİ ─── */}
            {dailyTrend.length > 0 && (
              <View style={{ backgroundColor: theme.surface, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: theme.border, padding: Spacing.md, marginBottom: Spacing.lg, ...Shadows.sm }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <BarChart3 size={18} color="#6366F1" />
                    <Text style={{ fontSize: Typography.fontSize.sm, fontWeight: '800', color: theme.textPrimary }}>
                      Günlük Ciro & Kâr Grafiği
                    </Text>
                  </View>
                  <Text style={{ fontSize: 10, color: theme.textMuted }}>Son günler</Text>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                  {dailyTrend.map((day, idx) => {
                    const d = new Date(day.date);
                    const dayLabel = d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
                    return (
                      <View
                        key={idx}
                        style={{
                          backgroundColor: isDark ? theme.surfaceElevated : '#F1F5F9',
                          borderRadius: BorderRadius.md,
                          padding: 8,
                          minWidth: 84,
                          alignItems: 'center',
                          borderWidth: 1,
                          borderColor: theme.border,
                        }}
                      >
                        <Text style={{ fontSize: 10, fontWeight: '700', color: theme.textMuted }}>
                          {dayLabel}
                        </Text>
                        <Text style={{ fontSize: 12, fontWeight: '800', color: theme.primary, marginTop: 4 }}>
                          {formatCurrency(day.totalRevenue)}
                        </Text>
                        <Text style={{ fontSize: 10, color: '#10B981', fontWeight: '700', marginTop: 2 }}>
                          +{formatCurrency(day.profit)}
                        </Text>
                        <Text style={{ fontSize: 9, color: theme.textMuted, marginTop: 2 }}>
                          {day.jobsCount} iş
                        </Text>
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* ─── 5. KASA & GİDER DAĞILIMI ─── */}
            {cashFlow && (
              <View style={{ backgroundColor: theme.surface, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: theme.border, padding: Spacing.md, marginBottom: Spacing.lg, ...Shadows.sm }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm }}>
                  <Text style={{ fontSize: Typography.fontSize.sm, fontWeight: '800', color: theme.textPrimary }}>
                    💵 Kasa Nakit Akışı
                  </Text>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: cashFlow.netCashFlow >= 0 ? '#10B981' : '#EF4444' }}>
                    Net: {formatCurrencyDetailed(cashFlow.netCashFlow)}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                  <View style={{ flex: 1, backgroundColor: '#ECFDF5', padding: 10, borderRadius: BorderRadius.md }}>
                    <Text style={{ fontSize: 10, color: '#047857', fontWeight: '700' }}>TOPLAM GİRİŞ</Text>
                    <Text style={{ fontSize: Typography.fontSize.base, fontWeight: '800', color: '#065F46' }}>
                      {formatCurrencyDetailed(cashFlow.totalCashIn)}
                    </Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: '#FEF2F2', padding: 10, borderRadius: BorderRadius.md }}>
                    <Text style={{ fontSize: 10, color: '#B91C1C', fontWeight: '700' }}>TOPLAM ÇIKIŞ</Text>
                    <Text style={{ fontSize: Typography.fontSize.base, fontWeight: '800', color: '#991B1B' }}>
                      {formatCurrencyDetailed(cashFlow.totalCashOut)}
                    </Text>
                  </View>
                </View>

                {cashFlow.expenseBreakdown?.length > 0 && (
                  <View style={{ borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 8 }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: theme.textMuted, marginBottom: 4 }}>
                      GİDER KATEGORİLERİ:
                    </Text>
                    {cashFlow.expenseBreakdown.map((exp: any, i: number) => (
                      <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 }}>
                        <Text style={{ fontSize: 11, color: theme.textSecondary }}>• {exp.category}:</Text>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#EF4444' }}>
                          {formatCurrencyDetailed(exp.amount)}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* ─── 6. EN ÇOK KAZANDIRAN PARÇALAR & ARAÇLAR ─── */}
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: Spacing.lg }}>
              {/* Parçalar */}
              <View style={{ flex: 1, backgroundColor: theme.surface, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: theme.border, padding: Spacing.md }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: theme.textSecondary, marginBottom: 6 }}>
                  📦 TOP PARÇALAR
                </Text>
                {topParts.length === 0 ? (
                  <Text style={{ fontSize: 11, color: theme.textMuted }}>Kayıt yok</Text>
                ) : (
                  topParts.slice(0, 4).map((p, idx) => (
                    <View key={idx} style={{ paddingVertical: 4, borderBottomWidth: idx < 3 ? 1 : 0, borderBottomColor: theme.border }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: theme.textPrimary }} numberOfLines={1}>
                        {p.name}
                      </Text>
                      <Text style={{ fontSize: 10, color: '#3B82F6', fontWeight: '600' }}>
                        {p.quantity} ad. • {formatCurrency(p.revenue)}
                      </Text>
                    </View>
                  ))
                )}
              </View>

              {/* Araç Markaları */}
              <View style={{ flex: 1, backgroundColor: theme.surface, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: theme.border, padding: Spacing.md }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: theme.textSecondary, marginBottom: 6 }}>
                  🚗 TOP ARAÇLAR
                </Text>
                {topVehicleBrands.length === 0 ? (
                  <Text style={{ fontSize: 11, color: theme.textMuted }}>Kayıt yok</Text>
                ) : (
                  topVehicleBrands.slice(0, 4).map((b, idx) => (
                    <View key={idx} style={{ paddingVertical: 4, borderBottomWidth: idx < 3 ? 1 : 0, borderBottomColor: theme.border }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: theme.textPrimary }} numberOfLines={1}>
                        {b.brand}
                      </Text>
                      <Text style={{ fontSize: 10, color: '#059669', fontWeight: '600' }}>
                        {b.count} araç • {formatCurrency(b.revenue)}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            </View>

            {/* Rapor Dışa Aktar & Paylaş Butonu */}
            <TouchableOpacity
              style={{
                backgroundColor: theme.primary,
                paddingVertical: 14,
                borderRadius: BorderRadius.lg,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 8,
                ...Shadows.md,
              }}
              onPress={handleOpenExportModal}
              activeOpacity={0.85}
            >
              <FileDown size={18} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: Typography.fontSize.base }}>
                📤 Raporu Dışa Aktar & Paylaş (PDF / Excel)
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* ─── Rapor Format Seçim Modalı (PDF / Excel / Metin) ─── */}
      <Modal
        visible={showExportModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isExporting) setShowExportModal(false);
        }}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => {
            if (!isExporting) setShowExportModal(false);
          }}
        >
          <Pressable
            style={[styles.modalSheet, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Modal Tutamaç */}
            <View style={[styles.modalHandle, { backgroundColor: theme.border }]} />

            {/* Modal Başlık */}
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                  📤 Rapor Paylaşım Formatı
                </Text>
                <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
                  {fullPeriodDescription} verilerini tercih ettiğiniz dosya formatında paylaşın
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowExportModal(false)}
                disabled={isExporting}
                style={[styles.closeBtn, { backgroundColor: theme.background }]}
              >
                <X size={18} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Dosya Hazırlanıyor Bildirimi */}
            {isExporting && (
              <View style={[styles.exportingBanner, { backgroundColor: theme.primary + '15', borderColor: theme.primary }]}>
                <ActivityIndicator size="small" color={theme.primary} />
                <Text style={{ fontSize: 13, fontWeight: '700', color: theme.primary, marginLeft: 8 }}>
                  {exportLoadingMsg}
                </Text>
              </View>
            )}

            {/* Seçenek 1: PDF */}
            <TouchableOpacity
              style={[styles.formatCard, { backgroundColor: theme.background, borderColor: theme.border }]}
              onPress={handleSharePDF}
              disabled={isExporting}
              activeOpacity={0.7}
            >
              <View style={[styles.formatIconBox, { backgroundColor: isDark ? '#450a0a' : '#FEE2E2' }]}>
                <FileText size={24} color="#DC2626" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={[styles.formatTitle, { color: theme.textPrimary }]}>
                    📄 PDF Belgesi (.pdf)
                  </Text>
                  <View style={[styles.formatBadge, { backgroundColor: isDark ? '#450a0a' : '#FEE2E2' }]}>
                    <Text style={{ fontSize: 9, fontWeight: '800', color: '#DC2626' }}>A4 BASKIYA HAZIR</Text>
                  </View>
                </View>
                <Text style={[styles.formatDesc, { color: theme.textSecondary }]}>
                  Renkli A4 resmi yönetim raporu. Finansal KPI kartları, personel sıralaması, günlük trend ve kaşe/imza alanları içerir.
                </Text>
              </View>
              <ChevronRight size={16} color={theme.textMuted} />
            </TouchableOpacity>

            {/* Seçenek 2: Excel */}
            <TouchableOpacity
              style={[styles.formatCard, { backgroundColor: theme.background, borderColor: theme.border }]}
              onPress={handleShareExcel}
              disabled={isExporting}
              activeOpacity={0.7}
            >
              <View style={[styles.formatIconBox, { backgroundColor: isDark ? '#064e3b' : '#D1FAE5' }]}>
                <FileSpreadsheet size={24} color="#059669" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={[styles.formatTitle, { color: theme.textPrimary }]}>
                    📊 Excel Tablosu (.csv / Excel)
                  </Text>
                  <View style={[styles.formatBadge, { backgroundColor: isDark ? '#064e3b' : '#D1FAE5' }]}>
                    <Text style={{ fontSize: 9, fontWeight: '800', color: '#059669' }}>TABLO & FORMÜL</Text>
                  </View>
                </View>
                <Text style={[styles.formatDesc, { color: theme.textSecondary }]}>
                  Microsoft Excel ve Google E-Tablolar ile tam uyumlu, Türkçe karakter destekli (UTF-8 BOM), düzenlenebilir tablo.
                </Text>
              </View>
              <ChevronRight size={16} color={theme.textMuted} />
            </TouchableOpacity>

            {/* Seçenek 3: WhatsApp / Hızlı Metin */}
            <TouchableOpacity
              style={[styles.formatCard, { backgroundColor: theme.background, borderColor: theme.border }]}
              onPress={handleShareText}
              disabled={isExporting}
              activeOpacity={0.7}
            >
              <View style={[styles.formatIconBox, { backgroundColor: isDark ? '#082f49' : '#E0F2FE' }]}>
                <MessageSquare size={24} color="#0284C7" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={[styles.formatTitle, { color: theme.textPrimary }]}>
                    💬 WhatsApp / Hızlı Metin
                  </Text>
                  <View style={[styles.formatBadge, { backgroundColor: isDark ? '#082f49' : '#E0F2FE' }]}>
                    <Text style={{ fontSize: 9, fontWeight: '800', color: '#0284C7' }}>ANLIK PAYLAŞIM</Text>
                  </View>
                </View>
                <Text style={[styles.formatDesc, { color: theme.textSecondary }]}>
                  WhatsApp, SMS veya e-posta ile anında iletilebilen biçimlendirilmiş özet metin mesajı.
                </Text>
              </View>
              <ChevronRight size={16} color={theme.textMuted} />
            </TouchableOpacity>

            {/* Kapat Butonu */}
            <TouchableOpacity
              style={[styles.modalCancelBtn, { backgroundColor: theme.background, borderColor: theme.border }]}
              onPress={() => setShowExportModal(false)}
              disabled={isExporting}
            >
              <Text style={{ fontWeight: '700', color: theme.textSecondary, fontSize: Typography.fontSize.sm }}>
                Vazgeç
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl + 12,
    ...Shadows.lg,
  },
  modalHandle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  modalTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '800',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: Typography.fontSize.xs,
    lineHeight: 18,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.sm,
  },
  exportingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  formatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    gap: 12,
  },
  formatIconBox: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formatTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '800',
  },
  formatBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  formatDesc: {
    fontSize: Typography.fontSize.xs - 1,
    marginTop: 4,
    lineHeight: 16,
  },
  modalCancelBtn: {
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    marginTop: Spacing.xs,
  },
});

