import React from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { maintenanceAPI } from '../../../src/api/client';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../../src/constants/theme';

const TYPE_CONFIG: Record<string, { label: string; emoji: string }> = {
  PREVENTIVE: { label: 'Önleyici', emoji: '🛡️' },
  CORRECTIVE: { label: 'Düzeltici', emoji: '🔧' },
  INSPECTION: { label: 'Muayene', emoji: '🔍' },
  EMERGENCY: { label: 'Acil', emoji: '🚨' },
  OTHER: { label: 'Diğer', emoji: '📝' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PLANNED: { label: 'Planlı', color: Colors.primary },
  IN_PROGRESS: { label: 'Devam Ediyor', color: Colors.warning },
  COMPLETED: { label: 'Tamamlandı', color: Colors.success },
  CANCELLED: { label: 'İptal', color: Colors.textMuted },
};

function MaintenanceCard({ record, onPress }: any) {
  const type = TYPE_CONFIG[record.maintenanceType] || TYPE_CONFIG.OTHER;
  const status = STATUS_CONFIG[record.status] || STATUS_CONFIG.COMPLETED;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.cardHeader}>
        <Text style={styles.typeEmoji}>{type.emoji}</Text>
        <View style={styles.cardInfo}>
          <Text style={styles.title}>{record.title}</Text>
          <Text style={styles.motor}>
            ⚙️ {record.motor?.brand} {record.motor?.model}
          </Text>
          <Text style={styles.technician}>👤 {record.user?.fullName}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: status.color + '20', borderColor: status.color + '40' }]}>
          <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>
      <View style={styles.cardFooter}>
        <Text style={styles.date}>
          📅 {new Date(record.performedAt).toLocaleDateString('tr-TR')}
        </Text>
        {record.nextMaintenanceDate && (
          <Text style={styles.nextDate}>
            ⏭️ Sonraki: {new Date(record.nextMaintenanceDate).toLocaleDateString('tr-TR')}
          </Text>
        )}
        {record.cost && <Text style={styles.cost}>💰 ₺{parseFloat(record.cost).toLocaleString('tr-TR')}</Text>}
      </View>
    </TouchableOpacity>
  );
}

export default function MaintenanceScreen() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['maintenance'],
    queryFn: () => maintenanceAPI.getAll({ limit: 50 }),
  });

  const { data: upcoming } = useQuery({
    queryKey: ['upcomingMaintenance'],
    queryFn: () => maintenanceAPI.getUpcoming(30),
  });

  const records = (data as any)?.data || [];
  const upcomingRecords = (upcoming as any)?.data || [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.pageTitle}>Bakım Takibi</Text>
          <Text style={styles.subtitle}>{(data as any)?.pagination?.total || 0} kayıt</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/(tabs)/maintenance/create' as any)}
        >
          <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.addBtnInner}>
            <Text style={styles.addBtnText}>+ Ekle</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Upcoming Banner */}
      {upcomingRecords.length > 0 && (
        <View style={styles.upcomingBanner}>
          <LinearGradient colors={['rgba(245,158,11,0.2)', 'rgba(245,158,11,0.1)']} style={styles.upcomingInner}>
            <Text style={styles.upcomingText}>
              ⏰ {upcomingRecords.length} adet yaklaşan bakım var (30 gün)
            </Text>
          </LinearGradient>
        </View>
      )}

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MaintenanceCard
              record={item}
              onPress={() => router.push(`/(tabs)/maintenance/${item.id}` as any)}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={Colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🛠️</Text>
              <Text style={styles.emptyTitle}>Bakım kaydı yok</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/(tabs)/maintenance/create' as any)}>
                <Text style={styles.emptyBtnText}>Bakım Ekle</Text>
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
  pageTitle: { fontSize: Typography.fontSize.xl, fontWeight: '700', color: Colors.textPrimary },
  subtitle: { fontSize: Typography.fontSize.sm, color: Colors.textSecondary },
  addBtn: { borderRadius: BorderRadius.md, overflow: 'hidden' },
  addBtnInner: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: Typography.fontSize.sm },
  upcomingBanner: { marginHorizontal: Spacing.lg, marginBottom: Spacing.md, borderRadius: BorderRadius.md, overflow: 'hidden' },
  upcomingInner: { padding: Spacing.md, borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)', borderRadius: BorderRadius.md },
  upcomingText: { color: Colors.warning, fontWeight: '600', fontSize: Typography.fontSize.sm },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: Spacing.lg, gap: Spacing.sm },
  card: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.border, ...Shadows.sm,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md },
  typeEmoji: { fontSize: 28 },
  cardInfo: { flex: 1 },
  title: { fontSize: Typography.fontSize.base, fontWeight: '700', color: Colors.textPrimary },
  motor: { fontSize: Typography.fontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  technician: { fontSize: Typography.fontSize.xs, color: Colors.textMuted },
  statusBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.full, borderWidth: 1 },
  statusText: { fontSize: Typography.fontSize.xs, fontWeight: '600' },
  cardFooter: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.sm },
  date: { fontSize: Typography.fontSize.xs, color: Colors.textMuted },
  nextDate: { fontSize: Typography.fontSize.xs, color: Colors.warning },
  cost: { fontSize: Typography.fontSize.xs, color: Colors.success },
  empty: { alignItems: 'center', paddingTop: Spacing['2xl'] },
  emptyEmoji: { fontSize: 64, marginBottom: Spacing.md },
  emptyTitle: { fontSize: Typography.fontSize.lg, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.md },
  emptyBtn: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: BorderRadius.md },
  emptyBtnText: { color: '#fff', fontWeight: '700' },
});
