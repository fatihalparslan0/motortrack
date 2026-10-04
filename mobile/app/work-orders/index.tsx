import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import { workOrderAPI } from '../../src/api/client';
import { Typography, Spacing, BorderRadius, Shadows } from '../../src/constants/theme';
import { useAppTheme } from '../../src/hooks/useAppTheme';
import { useAuthStore, isTechnicianRole } from '../../src/store/auth.store';
import { Plus, ChevronRight } from 'lucide-react-native';

const STATUS_FILTERS = [
  { value: '', label: 'Tümü' },
  { value: 'ACIK', label: '🔵 Açık' },
  { value: 'DEVAM_EDIYOR', label: '🟡 Devam' },
  { value: 'TAMAMLANDI', label: '🟢 Tamamlandı' },
  { value: 'IPTAL', label: '🔴 İptal' },
];

const STATUS_COLORS: Record<string, string> = {
  ACIK: '#3B82F6',
  DEVAM_EDIYOR: '#F59E0B',
  TAMAMLANDI: '#10B981',
  IPTAL: '#EF4444',
};

const STATUS_LABELS: Record<string, string> = {
  ACIK: 'Açık',
  DEVAM_EDIYOR: 'Devam Ediyor',
  TAMAMLANDI: 'Tamamlandı',
  IPTAL: 'İptal',
};

