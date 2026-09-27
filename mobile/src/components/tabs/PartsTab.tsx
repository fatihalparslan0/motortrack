import React, { useState, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { partsAPI } from '../../api/client';
import { Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { useAppTheme } from '../../hooks/useAppTheme';

const CATEGORIES = ['Tümü', 'Filtre', 'Motor', 'Transmisyon', 'Fren', 'Elektrik', 'Soğutma', 'Yakıt', 'Diğer'];

function PartCard({ part, onPress, theme }: any) {
  const dynamicStyles = useMemo(() => styles(theme), [theme]);
  const isLowStock = part.quantity <= part.minQuantity && part.minQuantity > 0;
  const available = part.quantity - (part.reservedQuantity || 0);
  const stockColor = part.quantity === 0 ? theme.danger : isLowStock ? '#F59E0B' : theme.success;
  const showReserved = (part.reservedQuantity || 0) > 0;

  return (
    <TouchableOpacity style={dynamicStyles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={dynamicStyles.cardMain}>
        <View style={dynamicStyles.partIcon}>
          <Text style={dynamicStyles.partIconText}>🔩</Text>
        </View>
        <View style={dynamicStyles.cardInfo}>
          <Text style={dynamicStyles.partName}>{part.name}</Text>
          {part.brand && <Text style={dynamicStyles.brand}>{part.brand}</Text>}
          {part.partNumber && <Text style={dynamicStyles.partNumber}>P/N: {part.partNumber}</Text>}
          {part.sku && <Text style={dynamicStyles.partNumber}>SKU: {part.sku}</Text>}
          {part.motor && <Text style={dynamicStyles.motor}>⚙️ {part.motor.brand} {part.motor.model}</Text>}
        </View>
        <View style={dynamicStyles.stockContainer}>
          <View style={[dynamicStyles.stockBadge, { backgroundColor: stockColor + '20', borderColor: stockColor + '40' }]}>
            <Text style={[dynamicStyles.stockValue, { color: stockColor }]}>{part.quantity}</Text>
            <Text style={[dynamicStyles.stockUnit, { color: stockColor }]}>{part.unit}</Text>
          </View>
          {showReserved && (
            <Text style={{ fontSize: 10, color: '#F59E0B', textAlign: 'center', marginTop: 2 }}>
              {part.reservedQuantity} rezerve
            </Text>
          )}
          {isLowStock && <Text style={dynamicStyles.lowStockWarning}>⚠️ Düşük</Text>}
        </View>
      </View>
      {part.category && (
        <View style={dynamicStyles.categoryBadge}>
          <Text style={dynamicStyles.categoryText}>{part.category}</Text>
        </View>
      )}
      
      {part.warehouseStocks && part.warehouseStocks.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: Spacing.sm, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: theme.borderLight }}>
          {part.warehouseStocks.filter((ws: any) => ws.quantity !== 0).map((ws: any) => (
            <View key={ws.id} style={{ backgroundColor: theme.surfaceElevated, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
              <Text style={{ fontSize: 10, color: theme.textSecondary }}>
                <Text style={{ fontWeight: '600' }}>{ws.warehouse?.name || 'Bilinmeyen Depo'}:</Text> {ws.quantity}
              </Text>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function PartsScreen() {
  const [search, setSearch] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Tümü');
  const { colors: theme } = useAppTheme();
  const dynamicStyles = useMemo(() => styles(theme), [theme]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['parts', search, showLowStock, selectedCategory],
    queryFn: () => partsAPI.getAll({ 
      search, 
      lowStock: showLowStock ? 'true' : undefined, 
      category: selectedCategory === 'Tümü' ? undefined : selectedCategory,
      limit: 100 
    }),
    placeholderData: (prev) => prev,
  });

  const { data: statsData } = useQuery({
    queryKey: ['partStats'],
    queryFn: () => partsAPI.getStats(),
  });

  const parts = (data as any)?.data || [];
  const stats = (statsData as any)?.data;

  return (
    <SafeAreaView style={dynamicStyles.container} edges={['top']}>
      <View style={dynamicStyles.header}>
        <View>
          <Text style={dynamicStyles.title}>Parça Envanteri</Text>
          <Text style={dynamicStyles.subtitle}>{(data as any)?.pagination?.total || 0} parça</Text>
        </View>
        <TouchableOpacity
          style={dynamicStyles.addBtn}
          onPress={() => router.push('/parts/create' as any)}
        >
          <LinearGradient colors={[theme.primary, theme.primaryDark || '#4F46E5']} style={dynamicStyles.addBtnInner}>
            <Text style={dynamicStyles.addBtnText}>+ Ekle</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      {stats && (
        <View style={dynamicStyles.statsRow}>
          <View style={dynamicStyles.statItem}>
            <Text style={dynamicStyles.statValue}>{stats.totalParts}</Text>
            <Text style={dynamicStyles.statLabel}>Toplam</Text>
          </View>
          <View style={[dynamicStyles.statItem, { borderLeftWidth: 1, borderRightWidth: 1, borderColor: theme.border }]}>
            <Text style={[dynamicStyles.statValue, { color: theme.danger }]}>{stats.lowStockCount}</Text>
            <Text style={dynamicStyles.statLabel}>Düşük Stok</Text>
          </View>
          <View style={dynamicStyles.statItem}>
            <Text style={dynamicStyles.statValue}>
              ₺{stats.totalValue ? parseFloat(stats.totalValue).toLocaleString('tr-TR', { maximumFractionDigits: 0 }) : '0'}
            </Text>
            <Text style={dynamicStyles.statLabel}>Toplam Değer</Text>
          </View>
        </View>
      )}

      {/* Search & Filter */}
      <View style={dynamicStyles.searchRow}>
        <TextInput
          style={dynamicStyles.searchInput}
          placeholder="Parça adı, numarası, marka..."
          placeholderTextColor={theme.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        <TouchableOpacity
          style={[dynamicStyles.lowStockBtn, showLowStock && dynamicStyles.lowStockBtnActive]}
          onPress={() => setShowLowStock(!showLowStock)}
        >
          <Text style={[dynamicStyles.lowStockBtnText, showLowStock && dynamicStyles.lowStockBtnTextActive]}>
            ⚠️ Düşük Stok
          </Text>
        </TouchableOpacity>
      </View>

      <View style={{ marginBottom: Spacing.sm }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: Spacing.lg, gap: Spacing.sm }}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[
                dynamicStyles.categoryChip,
                selectedCategory === cat && { backgroundColor: theme.primary, borderColor: theme.primary }
              ]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text style={[
                dynamicStyles.categoryChipText,
                selectedCategory === cat && { color: '#fff', fontWeight: 'bold' }
              ]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {isLoading ? (
        <View style={dynamicStyles.loading}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <FlatList
          data={parts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <PartCard
              part={item}
              theme={theme}
              onPress={() => router.push(`/parts/${item.id}` as any)}
            />
          )}
          contentContainerStyle={dynamicStyles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={theme.primary} />}
          ListEmptyComponent={
            <View style={dynamicStyles.empty}>
              <Text style={dynamicStyles.emptyEmoji}>🔩</Text>
              <Text style={dynamicStyles.emptyTitle}>Parça bulunamadı</Text>
              <TouchableOpacity style={[dynamicStyles.emptyBtn, { backgroundColor: theme.primary }]} onPress={() => router.push('/parts/create' as any)}>
                <Text style={dynamicStyles.emptyBtnText}>Parça Ekle</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, paddingBottom: Spacing.sm },
  title: { fontSize: Typography.fontSize.xl, fontWeight: '700', color: theme.textPrimary },
  subtitle: { fontSize: Typography.fontSize.sm, color: theme.textSecondary },
  addBtn: { borderRadius: BorderRadius.md, overflow: 'hidden' },
  addBtnInner: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: Typography.fontSize.sm },

  statsRow: {
    flexDirection: 'row', marginHorizontal: Spacing.lg, marginBottom: Spacing.md,
    backgroundColor: theme.surface, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: theme.border, overflow: 'hidden',
  },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md },
  statValue: { fontSize: Typography.fontSize.lg, fontWeight: '800', color: theme.textPrimary },
  statLabel: { fontSize: Typography.fontSize.xs, color: theme.textMuted, marginTop: 2 },

  searchRow: { flexDirection: 'row', paddingHorizontal: Spacing.lg, gap: Spacing.sm, marginBottom: Spacing.md },
  searchInput: {
    flex: 1, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border,
    borderRadius: BorderRadius.md, padding: Spacing.md, color: theme.textPrimary, fontSize: Typography.fontSize.sm,
  },
  lowStockBtn: {
    paddingHorizontal: Spacing.md, justifyContent: 'center', backgroundColor: theme.surface,
    borderWidth: 1, borderColor: theme.border, borderRadius: BorderRadius.md,
  },
  lowStockBtnActive: { backgroundColor: theme.danger + '20', borderColor: theme.danger },
  lowStockBtnText: { fontSize: Typography.fontSize.xs, color: theme.textSecondary },
  lowStockBtnTextActive: { color: theme.danger, fontWeight: '600' },

  categoryChip: {
    paddingHorizontal: Spacing.md, paddingVertical: 6,
    borderRadius: BorderRadius.full, borderWidth: 1, borderColor: theme.border,
    backgroundColor: theme.surface,
  },
  categoryChipText: { fontSize: Typography.fontSize.xs, color: theme.textSecondary },

  list: { padding: Spacing.lg, gap: Spacing.sm },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  card: {
    backgroundColor: theme.surface, borderRadius: BorderRadius.md, padding: Spacing.md,
    borderWidth: 1, borderColor: theme.border, ...Shadows.sm,
  },
  cardMain: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  partIcon: {
    width: 44, height: 44, backgroundColor: theme.surfaceElevated || theme.surface,
    borderRadius: BorderRadius.md, justifyContent: 'center', alignItems: 'center',
  },
  partIconText: { fontSize: 22 },
  cardInfo: { flex: 1 },
  partName: { fontSize: Typography.fontSize.base, fontWeight: '600', color: theme.textPrimary },
  brand: { fontSize: Typography.fontSize.xs, color: theme.textSecondary },
  partNumber: { fontSize: Typography.fontSize.xs, color: theme.textMuted },
  motor: { fontSize: Typography.fontSize.xs, color: theme.textSecondary },
  stockContainer: { alignItems: 'center' },
  stockBadge: {
    paddingHorizontal: Spacing.sm, paddingVertical: 4,
    borderRadius: BorderRadius.sm, borderWidth: 1, alignItems: 'center',
  },
  stockValue: { fontSize: Typography.fontSize.lg, fontWeight: '800' },
  stockUnit: { fontSize: Typography.fontSize.xs },
  lowStockWarning: { fontSize: Typography.fontSize.xs, color: theme.danger, marginTop: 2 },
  categoryBadge: {
    alignSelf: 'flex-start', marginTop: Spacing.sm, paddingHorizontal: Spacing.sm, paddingVertical: 2,
    backgroundColor: theme.surfaceElevated || theme.surface, borderRadius: BorderRadius.full,
  },
  categoryText: { fontSize: Typography.fontSize.xs, color: theme.textMuted },

  empty: { alignItems: 'center', paddingTop: Spacing['2xl'] },
  emptyEmoji: { fontSize: 64, marginBottom: Spacing.md },
  emptyTitle: { fontSize: Typography.fontSize.lg, fontWeight: '700', color: theme.textPrimary, marginBottom: Spacing.md },
  emptyBtn: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: BorderRadius.md },
  emptyBtnText: { color: '#fff', fontWeight: '700' },
});
