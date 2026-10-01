import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { workOrderAPI } from '../../api/client';
import { Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useAuthStore, canManageFinancesRole } from '../../store/auth.store';
import { Plus, ChevronRight, Search, ClipboardList } from 'lucide-react-native';

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

function WorkOrderCard({ order, onPress, theme }: any) {
  const statusColor = STATUS_COLORS[order.status] || '#94A3B8';
  const statusLabel = STATUS_LABELS[order.status] || order.status;

  const total = parseFloat(order.totalAmount || 0);
  const paid = parseFloat(order.paidAmount || 0);
  const remaining = Math.max(0, total - paid);

  const paymentBadge = {
    ODENDI: { label: '✅ Ödendi', color: theme.success, bg: theme.success + '15' },
    KISMI: {
      label: `🟡 Kalan ₺${remaining.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`,
      color: '#F59E0B',
      bg: '#F59E0B15',
    },
    VERESIYE: {
      label: `🔴 Veresiye ₺${remaining.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`,
      color: theme.danger,
      bg: theme.danger + '15',
    },
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
          <Text style={styles(theme).orderTitle} numberOfLines={1}>
            {order.title}
          </Text>
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

      {/* Payment / Veresiye status pill */}
      {paymentBadge && (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, marginBottom: 2 }}>
          <View
            style={{
              backgroundColor: paymentBadge.bg,
              paddingHorizontal: 7,
              paddingVertical: 2,
              borderRadius: BorderRadius.full,
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: '700', color: paymentBadge.color }}>
              {paymentBadge.label}
            </Text>
          </View>
        </View>
      )}

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