function WorkOrderCard({ order, onPress, theme, currentUserId }: any) {
  const statusColor = STATUS_COLORS[order.status] || '#94A3B8';
  const statusLabel = STATUS_LABELS[order.status] || order.status;

  const total = parseFloat(order.totalAmount || 0);
  const paid = parseFloat(order.paidAmount || 0);
  const remaining = Math.max(0, total - paid);

  const paymentBadge = order.status === 'IPTAL'
    ? { label: '🚫 İptal Edildi', color: theme.danger, bg: theme.danger + '15' }
    : {
        ODENDI: { label: '✅ Ödendi', color: theme.success, bg: theme.success + '15' },
        KISMI: { label: `🟡 Kalan ₺${remaining.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`, color: '#F59E0B', bg: '#F59E0B15' },
        VERESIYE: { label: `🔴 Veresiye ₺${remaining.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`, color: theme.danger, bg: theme.danger + '15' },
        BEKLIYOR: { label: '⏳ Ödeme Bekliyor', color: theme.textMuted, bg: theme.border },
      }[order.paymentStatus as string];

  return (
    <TouchableOpacity
      style={[styles(theme).card, { borderLeftColor: statusColor, borderLeftWidth: 4 }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles(theme).cardRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles(theme).orderTitle} numberOfLines={1}>{order.title}</Text>
          {order.customerName && (
            <Text style={styles(theme).orderCustomer}>👤 {order.customerName}</Text>
          )}
          {order.vehicleInfo && (
            <Text style={styles(theme).orderVehicle}>🚗 {order.vehicleInfo}</Text>
          )}
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <View style={[styles(theme).statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles(theme).statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
          <Text style={styles(theme).orderDate}>
            {new Date(order.createdAt).toLocaleDateString('tr-TR')}
          </Text>
        </View>
      </View>

      {/* Payment / Veresiye status pill & Technician Badge */}
      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 4, marginBottom: 2 }}>
        {paymentBadge && (
          <View style={{ backgroundColor: paymentBadge.bg, paddingHorizontal: 7, paddingVertical: 2, borderRadius: BorderRadius.full }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: paymentBadge.color }}>
              {paymentBadge.label}
            </Text>
          </View>
        )}

        {order.isApproved === false && (
          <View
            style={{
              backgroundColor: '#FEF3C7',
              borderColor: '#F59E0B',
              borderWidth: 1,
              paddingHorizontal: 7,
              paddingVertical: 2,
              borderRadius: BorderRadius.full,
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: '800', color: '#B45309' }}>
              ⏳ Onay Bekliyor
            </Text>
          </View>
        )}

        {Boolean(order.takeoverRequestedById) && (
          <View
            style={{
              backgroundColor: '#EFF6FF',
              borderColor: '#3B82F6',
              borderWidth: 1,
              paddingHorizontal: 7,
              paddingVertical: 2,
              borderRadius: BorderRadius.full,
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: '800', color: '#1D4ED8' }}>
              🔔 Devir Talebi
            </Text>
          </View>
        )}

        {order.user?.fullName && (
          <View
            style={{
              backgroundColor: order.userId === currentUserId ? theme.primary + '18' : theme.surface,
              borderColor: order.userId === currentUserId ? theme.primary + '40' : theme.border,
              borderWidth: 1,
              paddingHorizontal: 7,
              paddingVertical: 2,
              borderRadius: BorderRadius.full,
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: '700', color: order.userId === currentUserId ? theme.primary : theme.textSecondary }}>
              {order.userId === currentUserId ? '👤 Benim İşim' : `🔧 ${order.user.fullName}`}
            </Text>
          </View>
        )}
      </View>

      <View style={styles(theme).cardFooter}>
        <View style={styles(theme).footerItem}>
          <Text style={styles(theme).footerLabel}>Parça</Text>
          <Text style={styles(theme).footerValue}>
            {order._count?.items || 0} kalem
          </Text>
        </View>
        {order.partsSaleTotal !== undefined && order.partsSaleTotal > 0 && (
          <View style={styles(theme).footerItem}>
            <Text style={styles(theme).footerLabel}>Parça Satış</Text>
            <Text style={[styles(theme).footerValue, { color: theme.success }]}>
              ₺{order.partsSaleTotal.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
            </Text>
          </View>
        )}
        {order.laborCost > 0 && (
          <View style={styles(theme).footerItem}>
            <Text style={styles(theme).footerLabel}>İşçilik</Text>
            <Text style={[styles(theme).footerValue, { color: theme.primary }]}>
              ₺{order.laborCost.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
            </Text>
          </View>
        )}
        {order.totalAmount > 0 && (
          <View style={styles(theme).footerItem}>
            <Text style={styles(theme).footerLabel}>Toplam</Text>
            <Text style={[styles(theme).footerValue, { color: theme.accent, fontWeight: '800' }]}>
              ₺{order.totalAmount.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
            </Text>
          </View>
        )}
        <ChevronRight size={16} color={theme.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

export default function WorkOrdersScreen() {
  const { colors: theme } = useAppTheme();
  const { user } = useAuthStore();
  const isTechnician = isTechnicianRole(user?.role);
  const dynamicStyles = useMemo(() => styles(theme), [theme]);
  // Teknisyen için varsayılan 'MY' (Benim İşlerim), Admin/Manager için 'ALL' (Tüm Atölye)
  const [scopeFilter, setScopeFilter] = useState<'MY' | 'ALL'>(isTechnician ? 'MY' : 'ALL');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['work-orders', search, statusFilter, scopeFilter],
    queryFn: () => workOrderAPI.getAll({
      search: search || undefined,
      status: statusFilter || undefined,
      myOrders: scopeFilter === 'MY' ? true : undefined,
      limit: 50,
    }),
    placeholderData: (prev) => prev,
  });

  const { data: statsData, refetch: refetchStats } = useQuery({
    queryKey: ['workOrderStats'],
    queryFn: () => workOrderAPI.getStats(),
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
      refetchStats();
    }, [refetch, refetchStats])
  );

  const orders: any[] = (data as any)?.data || [];
  const stats = (statsData as any)?.data;

  return (
    <SafeAreaView style={dynamicStyles.container} edges={['top']}>
      {/* Header */}
      <LinearGradient colors={[theme.primary + 'CC', theme.primaryDark + 'EE'] as [string, string]} style={dynamicStyles.header}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={{ color: 'rgba(255,255,255,0.8)', marginBottom: 4 }}>← Geri</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: Typography.fontSize.xl, fontWeight: '800', color: '#fff' }}>📋 İş Emirleri</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: Spacing.xs }}>
            {!isTechnician && (
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(239,68,68,0.3)', borderRadius: BorderRadius.md, paddingHorizontal: Spacing.sm + 2, paddingVertical: Spacing.sm, borderWidth: 1, borderColor: 'rgba(239,68,68,0.5)' }}
                onPress={() => router.push('/work-orders/receivables' as any)}
              >
                <Text style={{ fontSize: 13 }}>📒</Text>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: Typography.fontSize.xs }}>Veresiye</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: BorderRadius.md, paddingHorizontal: Spacing.sm + 2, paddingVertical: Spacing.sm, borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)' }}
              onPress={() => router.push('/work-orders/plate-history' as any)}
            >
              <Text style={{ fontSize: 13 }}>🚗</Text>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: Typography.fontSize.xs }}>Plaka</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: BorderRadius.md, paddingHorizontal: Spacing.sm + 2, paddingVertical: Spacing.sm, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' }}
              onPress={() => router.push('/work-orders/create' as any)}
            >
              <Plus size={14} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: Typography.fontSize.xs }}>Yeni</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Row */}
        {stats && (
          <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md }}>
            {[
              { label: 'Bugün', value: stats.todayCount },
              { label: 'Açık', value: stats.openCount },
              { label: 'Devam', value: stats.inProgressCount },
            ].map((s, i) => (
              <View key={i} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: BorderRadius.md, padding: Spacing.sm, alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: Typography.fontSize.lg }}>{s.value}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: Typography.fontSize.xs }}>{s.label}</Text>
              </View>
            ))}
          </View>
        )}
      </LinearGradient>

      {/* Kapsam Seçici: Benim İşlerim vs Tüm Atölye Havuzu */}
      <View style={{ flexDirection: 'row', paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.xs, gap: Spacing.sm }}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setScopeFilter('MY')}
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 9,
            borderRadius: BorderRadius.md,
            backgroundColor: scopeFilter === 'MY' ? theme.primary : theme.surface,
            borderWidth: 1,
            borderColor: scopeFilter === 'MY' ? theme.primary : theme.border,
            gap: 6,
          }}
        >
          <Text style={{ fontSize: 13 }}>👤</Text>
          <Text style={{ color: scopeFilter === 'MY' ? '#fff' : theme.textSecondary, fontWeight: '700', fontSize: Typography.fontSize.xs }}>
            {isTechnician ? 'Benim İşlerim' : 'Üzerimdekiler'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setScopeFilter('ALL')}
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 9,
            borderRadius: BorderRadius.md,
            backgroundColor: scopeFilter === 'ALL' ? theme.primary : theme.surface,
            borderWidth: 1,
            borderColor: scopeFilter === 'ALL' ? theme.primary : theme.border,
            gap: 6,
          }}
        >
          <Text style={{ fontSize: 13 }}>🏢</Text>
          <Text style={{ color: scopeFilter === 'ALL' ? '#fff' : theme.textSecondary, fontWeight: '700', fontSize: Typography.fontSize.xs }}>
            Tüm Atölye Havuzu
          </Text>
        </TouchableOpacity>
      </View>

      {/* Arama */}
      <View style={{ padding: Spacing.lg, paddingBottom: Spacing.sm }}>
        <TextInput
          style={dynamicStyles.searchInput}
          placeholder="İş emri, müşteri, araç ara..."
          placeholderTextColor={theme.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Status Filter */}
      <View style={{ marginBottom: Spacing.sm }}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: Spacing.lg, gap: Spacing.sm }}
          data={STATUS_FILTERS}
          keyExtractor={(item) => item.value}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[dynamicStyles.filterChip, statusFilter === item.value && { backgroundColor: theme.primary, borderColor: theme.primary }]}
              onPress={() => setStatusFilter(item.value)}
            >
              <Text style={[dynamicStyles.filterChipText, statusFilter === item.value && { color: '#fff', fontWeight: '700' }]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Liste */}
      {isLoading ? (
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <WorkOrderCard
              order={item}
              theme={theme}
              onPress={() => router.push(`/work-orders/${item.id}` as any)}
              currentUserId={user?.id}
            />
          )}
          contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: 80, gap: Spacing.sm }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={theme.primary} />}
          ListEmptyComponent={
            <View style={dynamicStyles.empty}>
              <Text style={dynamicStyles.emptyEmoji}>📋</Text>
              <Text style={dynamicStyles.emptyTitle}>İş emri bulunamadı</Text>
              <TouchableOpacity
                style={[dynamicStyles.emptyBtn, { backgroundColor: theme.primary }]}
                onPress={() => router.push('/work-orders/create' as any)}
              >
                <Text style={dynamicStyles.emptyBtnText}>+ Yeni İş Emri</Text>
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
  header: {
    padding: Spacing.lg, paddingTop: Spacing.md,
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  searchInput: {
    backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border,
    borderRadius: BorderRadius.md, padding: Spacing.md, color: theme.textPrimary,
    fontSize: Typography.fontSize.sm,
  },
  filterChip: {
    paddingHorizontal: Spacing.md, paddingVertical: 6,
    borderRadius: BorderRadius.full, borderWidth: 1, borderColor: theme.border,
    backgroundColor: theme.surface,
  },
  filterChipText: { fontSize: Typography.fontSize.xs, color: theme.textSecondary },

  card: {
    backgroundColor: theme.surface, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: theme.border, ...Shadows.sm, overflow: 'hidden',
  },
  cardRow: { flexDirection: 'row', padding: Spacing.md, gap: Spacing.sm },
  orderTitle: { fontSize: Typography.fontSize.base, fontWeight: '700', color: theme.textPrimary, marginBottom: 2 },
  orderCustomer: { fontSize: Typography.fontSize.xs, color: theme.textSecondary, marginBottom: 1 },
  orderVehicle: { fontSize: Typography.fontSize.xs, color: theme.textMuted },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.full },
  statusText: { fontSize: Typography.fontSize.xs, fontWeight: '700' },
  orderDate: { fontSize: Typography.fontSize.xs, color: theme.textMuted },

  cardFooter: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm,
    borderTopWidth: 1, borderTopColor: theme.border, paddingTop: Spacing.sm, gap: Spacing.md,
  },
  footerItem: { alignItems: 'center' },
  footerLabel: { fontSize: Typography.fontSize.xs, color: theme.textMuted },
  footerValue: { fontSize: Typography.fontSize.sm, fontWeight: '700', color: theme.textPrimary },

  empty: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 64, marginBottom: Spacing.md },
  emptyTitle: { fontSize: Typography.fontSize.lg, fontWeight: '700', color: theme.textPrimary, marginBottom: Spacing.md },
  emptyBtn: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: BorderRadius.md },
  emptyBtnText: { color: '#fff', fontWeight: '700' },
});
