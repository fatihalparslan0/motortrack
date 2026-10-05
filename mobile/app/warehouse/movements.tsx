import React, { useMemo, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl, ScrollView,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { stockAPI, warehouseAPI, partsAPI } from '../../src/api/client';
import { Typography, Spacing, BorderRadius, Shadows } from '../../src/constants/theme';
import { useAppTheme } from '../../src/hooks/useAppTheme';
import { useAuthStore, isTechnicianRole } from '../../src/store/auth.store';
import {
  ArrowLeft, Search, X, ArrowLeftRight, ArrowDownLeft,
  ArrowUpRight, RefreshCw, Filter, Warehouse, Clock, User,
  Package, DollarSign, TrendingUp, Calendar, ChevronDown,
  Check, Tag, FileText, Info
} from 'lucide-react-native';

const TYPE_FILTERS = [
  { key: '', label: 'Tümü', icon: '📋' },
  { key: 'IN', label: '📥 Girişler', color: '#10B981' },
  { key: 'OUT', label: '📤 Çıkışlar', color: '#EF4444' },
  { key: 'TRANSFER', label: '🔄 Transferler', color: '#6366F1' },
  { key: 'IADE', label: '↩️ İadeler', color: '#F59E0B' },
  { key: 'ADJUSTMENT', label: '✏️ Düzeltmeler', color: '#8B5CF6' },
];

const DATE_FILTERS = [
  { key: 'ALL', label: 'Tüm Zamanlar' },
  { key: 'TODAY', label: 'Bugün' },
  { key: 'WEEK', label: 'Son 7 Gün' },
  { key: 'MONTH', label: 'Bu Ay' },
];

const MOVEMENT_CONFIG: Record<string, { label: string; color: string; sign: string; icon: string; bg: string }> = {
  SATIN_ALMA: { label: 'Satın Alma (Giriş)', color: '#10B981', sign: '+', icon: '📥', bg: '#10B98118' },
  IS_EMRI_KULLANIMI: { label: 'İş Emri Kullanımı', color: '#EF4444', sign: '-', icon: '🛠️', bg: '#EF444418' },
  SATIS: { label: 'Doğrudan Satış', color: '#EF4444', sign: '-', icon: '💰', bg: '#EF444418' },
  ATOLYE_SARFI: { label: 'Atölye Hızlı Sarf', color: '#F97316', sign: '-', icon: '⚡', bg: '#F9731618' },
  IADE: { label: 'Parçacıya İade', color: '#F59E0B', sign: '-', icon: '↩️', bg: '#F59E0B18' },
  FIRE: { label: 'Fire / Zayi', color: '#DC2626', sign: '-', icon: '🔥', bg: '#DC262618' },
  DUZELTME: { label: 'Stok Düzeltme', color: '#8B5CF6', sign: '±', icon: '✏️', bg: '#8B5CF618' },
  DEPO_TRANSFERI: { label: 'Depo Transferi', color: '#6366F1', sign: '↔', icon: '🔄', bg: '#6366F118' },
  IN: { label: 'Stok Girişi', color: '#10B981', sign: '+', icon: '📥', bg: '#10B98118' },
  OUT: { label: 'Stok Çıkışı', color: '#EF4444', sign: '-', icon: '📤', bg: '#EF444418' },
  TRANSFER: { label: 'Transfer', color: '#6366F1', sign: '↔', icon: '🔄', bg: '#6366F118' },
  ADJUSTMENT: { label: 'Düzeltme', color: '#8B5CF6', sign: '±', icon: '✏️', bg: '#8B5CF618' },
};

const formatCurrency = (amount?: number | null) => {
  if (amount === undefined || amount === null || isNaN(amount)) return '₺0,00';
  return '₺' + amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function StockMovementsScreen() {
  const { colors: theme, isDark } = useAppTheme();
  const { user } = useAuthStore();
  const isTechnician = isTechnicianRole(user?.role);

  if (isTechnician) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl }}>
        <Text style={{ fontSize: 56, marginBottom: Spacing.md }}>🔒</Text>
        <Text style={{ fontSize: Typography.fontSize.xl, fontWeight: '800', color: theme.textPrimary, marginBottom: Spacing.xs, textAlign: 'center' }}>
          Yetkisiz Erişim
        </Text>
        <Text style={{ color: theme.textSecondary, textAlign: 'center', marginBottom: Spacing.xl, fontSize: Typography.fontSize.sm, lineHeight: 20 }}>
          Depo ve stok hareketleri maliyet denetim geçmişi sadece Atölye Yöneticisi ve Admin yetkisine açıktır.
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

  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [selectedPart, setSelectedPart] = useState<any | null>(null);
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH'>('ALL');
  const [showPartModal, setShowPartModal] = useState(false);
  const [partSearch, setPartSearch] = useState('');

  // Depoları çek
  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehouseAPI.getAll(),
  });
  const warehouses: any[] = (warehousesData as any)?.data || [];

  // Parçaları çek (Malzeme seçici için)
  const { data: partsData } = useQuery({
    queryKey: ['parts-for-selector'],
    queryFn: () => partsAPI.getAll({ limit: 150 }),
  });
  const allParts: any[] = (partsData as any)?.data || [];

  // Tarih aralığı hesapla
  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    if (dateFilter === 'TODAY') {
      const todayStr = now.toISOString().split('T')[0];
      return { startDate: todayStr, endDate: todayStr };
    }
    if (dateFilter === 'WEEK') {
      const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { startDate: past.toISOString().split('T')[0], endDate: now.toISOString().split('T')[0] };
    }
    if (dateFilter === 'MONTH') {
      const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return { startDate: past.toISOString().split('T')[0], endDate: now.toISOString().split('T')[0] };
    }
    return { startDate: undefined, endDate: undefined };
  }, [dateFilter]);

  // Filtrelenmiş hareketleri çek
  const { data: movementsData, isLoading, refetch } = useQuery({
    queryKey: ['stock-movements-query', selectedWarehouseId, selectedPart?.id, selectedType, search, startDate, endDate],
    queryFn: () => stockAPI.getMovements({
      warehouseId: selectedWarehouseId || undefined,
      partId: selectedPart?.id || undefined,
      movementType: selectedType || undefined,
      search: search.trim() || undefined,
      startDate,
      endDate,
      limit: 200,
    }),
  });

  const movements: any[] = (movementsData as any)?.data || [];

  // İstatistik ve Finansal Hesaplamalar
  const stats = useMemo(() => {
    let totalInQty = 0;
    let totalOutQty = 0;
    let totalTransferCount = 0;
    let totalInCost = 0;
    let totalOutSelling = 0;
    let totalOutCost = 0;

    movements.forEach(m => {
      const type = m.movementType;
      const q = m.quantity || 0;
      const cost = m.totalCost || (m.unitCost ? m.unitCost * q : 0);
      const selling = m.totalSelling || (m.sellingPrice ? m.sellingPrice * q : 0);

      if (['SATIN_ALMA', 'IN', 'IADE'].includes(type)) {
        totalInQty += q;
        totalInCost += cost;
      } else if (['IS_EMRI_KULLANIMI', 'SATIS', 'FIRE', 'OUT', 'ATOLYE_SARFI'].includes(type)) {
        totalOutQty += q;
        totalOutSelling += selling;
        totalOutCost += cost;
      } else if (['DEPO_TRANSFERI', 'TRANSFER'].includes(type)) {
        totalTransferCount += 1;
      }
    });

    const netProfit = totalOutSelling - totalOutCost;
    const profitMargin = totalOutSelling > 0 ? ((netProfit / totalOutSelling) * 100).toFixed(1) : '0';

    return {
      count: movements.length,
      totalInQty,
      totalOutQty,
      totalTransferCount,
      totalInCost,
      totalOutSelling,
      totalOutCost,
      netProfit,
      profitMargin,
    };
  }, [movements]);

  const hasActiveFilters = Boolean(search || selectedType || selectedWarehouseId || selectedPart || dateFilter !== 'ALL');

  const resetFilters = () => {
    setSearch('');
    setSelectedType('');
    setSelectedWarehouseId('');
    setSelectedPart(null);
    setDateFilter('ALL');
  };

  // Malzeme arama filtreleme
  const filteredPartsForModal = useMemo(() => {
    if (!partSearch.trim()) return allParts;
    const q = partSearch.trim().toLowerCase();
    return allParts.filter(p =>
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.sku && p.sku.toLowerCase().includes(q)) ||
      (p.brand && p.brand.toLowerCase().includes(q)) ||
      (p.oemCode && p.oemCode.toLowerCase().includes(q))
    );
  }, [allParts, partSearch]);

  const selectedWarehouseObj = useMemo(() => {
    if (!selectedWarehouseId) return null;
    return warehouses.find(w => w.id === selectedWarehouseId);
  }, [selectedWarehouseId, warehouses]);

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
              📊 Stok & Maliyet Hareketleri
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: Typography.fontSize.xs }}>
              Depo, malzeme ve fiyat bazlı detaylı denetim
            </Text>
          </View>

          {hasActiveFilters ? (
            <TouchableOpacity
              onPress={resetFilters}
              style={{
                backgroundColor: 'rgba(255,255,255,0.25)',
                paddingHorizontal: Spacing.sm,
                paddingVertical: 5,
                borderRadius: BorderRadius.full,
              }}
            >
              <Text style={{ color: '#fff', fontSize: Typography.fontSize.xs, fontWeight: '700' }}>Temizle</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 38 }} />
          )}
        </View>

        {/* Canlı Arama Çubuğu */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.surface,
            borderRadius: BorderRadius.lg,
            paddingHorizontal: Spacing.md,
            height: 44,
            marginTop: Spacing.sm,
            ...Shadows.sm,
          }}
        >
          <Search size={18} color={theme.textMuted} style={{ marginRight: Spacing.xs }} />
          <TextInput
            style={{
              flex: 1,
              color: theme.textPrimary,
              fontSize: Typography.fontSize.sm,
            }}
            placeholder="Malzeme adı, marka, SKU, OEM, evrak no..."
            placeholderTextColor={theme.textMuted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <X size={18} color={theme.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Malzeme Seçimi & Hızlı Seçim Butonu */}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: Spacing.sm }}>
          <TouchableOpacity
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: selectedPart ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.2)',
              paddingHorizontal: Spacing.md,
              paddingVertical: 8,
              borderRadius: BorderRadius.md,
            }}
            onPress={() => setShowPartModal(true)}
            activeOpacity={0.8}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
              <Package size={16} color={selectedPart ? theme.primary : '#fff'} />
              <Text
                numberOfLines={1}
                style={{
                  fontSize: Typography.fontSize.xs,
                  fontWeight: '700',
                  color: selectedPart ? theme.primary : '#fff',
                }}
              >
                {selectedPart ? `📦 ${selectedPart.name} (${selectedPart.brand || 'Genel'})` : '📦 Malzeme Bazlı Filtrele...'}
              </Text>
            </View>
            {selectedPart ? (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  setSelectedPart(null);
                }}
                style={{ padding: 2 }}
              >
                <X size={16} color={theme.danger} />
              </TouchableOpacity>
            ) : (
              <ChevronDown size={16} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* ─── Seçili Malzeme Detay Kartı (Malzeme Filtresi Aktifken) ─── */}
      {selectedPart && (
        <View
          style={{
            marginHorizontal: Spacing.lg,
            marginTop: Spacing.sm,
            padding: Spacing.md,
            backgroundColor: isDark ? theme.surfaceElevated : '#F0FDF4',
            borderRadius: BorderRadius.lg,
            borderWidth: 1.5,
            borderColor: isDark ? '#059669' : '#86EFAC',
            ...Shadows.sm,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: Typography.fontSize.base, fontWeight: '800', color: theme.textPrimary }}>
                {selectedPart.name}
              </Text>
              <Text style={{ fontSize: Typography.fontSize.xs, color: theme.textMuted }}>
                {selectedPart.brand ? `${selectedPart.brand} • ` : ''}SKU: {selectedPart.sku || 'Belirtilmedi'}
                {selectedPart.oemCode ? ` • OEM: ${selectedPart.oemCode}` : ''}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedPart(null)} style={{ padding: 4 }}>
              <Text style={{ fontSize: 11, color: theme.danger, fontWeight: '700' }}>Kaldır ✕</Text>
            </TouchableOpacity>
          </View>

          {/* Fiyat ve Stok Özeti */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', backgroundColor: theme.surface, padding: Spacing.sm, borderRadius: BorderRadius.md }}>
            <View>
              <Text style={{ fontSize: 10, color: theme.textMuted, fontWeight: '600' }}>MEVCUT STOK</Text>
              <Text style={{ fontSize: Typography.fontSize.sm, fontWeight: '800', color: theme.primary }}>
                {selectedPart.quantity ?? 0} {selectedPart.unit || 'adet'}
              </Text>
            </View>
            <View>
              <Text style={{ fontSize: 10, color: theme.textMuted, fontWeight: '600' }}>ALIŞ FİYATI</Text>
              <Text style={{ fontSize: Typography.fontSize.sm, fontWeight: '700', color: '#10B981' }}>
                {formatCurrency(selectedPart.purchasePrice ? Number(selectedPart.purchasePrice) : 0)}
              </Text>
            </View>
            <View>
              <Text style={{ fontSize: 10, color: theme.textMuted, fontWeight: '600' }}>SATIŞ FİYATI</Text>
              <Text style={{ fontSize: Typography.fontSize.sm, fontWeight: '700', color: '#3B82F6' }}>
                {formatCurrency(selectedPart.sellingPrice ? Number(selectedPart.sellingPrice) : 0)}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* ─── Depo, Tür & Tarih Filtre Barı ─── */}
      <View style={{ backgroundColor: theme.background, paddingTop: Spacing.sm, borderBottomWidth: 1, borderBottomColor: theme.border }}>
        {/* Depo Filtresi */}
        <View style={{ paddingHorizontal: Spacing.lg, marginBottom: 6 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: theme.textMuted, textTransform: 'uppercase' }}>
              🏢 Depo Bazlı Filtreleme
            </Text>
            {selectedWarehouseObj && (
              <Text style={{ fontSize: 10, color: theme.primary, fontWeight: '700' }}>
                Aktif Depo: {selectedWarehouseObj.name}
              </Text>
            )}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.xs }}>
            <TouchableOpacity
              onPress={() => setSelectedWarehouseId('')}
              style={{
                paddingHorizontal: Spacing.md,
                paddingVertical: 5,
                borderRadius: BorderRadius.full,
                backgroundColor: !selectedWarehouseId ? theme.primary : theme.surface,
                borderWidth: 1,
                borderColor: !selectedWarehouseId ? theme.primary : theme.border,
              }}
            >
              <Text
                style={{
                  fontSize: Typography.fontSize.xs,
                  fontWeight: !selectedWarehouseId ? '700' : '500',
                  color: !selectedWarehouseId ? '#fff' : theme.textSecondary,
                }}
              >
                🏢 Tüm Depolar
              </Text>
            </TouchableOpacity>

            {warehouses.map((w: any) => {
              const active = selectedWarehouseId === w.id;
              return (
                <TouchableOpacity
                  key={w.id}
                  onPress={() => setSelectedWarehouseId(active ? '' : w.id)}
                  style={{
                    paddingHorizontal: Spacing.md,
                    paddingVertical: 5,
                    borderRadius: BorderRadius.full,
                    backgroundColor: active ? '#6366F1' : theme.surface,
                    borderWidth: 1,
                    borderColor: active ? '#6366F1' : theme.border,
                  }}
                >
                  <Text
                    style={{
                      fontSize: Typography.fontSize.xs,
                      fontWeight: active ? '700' : '500',
                      color: active ? '#fff' : theme.textSecondary,
                    }}
                  >
                    📍 {w.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* İşlem Tipi Filtresi */}
        <View style={{ paddingHorizontal: Spacing.lg, marginBottom: 6 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.xs }}>
            {TYPE_FILTERS.map(t => {
              const active = selectedType === t.key;
              return (
                <TouchableOpacity
                  key={t.key}
                  onPress={() => setSelectedType(active ? '' : t.key)}
                  style={{
                    paddingHorizontal: Spacing.sm,
                    paddingVertical: 4,
                    borderRadius: BorderRadius.full,
                    backgroundColor: active ? (t.color || theme.primary) : theme.surface,
                    borderWidth: 1,
                    borderColor: active ? (t.color || theme.primary) : theme.border,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: active ? '700' : '500',
                      color: active ? '#fff' : theme.textSecondary,
                    }}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Tarih Aralığı Filtresi */}
        <View style={{ paddingHorizontal: Spacing.lg, paddingBottom: 6 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.xs }}>
            {DATE_FILTERS.map(d => {
              const active = dateFilter === d.key;
              return (
                <TouchableOpacity
                  key={d.key}
                  onPress={() => setDateFilter(d.key as any)}
                  style={{
                    paddingHorizontal: Spacing.sm,
                    paddingVertical: 3,
                    borderRadius: BorderRadius.sm,
                    backgroundColor: active ? (isDark ? theme.surfaceElevated : '#E0E7FF') : 'transparent',
                    borderWidth: 1,
                    borderColor: active ? theme.primary : 'transparent',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: active ? '700' : '500',
                      color: active ? theme.primary : theme.textMuted,
                    }}
                  >
                    📅 {d.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>

      {/* ─── Finansal & Maliyet Analiz Kartları ─── */}
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: theme.surface,
          paddingVertical: Spacing.sm,
          paddingHorizontal: Spacing.md,
          marginHorizontal: Spacing.lg,
          marginTop: Spacing.sm,
          borderRadius: BorderRadius.lg,
          borderWidth: 1,
          borderColor: theme.border,
          justifyContent: 'space-between',
          ...Shadows.sm,
        }}
      >
        <View style={{ alignItems: 'center', flex: 1 }}>
          <Text style={{ fontSize: 9, color: theme.textMuted, fontWeight: '700' }}>TOPLAM GİRİŞ</Text>
          <Text style={{ fontSize: Typography.fontSize.sm, fontWeight: '800', color: '#10B981' }}>
            +{stats.totalInQty} ad.
          </Text>
          <Text style={{ fontSize: 10, color: '#10B981', fontWeight: '600' }}>
            {formatCurrency(stats.totalInCost)}
          </Text>
        </View>

        <View style={{ width: 1, backgroundColor: theme.border }} />

        <View style={{ alignItems: 'center', flex: 1 }}>
          <Text style={{ fontSize: 9, color: theme.textMuted, fontWeight: '700' }}>TOPLAM ÇIKIŞ</Text>
          <Text style={{ fontSize: Typography.fontSize.sm, fontWeight: '800', color: '#EF4444' }}>
            -{stats.totalOutQty} ad.
          </Text>
          <Text style={{ fontSize: 10, color: '#EF4444', fontWeight: '600' }}>
            {formatCurrency(stats.totalOutSelling)}
          </Text>
        </View>

        <View style={{ width: 1, backgroundColor: theme.border }} />

        <View style={{ alignItems: 'center', flex: 1 }}>
          <Text style={{ fontSize: 9, color: theme.textMuted, fontWeight: '700' }}>NET KÂR</Text>
          <Text
            style={{
              fontSize: Typography.fontSize.sm,
              fontWeight: '800',
              color: stats.netProfit >= 0 ? '#10B981' : '#EF4444',
            }}
          >
            {formatCurrency(stats.netProfit)}
          </Text>
          <Text style={{ fontSize: 9, color: theme.textMuted, fontWeight: '600' }}>
            %{stats.profitMargin} Marj
          </Text>
        </View>

        <View style={{ width: 1, backgroundColor: theme.border }} />

        <View style={{ alignItems: 'center', flex: 0.8 }}>
          <Text style={{ fontSize: 9, color: theme.textMuted, fontWeight: '700' }}>KAYIT</Text>
          <Text style={{ fontSize: Typography.fontSize.sm, fontWeight: '800', color: theme.textPrimary }}>
            {stats.count}
          </Text>
          <Text style={{ fontSize: 9, color: '#6366F1', fontWeight: '600' }}>
            {stats.totalTransferCount} Trns.
          </Text>
        </View>
      </View>

      {/* ─── Hareket Listesi ─── */}
      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={{ color: theme.textMuted, marginTop: Spacing.sm, fontSize: Typography.fontSize.xs }}>
            Kayıtlar ve maliyet bilgileri sorgulanıyor...
          </Text>
        </View>
      ) : (
        <FlatList
          data={movements}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 80, gap: Spacing.sm }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={theme.primary} />}
          renderItem={({ item }) => {
            const config = MOVEMENT_CONFIG[item.movementType] || {
              label: item.movementType,
              color: theme.textMuted,
              sign: '•',
              icon: '📋',
              bg: theme.surface,
            };

            const isTransfer = ['DEPO_TRANSFERI', 'TRANSFER'].includes(item.movementType);
            const isOut = ['IS_EMRI_KULLANIMI', 'SATIS', 'FIRE', 'OUT', 'ATOLYE_SARFI'].includes(item.movementType);
            const isIn = ['SATIN_ALMA', 'IN', 'IADE'].includes(item.movementType);

            // Depo bilgisi
            const warehouseName = item.warehouse?.name || 'Ana Depo';

            // Fiyat ve Maliyet Hesapları
            const unitCost = item.unitCost !== null && item.unitCost !== undefined ? Number(item.unitCost) : Number(item.part?.purchasePrice || 0);
            const sellingPrice = item.sellingPrice !== null && item.sellingPrice !== undefined ? Number(item.sellingPrice) : Number(item.part?.sellingPrice || 0);
            const totalCost = item.totalCost ?? (unitCost * (item.quantity || 0));
            const totalSelling = item.totalSelling ?? (sellingPrice * (item.quantity || 0));
            const profit = item.profit ?? (totalSelling - totalCost);
            const profitMargin = item.profitMargin ?? (totalSelling > 0 ? ((profit / totalSelling) * 100).toFixed(1) : 0);

            return (
              <View
                style={{
                  backgroundColor: theme.surface,
                  borderRadius: BorderRadius.lg,
                  borderWidth: 1,
                  borderColor: isTransfer ? '#6366F140' : theme.border,
                  padding: Spacing.md,
                  ...Shadows.sm,
                }}
              >
                {/* 1. Üst Kısım: Rozet, Depo ve Miktar */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: config.bg,
                        paddingHorizontal: Spacing.sm,
                        paddingVertical: 3,
                        borderRadius: BorderRadius.sm,
                        gap: 4,
                      }}
                    >
                      <Text style={{ fontSize: 12 }}>{config.icon}</Text>
                      <Text style={{ fontSize: Typography.fontSize.xs, fontWeight: '700', color: config.color }}>
                        {config.label}
                      </Text>
                    </View>

                    {/* Depo Rozeti */}
                    <View style={{ backgroundColor: theme.background, borderWidth: 1, borderColor: theme.border, borderRadius: BorderRadius.sm, paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ fontSize: 10, fontWeight: '600', color: theme.textSecondary }}>
                        📍 {warehouseName}
                      </Text>
                    </View>
                  </View>

                  {/* Miktar */}
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
                    <Text
                      style={{
                        fontSize: Typography.fontSize.lg,
                        fontWeight: '800',
                        color: isTransfer ? '#6366F1' : (isOut ? theme.danger : theme.success),
                      }}
                    >
                      {config.sign}{item.quantity}
                    </Text>
                    <Text style={{ fontSize: Typography.fontSize.xs, color: theme.textMuted, fontWeight: '600' }}>
                      {item.part?.unit || 'adet'}
                    </Text>
                  </View>
                </View>

                {/* 2. Orta Kısım: Malzeme Adı, Marka & Kodlar */}
                <Text style={{ fontSize: Typography.fontSize.base, fontWeight: '700', color: theme.textPrimary, marginBottom: 2 }}>
                  {item.part?.name || 'Malzeme'}
                </Text>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                  {Boolean(item.part?.brand) && (
                    <Text style={{ fontSize: Typography.fontSize.xs, color: theme.textMuted }}>
                      🏷️ {item.part.brand}
                    </Text>
                  )}
                  {Boolean(item.part?.sku) && (
                    <Text style={{ fontSize: Typography.fontSize.xs, color: theme.textMuted }}>
                      • SKU: {item.part.sku}
                    </Text>
                  )}
                  {Boolean(item.part?.oemCode) && (
                    <Text style={{ fontSize: Typography.fontSize.xs, color: theme.textMuted }}>
                      • OEM: {item.part.oemCode}
                    </Text>
                  )}
                </View>

                {/* 3. Fiyat ve Maliyet Analiz Tablosu */}
                <View
                  style={{
                    backgroundColor: isDark ? theme.surfaceElevated : '#F8FAFC',
                    borderRadius: BorderRadius.md,
                    padding: Spacing.sm,
                    marginBottom: 8,
                    borderWidth: 1,
                    borderColor: theme.border,
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <View>
                      <Text style={{ fontSize: 10, color: theme.textMuted, fontWeight: '600' }}>BİRİM ALIŞ / MALİYET</Text>
                      <Text style={{ fontSize: Typography.fontSize.xs, fontWeight: '700', color: '#059669' }}>
                        {formatCurrency(unitCost)}
                      </Text>
                    </View>

                    <View>
                      <Text style={{ fontSize: 10, color: theme.textMuted, fontWeight: '600' }}>BİRİM SATIŞ</Text>
                      <Text style={{ fontSize: Typography.fontSize.xs, fontWeight: '700', color: '#2563EB' }}>
                        {formatCurrency(sellingPrice)}
                      </Text>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 10, color: theme.textMuted, fontWeight: '600' }}>TOPLAM MALİYET</Text>
                      <Text style={{ fontSize: Typography.fontSize.xs, fontWeight: '800', color: isOut ? theme.danger : '#059669' }}>
                        {formatCurrency(totalCost)}
                      </Text>
                    </View>
                  </View>

                  {/* Kâr veya Satış Bilgisi (Çıkışlarda) */}
                  {isOut && totalSelling > 0 && (
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderTopWidth: 1,
                        borderTopColor: theme.border,
                        paddingTop: 4,
                        marginTop: 2,
                      }}
                    >
                      <Text style={{ fontSize: 10, color: theme.textSecondary }}>
                        Toplam Satış Hacmi: <Text style={{ fontWeight: '700', color: theme.textPrimary }}>{formatCurrency(totalSelling)}</Text>
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: profit >= 0 ? '#10B981' : '#EF4444' }}>
                          Kâr: {formatCurrency(profit)} (%{profitMargin})
                        </Text>
                      </View>
                    </View>
                  )}
                </View>

                {/* 4. Transfer veya Depo Vurgusu */}
                {isTransfer && (
                  <View
                    style={{
                      backgroundColor: '#6366F112',
                      borderRadius: BorderRadius.md,
                      paddingHorizontal: Spacing.sm,
                      paddingVertical: 6,
                      marginBottom: 6,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <ArrowLeftRight size={14} color="#6366F1" />
                    <Text style={{ fontSize: Typography.fontSize.xs, color: '#6366F1', fontWeight: '700', flex: 1 }}>
                      {item.notes || 'Depolar arası transfer işlemi'}
                    </Text>
                  </View>
                )}

                {/* Evrak / Belge No & İş Emri Bilgisi */}
                {Boolean(item.documentNo || item.referenceType || item.motor) && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
                    {Boolean(item.documentNo) && (
                      <View style={{ backgroundColor: theme.primary + '12', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                        <Text style={{ fontSize: 10, color: theme.primary, fontWeight: '700' }}>
                          📄 Evrak No: {item.documentNo}
                        </Text>
                      </View>
                    )}
                    {Boolean(item.motor) && (
                      <View style={{ backgroundColor: '#00339915', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                        <Text style={{ fontSize: 10, color: '#003399', fontWeight: '700' }}>
                          ⚙️ {item.motor?.brand} {item.motor?.model} ({item.motor?.serialNumber})
                        </Text>
                      </View>
                    )}
                    {Boolean(item.referenceType) && (
                      <View style={{ backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                        <Text style={{ fontSize: 10, color: theme.textMuted }}>
                          Ref: {item.referenceType}
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Not (Transfer dışındakiler için) */}
                {!isTransfer && item.notes ? (
                  <Text
                    style={{
                      fontSize: Typography.fontSize.xs,
                      color: theme.textSecondary,
                      fontStyle: 'italic',
                      backgroundColor: theme.surfaceElevated || theme.background,
                      padding: 6,
                      borderRadius: 4,
                      marginBottom: 6,
                    }}
                  >
                    "{item.notes}"
                  </Text>
                ) : null}

                {/* 5. Alt Kısım: Tarih & Kullanıcı */}
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderTopWidth: 1,
                    borderTopColor: theme.borderLight || theme.border,
                    paddingTop: 6,
                    marginTop: 2,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <User size={12} color={theme.textMuted} />
                    <Text style={{ fontSize: 11, color: theme.textMuted }}>
                      {item.user?.fullName || 'Sistem'}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Clock size={12} color={theme.textMuted} />
                    <Text style={{ fontSize: 11, color: theme.textMuted }}>
                      {new Date(item.createdAt).toLocaleString('tr-TR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 60 }}>
              <Text style={{ fontSize: 52, marginBottom: Spacing.sm }}>🔍</Text>
              <Text style={{ fontSize: Typography.fontSize.lg, fontWeight: '700', color: theme.textPrimary, marginBottom: 4 }}>
                Hareket Bulunamadı
              </Text>
              <Text style={{ fontSize: Typography.fontSize.sm, color: theme.textMuted, textAlign: 'center', paddingHorizontal: 40, marginBottom: Spacing.md }}>
                Seçilen filtrelere, depoya veya arama terimine uygun stok hareketi bulunmuyor.
              </Text>
              {hasActiveFilters && (
                <TouchableOpacity
                  onPress={resetFilters}
                  style={{
                    backgroundColor: theme.primary,
                    paddingHorizontal: Spacing.lg,
                    paddingVertical: 10,
                    borderRadius: BorderRadius.full,
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: Typography.fontSize.sm }}>
                    Filtreleri Temizle
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {/* ─── Malzeme Seçim Modalı (Malzeme Bazlı Filtreleme) ─── */}
      <Modal visible={showPartModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowPartModal(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
          {/* Modal Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: theme.border }}>
            <View>
              <Text style={{ fontSize: Typography.fontSize.lg, fontWeight: '800', color: theme.textPrimary }}>
                📦 Malzeme Seçin
              </Text>
              <Text style={{ fontSize: Typography.fontSize.xs, color: theme.textMuted }}>
                Tüm hareketlerini ve maliyetini görmek istediğiniz parçayı seçin
              </Text>
            </View>
            <TouchableOpacity onPress={() => setShowPartModal(false)} style={{ padding: 4 }}>
              <Text style={{ color: theme.primary, fontWeight: '700', fontSize: Typography.fontSize.base }}>Kapat</Text>
            </TouchableOpacity>
          </View>

          {/* Modal Arama */}
          <View style={{ padding: Spacing.lg, paddingBottom: Spacing.sm }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: theme.surface,
                borderRadius: BorderRadius.md,
                borderWidth: 1,
                borderColor: theme.border,
                paddingHorizontal: Spacing.md,
                height: 44,
                gap: 8,
              }}
            >
              <Search size={18} color={theme.textMuted} />
              <TextInput
                style={{ flex: 1, color: theme.textPrimary, fontSize: Typography.fontSize.base }}
                placeholder="Malzeme adı, marka, SKU veya OEM ara..."
                placeholderTextColor={theme.textMuted}
                value={partSearch}
                onChangeText={setPartSearch}
                autoFocus
              />
              {partSearch.length > 0 && (
                <TouchableOpacity onPress={() => setPartSearch('')}>
                  <Text style={{ color: theme.textMuted, fontSize: 16 }}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Malzeme Listesi */}
          <FlatList
            data={filteredPartsForModal}
            keyExtractor={item => item.id}
            contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: 40 }}
            renderItem={({ item }) => {
              const isSelected = selectedPart?.id === item.id;
              const pPrice = item.purchasePrice ? Number(item.purchasePrice) : 0;
              const sPrice = item.sellingPrice ? Number(item.sellingPrice) : 0;
              return (
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: theme.border,
                    backgroundColor: isSelected ? theme.primary + '12' : 'transparent',
                    paddingHorizontal: isSelected ? Spacing.sm : 0,
                    borderRadius: isSelected ? BorderRadius.sm : 0,
                  }}
                  onPress={() => {
                    setSelectedPart(item);
                    setShowPartModal(false);
                    setPartSearch('');
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: Typography.fontSize.base, fontWeight: isSelected ? '800' : '600', color: isSelected ? theme.primary : theme.textPrimary }}>
                      {item.name}
                    </Text>
                    <Text style={{ fontSize: Typography.fontSize.xs, color: theme.textMuted, marginTop: 2 }}>
                      {item.brand ? `${item.brand} • ` : ''}SKU: {item.sku || '-'} {item.oemCode ? `• OEM: ${item.oemCode}` : ''}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                      <Text style={{ fontSize: 11, color: '#059669', fontWeight: '600' }}>
                        Alış: {formatCurrency(pPrice)}
                      </Text>
                      <Text style={{ fontSize: 11, color: '#2563EB', fontWeight: '600' }}>
                        Satış: {formatCurrency(sPrice)}
                      </Text>
                    </View>
                  </View>

                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <View style={{ backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 8, paddingVertical: 2, borderRadius: BorderRadius.full }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: theme.textPrimary }}>
                        {item.quantity ?? 0} {item.unit || 'adet'}
                      </Text>
                    </View>
                    {isSelected && <Check size={18} color={theme.primary} />}
                  </View>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={{ padding: Spacing.xl, alignItems: 'center' }}>
                <Text style={{ color: theme.textMuted, textAlign: 'center' }}>
                  Aramanızla eşleşen malzeme bulunamadı.
                </Text>
              </View>
            }
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
