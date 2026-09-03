import React, { useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { motorsAPI } from '../../../src/api/client';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../../src/constants/theme';

const STATUS_CONFIG: Record<string, { label: string; color: string; emoji: string }> = {
  ACTIVE: { label: 'Aktif', color: Colors.success, emoji: '✅' },
  MAINTENANCE: { label: 'Bakımda', color: Colors.warning, emoji: '🔧' },
  RETIRED: { label: 'Emekli', color: Colors.textMuted, emoji: '📦' },
  SOLD: { label: 'Satıldı', color: Colors.primary, emoji: '💰' },
};

const TYPE_CONFIG: Record<string, string> = {
  AUTOMOTIVE: '🚗', INDUSTRIAL: '🏭', MOTORCYCLE: '🏍️',
  MARINE: '⛵', AGRICULTURAL: '🚜', OTHER: '⚙️',
};

function MotorCard({ motor, onPress }: any) {
  const status = STATUS_CONFIG[motor.status] || STATUS_CONFIG.ACTIVE;
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.cardHeader}>
        <View style={styles.motorIcon}>
          <Text style={styles.motorIconText}>{TYPE_CONFIG[motor.motorType] || '⚙️'}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.motorName}>{motor.brand} {motor.model}</Text>
          <Text style={styles.serialNumber}>S/N: {motor.serialNumber}</Text>
          {motor.location && <Text style={styles.location}>📍 {motor.location}</Text>}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: status.color + '20', borderColor: status.color + '40' }]}>
          <Text style={[styles.statusText, { color: status.color }]}>{status.emoji} {status.label}</Text>
        </View>
      </View>
      <View style={styles.cardFooter}>
        <Text style={styles.footerText}>🔩 {motor._count?.parts || 0} Parça</Text>
        <Text style={styles.footerText}>🛠️ {motor._count?.maintenanceRecords || 0} Bakım</Text>
        {motor.manufactureYear && <Text style={styles.footerText}>📅 {motor.manufactureYear}</Text>}
      </View>
    </TouchableOpacity>
  );
}

export default function MotorsScreen() {
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['motors', search, selectedStatus],
    queryFn: () => motorsAPI.getAll({ search, status: selectedStatus, limit: 50 }),
    placeholderData: (prev) => prev,
  });

  const motors = (data as any)?.data || [];
  const total = (data as any)?.pagination?.total || 0;

  const filters = ['Hepsi', 'ACTIVE', 'MAINTENANCE', 'RETIRED'];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Motorlar</Text>
          <Text style={styles.subtitle}>{total} motor kayıtlı</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/(tabs)/motors/create' as any)}
          activeOpacity={0.8}
        >
          <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.addBtnInner}>
            <Text style={styles.addBtnText}>+ Ekle</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Motor ara (marka, model, seri no)..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        <TouchableOpacity
          style={styles.scanBtn}
          onPress={() => router.push('/(tabs)/motors/scan' as any)}
        >
          <Text style={styles.scanIcon}>📷</Text>
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filter, (selectedStatus === (f === 'Hepsi' ? null : f)) && styles.filterActive]}
            onPress={() => setSelectedStatus(f === 'Hepsi' ? null : f)}
          >
            <Text style={[
              styles.filterText,
              (selectedStatus === (f === 'Hepsi' ? null : f)) && styles.filterTextActive,
            ]}>
              {f === 'Hepsi' ? 'Hepsi' : STATUS_CONFIG[f]?.emoji + ' ' + STATUS_CONFIG[f]?.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      {isLoading && motors.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={motors}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MotorCard
              motor={item}
              onPress={() => router.push(`/(tabs)/motors/${item.id}` as any)}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={Colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>⚙️</Text>
              <Text style={styles.emptyTitle}>Motor bulunamadı</Text>
              <Text style={styles.emptySubtitle}>İlk motorunuzu ekleyerek başlayın</Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => router.push('/(tabs)/motors/create' as any)}
              >
                <Text style={styles.emptyBtnText}>Motor Ekle</Text>
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

  searchContainer: { flexDirection: 'row', paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm, gap: Spacing.sm },
  searchInput: {
    flex: 1, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: BorderRadius.md, padding: Spacing.md, color: Colors.textPrimary,
    fontSize: Typography.fontSize.sm,
  },
  scanBtn: {
    width: 48, height: 48, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: BorderRadius.md, justifyContent: 'center', alignItems: 'center',
  },
  scanIcon: { fontSize: 20 },

  filtersContainer: { flexDirection: 'row', paddingHorizontal: Spacing.lg, gap: Spacing.sm, marginBottom: Spacing.md },
  filter: {
    paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  filterActive: { backgroundColor: Colors.primary + '20', borderColor: Colors.primary },
  filterText: { fontSize: Typography.fontSize.xs, color: Colors.textSecondary },
  filterTextActive: { color: Colors.primary, fontWeight: '600' },

  list: { padding: Spacing.lg, gap: Spacing.md },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  card: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.border, ...Shadows.sm,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  motorIcon: {
    width: 52, height: 52, backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md, justifyContent: 'center', alignItems: 'center',
  },
  motorIconText: { fontSize: 26 },
  cardInfo: { flex: 1 },
  motorName: { fontSize: Typography.fontSize.base, fontWeight: '700', color: Colors.textPrimary },
  serialNumber: { fontSize: Typography.fontSize.xs, color: Colors.textMuted, marginTop: 2 },
  location: { fontSize: Typography.fontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  statusBadge: {
    paddingHorizontal: Spacing.sm, paddingVertical: 4,
    borderRadius: BorderRadius.full, borderWidth: 1,
  },
  statusText: { fontSize: Typography.fontSize.xs, fontWeight: '600' },
  cardFooter: {
    flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.md,
    paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  footerText: { fontSize: Typography.fontSize.xs, color: Colors.textMuted },

  empty: { alignItems: 'center', paddingTop: Spacing['3xl'] },
  emptyEmoji: { fontSize: 64, marginBottom: Spacing.md },
  emptyTitle: { fontSize: Typography.fontSize.lg, fontWeight: '700', color: Colors.textPrimary },
  emptySubtitle: { fontSize: Typography.fontSize.sm, color: Colors.textSecondary, marginTop: 4 },
  emptyBtn: {
    marginTop: Spacing.lg, backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: BorderRadius.md,
  },
  emptyBtnText: { color: '#fff', fontWeight: '700' },
});