export default function WorkOrdersTab() {
  const { colors: theme } = useAppTheme();
  const { user } = useAuthStore();
  const canManageFinances = canManageFinancesRole(user?.role);
  const dynamicStyles = useMemo(() => styles(theme), [theme]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['work-orders', search, statusFilter],
    queryFn: () =>
      workOrderAPI.getAll({
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        limit: 50,
      }),
    placeholderData: (prev) => prev,
  });

  const { data: statsData } = useQuery({
    queryKey: ['workOrderStats'],
    queryFn: () => workOrderAPI.getStats(),
  });

  const orders: any[] = (data as any)?.data || [];
  const stats = (statsData as any)?.data;

  return (
    <SafeAreaView style={dynamicStyles.container} edges={['top']}>
      {/* Header */}
      <LinearGradient
        colors={[theme.primary + 'EE', theme.primaryDark || '#1E40AF'] as [string, string]}
        style={dynamicStyles.header}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ fontSize: Typography.fontSize.xl, fontWeight: '900', color: '#fff' }}>
              📋 İş Emirleri
            </Text>
            <Text style={{ fontSize: Typography.fontSize.xs, color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>
              Servis & Onarım Yönetimi
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: Spacing.xs }}>
            {canManageFinances && (
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  backgroundColor: 'rgba(239,68,68,0.3)',
                  borderRadius: BorderRadius.md,
                  paddingHorizontal: Spacing.sm + 2,
                  paddingVertical: Spacing.sm,
                  borderWidth: 1,
                  borderColor: 'rgba(239,68,68,0.5)',
                }}
                onPress={() => router.push('/work-orders/receivables' as any)}
              >
                <Text style={{ fontSize: 13 }}>📒</Text>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: Typography.fontSize.xs }}>
                  Veresiye
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                backgroundColor: 'rgba(255,255,255,0.22)',
                borderRadius: BorderRadius.md,
                paddingHorizontal: Spacing.sm + 2,
                paddingVertical: Spacing.sm,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.35)',
              }}
              onPress={() => router.push('/work-orders/plate-history' as any)}
            >
              <Text style={{ fontSize: 13 }}>🚗</Text>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: Typography.fontSize.xs }}>
                Plaka
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                backgroundColor: 'rgba(255,255,255,0.2)',
                borderRadius: BorderRadius.md,
                paddingHorizontal: Spacing.sm + 2,
                paddingVertical: Spacing.sm,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.3)',
              }}
              onPress={() => router.push('/work-orders/create' as any)}
            >
              <Plus size={14} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: Typography.fontSize.xs }}>
                Yeni
              </Text>
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
              <View
                key={i}
                style={{
                  flex: 1,
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  borderRadius: BorderRadius.md,
                  padding: Spacing.sm,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: Typography.fontSize.lg }}>
                  {s.value}
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: Typography.fontSize.xs }}>
                  {s.label}
                </Text>
              </View>
            ))}
          </View>
        )}
      </LinearGradient>

      {/* Search Input */}
      <View style={{ paddingHorizontal: Spacing.lg, paddingVertical: Spacing.xs }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.surface,
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: BorderRadius.md,
            paddingHorizontal: Spacing.md,
            height: 44,
            gap: Spacing.sm,
          }}
        >
          <Search size={18} color={theme.textMuted} />
          <TextInput
            style={{ flex: 1, color: theme.textPrimary, fontSize: Typography.fontSize.sm }}
            placeholder="İş emri, müşteri veya plaka ara..."
            placeholderTextColor={theme.textMuted}
            value={search}
            onChangeText={setSearch}
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={{ paddingVertical: Spacing.xs }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: Spacing.lg, gap: Spacing.xs }}>
          {STATUS_FILTERS.map((tab) => {
            const isSelected = statusFilter === tab.value;
            return (
              <TouchableOpacity
                key={tab.value}
                style={[
                  dynamicStyles.filterChip,
                  isSelected && dynamicStyles.filterChipSelected,
                ]}
                onPress={() => setStatusFilter(tab.value)}
              >
                <Text
                  style={[
                    dynamicStyles.filterChipText,
                    isSelected && dynamicStyles.filterChipTextSelected,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Orders List */}
      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={{ color: theme.textSecondary, marginTop: Spacing.sm, fontSize: Typography.fontSize.sm }}>
            İş emirleri yükleniyor...
          </Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <WorkOrderCard
              order={item}
              onPress={() => router.push(`/work-orders/${item.id}` as any)}
              theme={theme}
            />
          )}
          contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 60, gap: Spacing.sm }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.primary} />
          }
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 60, paddingHorizontal: Spacing.xl }}>
              <Text style={{ fontSize: 56, marginBottom: Spacing.md }}>📋</Text>
              <Text style={{ fontSize: Typography.fontSize.lg, fontWeight: '800', color: theme.textPrimary, marginBottom: Spacing.xs, textAlign: 'center' }}>
                İş Emri Bulunamadı
              </Text>
              <Text style={{ color: theme.textMuted, marginBottom: Spacing.lg, textAlign: 'center', fontSize: Typography.fontSize.sm }}>
                {search || statusFilter
                  ? 'Filtrelerinize uygun iş emri kaydı bulunamadı.'
                  : 'Servise gelen araçlar için yeni iş emri açarak parçaları ve işçiliği kaydedin.'}
              </Text>
              <TouchableOpacity
                style={{
                  backgroundColor: theme.primary,
                  paddingHorizontal: Spacing.xl,
                  paddingVertical: Spacing.md,
                  borderRadius: BorderRadius.md,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  ...Shadows.sm,
                }}
                onPress={() => router.push('/work-orders/create' as any)}
              >
                <Plus size={16} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: Typography.fontSize.sm }}>
                  Yeni İş Emri Aç
                </Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = (theme: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    header: { padding: Spacing.lg, paddingTop: Spacing.md, ...Shadows.md },
    filterChip: {
      paddingHorizontal: Spacing.md,
      paddingVertical: 6,
      borderRadius: BorderRadius.full,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
    },
    filterChipSelected: {
      backgroundColor: theme.primary + '20',
      borderColor: theme.primary,
    },
    filterChipText: {
      fontSize: Typography.fontSize.xs,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    filterChipTextSelected: {
      color: theme.primary,
      fontWeight: '800',
    },
    card: {
      backgroundColor: theme.surface,
      borderRadius: BorderRadius.lg,
      borderWidth: 1,
      borderColor: theme.border,
      padding: Spacing.md,
      ...Shadows.sm,
    },
    cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    orderTitle: { fontSize: Typography.fontSize.base, fontWeight: '700', color: theme.textPrimary, marginBottom: 2 },
    orderCustomer: { fontSize: Typography.fontSize.xs, color: theme.textSecondary, marginBottom: 2 },
    orderVehicle: { fontSize: Typography.fontSize.xs, color: theme.textMuted },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.full },
    statusText: { fontSize: 11, fontWeight: '700' },
    orderDate: { fontSize: 11, color: theme.textMuted },
    cardFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: Spacing.md,
      paddingTop: Spacing.sm,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    footerItem: { alignItems: 'flex-start' },
    footerLabel: { fontSize: 10, color: theme.textMuted },
    footerValue: { fontSize: Typography.fontSize.xs, fontWeight: '600', color: theme.textPrimary },
  });
