import React, { useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { partsAPI } from '../../../src/api/client';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../../src/constants/theme';

function PartCard({ part, onPress }: any) {
  const isLowStock = part.quantity <= part.minQuantity && part.minQuantity > 0;
  const stockColor = isLowStock ? Colors.danger : part.quantity === 0 ? Colors.danger : Colors.success;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.cardMain}>
        <View style={styles.partIcon}>
          <Text style={styles.partIconText}>🔩</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.partName}>{part.name}</Text>
          {part.brand && <Text style={styles.brand}>{part.brand}</Text>}
          {part.partNumber && <Text style={styles.partNumber}>P/N: {part.partNumber}</Text>}
          {part.motor && <Text style={styles.motor}>⚙️ {part.motor.brand} {part.motor.model}</Text>}
        </View>
        <View style={styles.stockContainer}>
          <View style={[styles.stockBadge, { backgroundColor: stockColor + '20', borderColor: stockColor + '40' }]}>
            <Text style={[styles.stockValue, { color: stockColor }]}>{part.quantity}</Text>
            <Text style={[styles.stockUnit, { color: stockColor }]}>{part.unit}</Text>
          </View>
          {isLowStock && <Text style={styles.lowStockWarning}>⚠️ Düşük</Text>}
        </View>
      </View>
      {part.category && (
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{part.category}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function PartsScreen() {
  const [search, setSearch] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['parts', search, showLowStock],
    queryFn: () => partsAPI.getAll({ search, lowStock: showLowStock ? 'true' : undefined, limit: 100 }),
    placeholderData: (prev) => prev,
  });

  const { data: statsData } = useQuery({
    queryKey: ['partStats'],
    queryFn: () => partsAPI.getStats(),
  });

  const parts = (data as any)?.data || [];
  const stats = (statsData as any)?.data;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Parça Envanteri</Text>
          <Text style={styles.subtitle}>{(data as any)?.pagination?.total || 0} parça</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/(tabs)/parts/create' as any)}
        >
          <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.addBtnInner}>
            <Text style={styles.addBtnText}>+ Ekle</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      {stats && (
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.totalParts}</Text>
            <Text style={styles.statLabel}>Toplam</Text>
          </View>
          <View style={[styles.statItem, { borderLeftWidth: 1, borderRightWidth: 1, borderColor: Colors.border }]}>
            <Text style={[styles.statValue, { color: Colors.danger }]}>{stats.lowStockCount}</Text>
            <Text style={styles.statLabel}>Düşük Stok</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              ₺{stats.totalValue ? parseFloat(stats.totalValue).toLocaleString('tr-TR', { maximumFractionDigits: 0 }) : '0'}
            </Text>
            <Text style={styles.statLabel}>Toplam Değer</Text>
          </View>
        </View>
      )}

      {/* Search & Filter */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Parça adı, numarası, marka..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        <TouchableOpacity
          style={[styles.lowStockBtn, showLowStock && styles.lowStockBtnActive]}
          onPress={() => setShowLowStock(!showLowStock)}
        >
          <Text style={[styles.lowStockBtnText, showLowStock && styles.lowStockBtnTextActive]}>
            ⚠️ Düşük Stok
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={parts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <PartCard
              part={item}
              onPress={() => router.push(`/(tabs)/parts/${item.id}` as any)}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={Colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🔩</Text>
              <Text style={styles.emptyTitle}>Parça bulunamadı</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/(tabs)/parts/create' as any)}>
                <Text style={styles.emptyBtnText}>Parça Ekle</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, paddingBottom: Spacing.sm },
  title: { fontSize: Typography.fontSize.xl, fontWeight: '700', color: Colors.textPrimary },
  subtitle: { fontSize: Typography.fontSize.sm, color: Colors.textSecondary },
  addBtn: { borderRadius: BorderRadius.md, overflow: 'hidden' },
  addBtnInner: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: Typography.fontSize.sm },

  statsRow: {
    flexDirection: 'row', marginHorizontal: Spacing.lg, marginBottom: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
  },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md },
  statValue: { fontSize: Typography.fontSize.lg, fontWeight: '800', color: Colors.textPrimary },
  statLabel: { fontSize: Typography.fontSize.xs, color: Colors.textMuted, marginTop: 2 },

  searchRow: { flexDirection: 'row', paddingHorizontal: Spacing.lg, gap: Spacing.sm, marginBottom: Spacing.md },
  searchInput: {
    flex: 1, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: BorderRadius.md, padding: Spacing.md, color: Colors.textPrimary, fontSize: Typography.fontSize.sm,
  },
  lowStockBtn: {
    paddingHorizontal: Spacing.md, justifyContent: 'center', backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md,
  },
  lowStockBtnActive: { backgroundColor: Colors.danger + '20', borderColor: Colors.danger },
  lowStockBtnText: { fontSize: Typography.fontSize.xs, color: Colors.textSecondary },
  lowStockBtnTextActive: { color: Colors.danger, fontWeight: '600' },

  list: { padding: Spacing.lg, gap: Spacing.sm },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  card: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.border, ...Shadows.sm,
  },
  cardMain: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  partIcon: {
    width: 44, height: 44, backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md, justifyContent: 'center', alignItems: 'center',
  },
  partIconText: { fontSize: 22 },
  cardInfo: { flex: 1 },
  partName: { fontSize: Typography.fontSize.base, fontWeight: '600', color: Colors.textPrimary },
  brand: { fontSize: Typography.fontSize.xs, color: Colors.textSecondary },
  partNumber: { fontSize: Typography.fontSize.xs, color: Colors.textMuted },
  motor: { fontSize: Typography.fontSize.xs, color: Colors.textSecondary },
  stockContainer: { alignItems: 'center' },
  stockBadge: {
    paddingHorizontal: Spacing.sm, paddingVertical: 4,
    borderRadius: BorderRadius.sm, borderWidth: 1, alignItems: 'center',
  },
  stockValue: { fontSize: Typography.fontSize.lg, fontWeight: '800' },
  stockUnit: { fontSize: Typography.fontSize.xs },
  lowStockWarning: { fontSize: Typography.fontSize.xs, color: Colors.danger, marginTop: 2 },
  categoryBadge: {
    alignSelf: 'flex-start', marginTop: Spacing.sm, paddingHorizontal: Spacing.sm, paddingVertical: 2,
    backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.full,
  },
  categoryText: { fontSize: Typography.fontSize.xs, color: Colors.textMuted },

  empty: { alignItems: 'center', paddingTop: Spacing['2xl'] },
  emptyEmoji: { fontSize: 64, marginBottom: Spacing.md },
  emptyTitle: { fontSize: Typography.fontSize.lg, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.md },
  emptyBtn: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: BorderRadius.md },
  emptyBtnText: { color: '#fff', fontWeight: '700' },
});
