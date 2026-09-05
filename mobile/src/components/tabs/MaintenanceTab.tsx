import React, { useMemo, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { maintenanceAPI } from '../../api/client';
import { Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { useAppTheme } from '../../hooks/useAppTheme';

function MaintenanceCard({ record, onPress, theme }: any) {
  const dynamicStyles = useMemo(() => styles(theme), [theme]);
  
  const TYPE_CONFIG: Record<string, { label: string; emoji: string }> = {
    PREVENTIVE: { label: 'Önleyici', emoji: '🛡️' },
    CORRECTIVE: { label: 'Düzeltici', emoji: '🔧' },
    INSPECTION: { label: 'Muayene', emoji: '🔍' },
    EMERGENCY: { label: 'Acil', emoji: '🚨' },
    OTHER: { label: 'Diğer', emoji: '📝' },
  };

  const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    PLANNED: { label: 'Planlı', color: theme.primary },
    IN_PROGRESS: { label: 'Devam Ediyor', color: theme.warning },
    COMPLETED: { label: 'Tamamlandı', color: theme.success },
    CANCELLED: { label: 'İptal', color: theme.textMuted },
  };

  const type = TYPE_CONFIG[record.maintenanceType] || TYPE_CONFIG.OTHER;
  const status = STATUS_CONFIG[record.status] || STATUS_CONFIG.COMPLETED;

  return (
    <TouchableOpacity style={dynamicStyles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={dynamicStyles.cardHeader}>
        <Text style={dynamicStyles.typeEmoji}>{type.emoji}</Text>
        <View style={dynamicStyles.cardInfo}>
          <Text style={dynamicStyles.title}>{record.title}</Text>
          {record.customerInfo && <Text style={dynamicStyles.infoText}>👤 {record.customerInfo}</Text>}
          {record.vehicleInfo && <Text style={dynamicStyles.infoText}>🚗 {record.vehicleInfo}</Text>}
          {(!record.customerInfo && !record.vehicleInfo) && (
            <Text style={dynamicStyles.motor}>⚙️ {record.motor?.brand} {record.motor?.model}</Text>
          )}
        </View>
        <View style={[dynamicStyles.statusBadge, { backgroundColor: status.color + '20', borderColor: status.color + '40' }]}>
          <Text style={[dynamicStyles.statusText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>
      <View style={dynamicStyles.cardFooter}>
        <Text style={dynamicStyles.date}>
          📅 {new Date(record.performedAt).toLocaleDateString('tr-TR')} (Alınan)
        </Text>
        {record.nextMaintenanceDate && (
          <Text style={dynamicStyles.nextDate}>
            ⏭️ Teslim: {new Date(record.nextMaintenanceDate).toLocaleDateString('tr-TR')}
          </Text>
        )}
        {record.cost && <Text style={dynamicStyles.cost}>💰 ₺{parseFloat(record.cost).toLocaleString('tr-TR')}</Text>}
      </View>
    </TouchableOpacity>
  );
}

export default function MaintenanceScreen() {
  const { colors: theme } = useAppTheme();
  const dynamicStyles = useMemo(() => styles(theme), [theme]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['maintenance'],
    queryFn: () => maintenanceAPI.getAll({ limit: 50 }),
  });

  const { data: upcoming } = useQuery({
    queryKey: ['upcomingMaintenance'],
    queryFn: () => maintenanceAPI.getUpcoming(30),
  });

  const [filter, setFilter] = useState('ALL');

  const records = (data as any)?.data || [];
  const upcomingRecords = (upcoming as any)?.data || [];

  const FILTERS = [
    { id: 'ALL', label: 'Genel' },
    { id: 'PLANNED', label: 'Planlı' },
    { id: 'IN_PROGRESS', label: 'Devam Ediyor' },
    { id: 'COMPLETED', label: 'Tamamlandı' },
  ];

  const displayedRecords = useMemo(() => {
    if (filter === 'UPCOMING') return upcomingRecords;
    if (filter === 'ALL') return records;
    return records.filter((r: any) => r.status === filter);
  }, [filter, records, upcomingRecords]);

  return (
    <SafeAreaView style={dynamicStyles.container} edges={['top']}>
      <View style={dynamicStyles.header}>
        <View>
          <Text style={dynamicStyles.pageTitle}>Tamir Takibi</Text>
          <Text style={dynamicStyles.subtitle}>{(data as any)?.pagination?.total || 0} kayıt</Text>
        </View>
        <TouchableOpacity
          style={dynamicStyles.addBtn}
          onPress={() => router.push('/maintenance/create' as any)}
        >
          <LinearGradient colors={[theme.primary, theme.primaryDark || '#4F46E5']} style={dynamicStyles.addBtnInner}>
            <Text style={dynamicStyles.addBtnText}>+ Ekle</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Status Filters */}
      <View style={dynamicStyles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={dynamicStyles.filtersScroll}>
          {FILTERS.map(f => (
            <TouchableOpacity 
              key={f.id} 
              style={[dynamicStyles.filterBtn, filter === f.id && dynamicStyles.filterBtnActive]}
              onPress={() => setFilter(f.id)}
            >
              <Text style={[dynamicStyles.filterText, filter === f.id && dynamicStyles.filterTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Upcoming Banner */}
      {upcomingRecords.length > 0 && (
        <TouchableOpacity style={dynamicStyles.upcomingBanner} onPress={() => setFilter(filter === 'UPCOMING' ? 'ALL' : 'UPCOMING')} activeOpacity={0.8}>
          <LinearGradient 
            colors={filter === 'UPCOMING' ? [theme.warning + '50', theme.warning + '30'] : [theme.warning + '30', theme.warning + '10']} 
            style={dynamicStyles.upcomingInner}
          >
            <Text style={[dynamicStyles.upcomingText, filter === 'UPCOMING' && { fontWeight: '700' }]}>
              ⏰ {upcomingRecords.length} adet teslimi geçen/yaklaşan iş var {filter === 'UPCOMING' ? '(Filtre Kapat)' : '(Tıkla)'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      )}

      {isLoading ? (
        <View style={dynamicStyles.loading}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <FlatList
          data={displayedRecords}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MaintenanceCard
              record={item}
              theme={theme}
              onPress={() => router.push(`/maintenance/${item.id}` as any)}
            />
          )}
          contentContainerStyle={dynamicStyles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={theme.primary} />}
          ListEmptyComponent={
            <View style={dynamicStyles.empty}>
              <Text style={dynamicStyles.emptyEmoji}>🛠️</Text>
              <Text style={dynamicStyles.emptyTitle}>Tamir kaydı yok</Text>
              <TouchableOpacity style={[dynamicStyles.emptyBtn, { backgroundColor: theme.primary }]} onPress={() => router.push('/maintenance/create' as any)}>
                <Text style={dynamicStyles.emptyBtnText}>Tamir Ekle</Text>
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
  pageTitle: { fontSize: Typography.fontSize.xl, fontWeight: '700', color: theme.textPrimary },
  subtitle: { fontSize: Typography.fontSize.sm, color: theme.textSecondary },
  addBtn: { borderRadius: BorderRadius.md, overflow: 'hidden' },
  addBtnInner: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: Typography.fontSize.sm },
  filtersContainer: { marginBottom: Spacing.md },
  filtersScroll: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  filterBtn: { paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: BorderRadius.full, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border },
  filterBtnActive: { backgroundColor: theme.primary + '20', borderColor: theme.primary },
  filterText: { color: theme.textSecondary, fontSize: Typography.fontSize.sm, fontWeight: '500' },
  filterTextActive: { color: theme.primary, fontWeight: '700' },
  upcomingBanner: { marginHorizontal: Spacing.lg, marginBottom: Spacing.md, borderRadius: BorderRadius.md, overflow: 'hidden' },
  upcomingInner: { padding: Spacing.md, borderWidth: 1, borderColor: theme.warning + '50', borderRadius: BorderRadius.md },
  upcomingText: { color: theme.warning, fontWeight: '600', fontSize: Typography.fontSize.sm },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: Spacing.lg, gap: Spacing.sm },
  card: {
    backgroundColor: theme.surface, borderRadius: BorderRadius.md, padding: Spacing.md,
    borderWidth: 1, borderColor: theme.border, ...Shadows.sm,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md },
  typeEmoji: { fontSize: 28 },
  cardInfo: { flex: 1 },
  title: { fontSize: Typography.fontSize.base, fontWeight: '700', color: theme.textPrimary },
  motor: { fontSize: Typography.fontSize.xs, color: theme.textSecondary, marginTop: 2 },
  infoText: { fontSize: Typography.fontSize.xs, color: theme.textSecondary, marginTop: 2 },
  technician: { fontSize: Typography.fontSize.xs, color: theme.textMuted, marginTop: 2 },
  statusBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.full, borderWidth: 1 },
  statusText: { fontSize: Typography.fontSize.xs, fontWeight: '600' },
  cardFooter: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: Spacing.sm },
  date: { fontSize: Typography.fontSize.xs, color: theme.textMuted },
  nextDate: { fontSize: Typography.fontSize.xs, color: theme.warning },
  cost: { fontSize: Typography.fontSize.xs, color: theme.success },
  empty: { alignItems: 'center', paddingTop: Spacing['2xl'] },
  emptyEmoji: { fontSize: 64, marginBottom: Spacing.md },
  emptyTitle: { fontSize: Typography.fontSize.lg, fontWeight: '700', color: theme.textPrimary, marginBottom: Spacing.md },
  emptyBtn: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: BorderRadius.md },
  emptyBtnText: { color: '#fff', fontWeight: '700' },
});
