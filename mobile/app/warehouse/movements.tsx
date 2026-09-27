import React, { useMemo, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { stockAPI, warehouseAPI } from '../../src/api/client';
import { Typography, Spacing, BorderRadius, Shadows } from '../../src/constants/theme';
import { useAppTheme } from '../../src/hooks/useAppTheme';
import {
  ArrowLeft, Search, X, ArrowLeftRight, ArrowDownLeft,
  ArrowUpRight, RefreshCw, Filter, Warehouse, Clock, User
} from 'lucide-react-native';

const TYPE_FILTERS = [
  { key: '', label: 'Tümü', icon: null },
  { key: 'TRANSFER', label: '🔄 Transfer', color: '#6366F1' },
  { key: 'IN', label: '📥 Giriş', color: '#10B981' },
  { key: 'OUT', label: '📤 Çıkış', color: '#EF4444' },
  { key: 'ADJUSTMENT', label: '✏️ Düzeltme', color: '#8B5CF6' },
];

const MOVEMENT_CONFIG: Record<string, { label: string; color: string; sign: string; icon: string; bg: string }> = {
  SATIN_ALMA: { label: 'Satın Alma', color: '#10B981', sign: '+', icon: '📥', bg: '#10B98118' },
  IS_EMRI_KULLANIMI: { label: 'İş Emri Kullanımı', color: '#EF4444', sign: '-', icon: '🛠️', bg: '#EF444418' },
  SATIS: { label: 'Satış', color: '#EF4444', sign: '-', icon: '💰', bg: '#EF444418' },
  IADE: { label: 'İade Alındı', color: '#10B981', sign: '+', icon: '♻️', bg: '#10B98118' },
  FIRE: { label: 'Fire / Zayi', color: '#F59E0B', sign: '-', icon: '🔥', bg: '#F59E0B18' },
  DUZELTME: { label: 'Stok Düzeltme', color: '#8B5CF6', sign: '±', icon: '✏️', bg: '#8B5CF618' },
  DEPO_TRANSFERI: { label: 'Depo Transferi', color: '#6366F1', sign: '↔', icon: '🔄', bg: '#6366F118' },
  IN: { label: 'Stok Girişi', color: '#10B981', sign: '+', icon: '📥', bg: '#10B98118' },
  OUT: { label: 'Stok Çıkışı', color: '#EF4444', sign: '-', icon: '📤', bg: '#EF444418' },
  TRANSFER: { label: 'Transfer', color: '#6366F1', sign: '↔', icon: '🔄', bg: '#6366F118' },
  ADJUSTMENT: { label: 'Düzeltme', color: '#8B5CF6', sign: '±', icon: '✏️', bg: '#8B5CF618' },
};

export default function StockMovementsScreen() {
  const { colors: theme } = useAppTheme();
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');

  // Depoları çek
  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehouseAPI.getAll(),
  });
  const warehouses = (warehousesData as any)?.data || [];

  // Filtrelenmiş hareketleri çek
  const { data: movementsData, isLoading, refetch } = useQuery({
    queryKey: ['stock-movements-query', selectedWarehouseId, selectedType, search],
    queryFn: () => stockAPI.getMovements({
      warehouseId: selectedWarehouseId || undefined,
      movementType: selectedType || undefined,
      search: search.trim() || undefined,
      limit: 100,
    }),
  });

  const movements: any[] = (movementsData as any)?.data || [];

  // İstatistik hesaplama (mevcut filtre sonuçlarına göre)
  const stats = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    let totalTransfer = 0;

    movements.forEach(m => {
      const type = m.movementType;
      const q = m.quantity || 0;
      if (['SATIN_ALMA', 'IN', 'IADE'].includes(type)) {
        totalIn += q;
      } else if (['IS_EMRI_KULLANIMI', 'SATIS', 'FIRE', 'OUT'].includes(type)) {
        totalOut += q;
      } else if (['DEPO_TRANSFERI', 'TRANSFER'].includes(type)) {
        totalTransfer += 1;
      }
    });

    return {
      count: movements.length,
      totalIn,
      totalOut,
      totalTransfer,
    };
  }, [movements]);

  const hasActiveFilters = Boolean(search || selectedType || selectedWarehouseId);

  const resetFilters = () => {
    setSearch('');
    setSelectedType('');
    setSelectedWarehouseId('');
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

          <Text style={{ fontSize: Typography.fontSize.lg, fontWeight: '800', color: '#fff' }}>
            🔍 Stok & Transfer Sorgulama
          </Text>

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

        <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: Typography.fontSize.xs, textAlign: 'center' }}>
          Depo bazlı giriş, çıkış ve transfer hareketlerini filtreleyin
        </Text>

        {/* Arama Çubuğu */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.surface,
            borderRadius: BorderRadius.lg,
            paddingHorizontal: Spacing.md,
            height: 44,
            marginTop: Spacing.md,
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
            placeholder="Malzeme adı, marka veya not ara..."
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
      </LinearGradient>

      {/* ─── Filtre Seçenekleri ─── */}
      <View style={{ backgroundColor: theme.background, paddingTop: Spacing.sm, borderBottomWidth: 1, borderBottomColor: theme.border }}>
        {/* İşlem Tipi Filtresi */}
        <View style={{ paddingHorizontal: Spacing.lg, marginBottom: Spacing.xs }}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: theme.textMuted, textTransform: 'uppercase', marginBottom: 4 }}>
            İşlem Türü
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.xs, paddingBottom: 4 }}>
            {TYPE_FILTERS.map(t => {
              const active = selectedType === t.key;
              return (
                <TouchableOpacity
                  key={t.key}
                  onPress={() => setSelectedType(active ? '' : t.key)}
                  style={{
                    paddingHorizontal: Spacing.md,
                    paddingVertical: 6,
                    borderRadius: BorderRadius.full,
                    backgroundColor: active ? (t.color || theme.primary) : theme.surface,
                    borderWidth: 1,
                    borderColor: active ? (t.color || theme.primary) : theme.border,
                  }}
                >
                  <Text
                    style={{
                      fontSize: Typography.fontSize.xs,
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

        {/* Depo Filtresi */}
        <View style={{ paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm }}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: theme.textMuted, textTransform: 'uppercase', marginBottom: 4 }}>
            Depo Filtresi
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.xs }}>
            <TouchableOpacity
              onPress={() => setSelectedWarehouseId('')}
              style={{
                paddingHorizontal: Spacing.md,
                paddingVertical: 6,
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
                    paddingVertical: 6,
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
      </View>

      {/* ─── Özet Sayaçları Bannerı ─── */}
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
          justifyContent: 'space-around',
        }}
      >
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 10, color: theme.textMuted, fontWeight: '600' }}>KAYIT</Text>
          <Text style={{ fontSize: Typography.fontSize.sm, fontWeight: '800', color: theme.textPrimary }}>
            {stats.count}
          </Text>
        </View>

        <View style={{ width: 1, backgroundColor: theme.border }} />

        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 10, color: '#10B981', fontWeight: '600' }}>GİRİŞ</Text>
          <Text style={{ fontSize: Typography.fontSize.sm, fontWeight: '800', color: '#10B981' }}>
            +{stats.totalIn}
          </Text>
        </View>

        <View style={{ width: 1, backgroundColor: theme.border }} />

        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 10, color: '#EF4444', fontWeight: '600' }}>ÇIKIŞ</Text>
          <Text style={{ fontSize: Typography.fontSize.sm, fontWeight: '800', color: '#EF4444' }}>
            -{stats.totalOut}
          </Text>
        </View>

        <View style={{ width: 1, backgroundColor: theme.border }} />

        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 10, color: '#6366F1', fontWeight: '600' }}>TRANSFER</Text>
          <Text style={{ fontSize: Typography.fontSize.sm, fontWeight: '800', color: '#6366F1' }}>
            {stats.totalTransfer}
          </Text>
        </View>
      </View>

      {/* ─── Hareket Listesi ─── */}
      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={{ color: theme.textMuted, marginTop: Spacing.sm, fontSize: Typography.fontSize.xs }}>
            Kayıtlar sorgulanıyor...
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
            const isOut = ['IS_EMRI_KULLANIMI', 'SATIS', 'FIRE', 'OUT'].includes(item.movementType);
            const isIn = ['SATIN_ALMA', 'IN', 'IADE'].includes(item.movementType);

            // Depo bilgisi
            const warehouseName = item.warehouse?.name || null;

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
                {/* Üst Kısım: Rozet ve Miktar */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
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

                {/* Orta Kısım: Malzeme Adı & Detayı */}
                <Text style={{ fontSize: Typography.fontSize.base, fontWeight: '700', color: theme.textPrimary, marginBottom: 2 }}>
                  {item.part?.name || 'Malzeme'}
                </Text>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
                  {item.part?.brand && (
                    <Text style={{ fontSize: Typography.fontSize.xs, color: theme.textMuted }}>
                      🏷️ {item.part.brand}
                    </Text>
                  )}
                  {item.part?.sku && (
                    <Text style={{ fontSize: Typography.fontSize.xs, color: theme.textMuted }}>
                      • SKU: {item.part.sku}
                    </Text>
                  )}
                </View>

                {/* Transfer veya Depo Vurgusu */}
                {isTransfer ? (
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
                      {item.notes || 'Depolar arası transfer'}
                    </Text>
                  </View>
                ) : (
                  warehouseName && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                      <Text style={{ fontSize: Typography.fontSize.xs, color: theme.textSecondary, fontWeight: '600' }}>
                        📍 Depo: <Text style={{ color: theme.textPrimary }}>{warehouseName}</Text>
                      </Text>
                    </View>
                  )
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

                {/* Alt Kısım: Tarih & Kullanıcı */}
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
                Seçilen filtrelere veya arama terimine uygun stok hareketi bulunmuyor.
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
    </SafeAreaView>
  );
}
