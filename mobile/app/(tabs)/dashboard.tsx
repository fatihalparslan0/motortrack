import React from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useAuthStore } from '../../src/store/auth.store';
import { motorsAPI, partsAPI, maintenanceAPI, subscriptionsAPI } from '../../src/api/client';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../src/constants/theme';

function StatCard({ emoji, label, value, color, onPress }: any) {
  return (
    <TouchableOpacity style={[styles.statCard, { borderColor: color + '40' }]} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.statIconBg, { backgroundColor: color + '20' }]}>
        <Text style={styles.statEmoji}>{emoji}</Text>
      </View>
      <Text style={[styles.statValue, { color }]}>{value ?? '-'}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function AlertItem({ title, subtitle, type }: any) {
  const colors: any = { danger: Colors.danger, warning: Colors.warning, info: Colors.primary };
  return (
    <View style={[styles.alertItem, { borderLeftColor: colors[type] || Colors.primary }]}>
      <Text style={styles.alertTitle}>{title}</Text>
      <Text style={styles.alertSubtitle}>{subtitle}</Text>
    </View>
  );
}

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);

  const { data: motorStats, isLoading: l1, refetch: r1 } = useQuery({
    queryKey: ['motorStats'],
    queryFn: () => motorsAPI.getStats(),
  });

  const { data: partStats, isLoading: l2, refetch: r2 } = useQuery({
    queryKey: ['partStats'],
    queryFn: () => partsAPI.getStats(),
  });

  const { data: upcoming, isLoading: l3, refetch: r3 } = useQuery({
    queryKey: ['upcomingMaintenance'],
    queryFn: () => maintenanceAPI.getUpcoming(7),
  });

  const { data: lowStock, isLoading: l4, refetch: r4 } = useQuery({
    queryKey: ['lowStock'],
    queryFn: () => partsAPI.getLowStock(),
  });

  const { data: subscription } = useQuery({
    queryKey: ['subscriptionStatus'],
    queryFn: () => subscriptionsAPI.getStatus(),
  });

  const isLoading = l1 || l2 || l3 || l4;
  const refetch = () => { r1(); r2(); r3(); r4(); };

  const ms = (motorStats as any)?.data;
  const ps = (partStats as any)?.data;
  const upcomingList = (upcoming as any)?.data || [];
  const lowStockList = (lowStock as any)?.data || [];
  const sub = (subscription as any)?.data;

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Günaydın';
    if (h < 18) return 'İyi günler';
    return 'İyi akşamlar';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={Colors.primary} />}
      >
        {/* Header */}
        <LinearGradient colors={['#1A1D27', '#0F1117']} style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting()}, {user?.fullName?.split(' ')[0]} 👋</Text>
            <Text style={styles.companyName}>{user?.companyName}</Text>
          </View>
          <TouchableOpacity
            style={styles.notificationBtn}
            onPress={() => router.push('/notifications' as any)}
          >
            <Text style={styles.notificationIcon}>🔔</Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* Trial Banner */}
        {sub?.status === 'TRIAL' && (
          <TouchableOpacity onPress={() => router.push('/subscription/plans' as any)}>
            <LinearGradient colors={['rgba(99,102,241,0.3)', 'rgba(79,70,229,0.2)']} style={styles.trialBanner}>
              <Text style={styles.trialBannerText}>
                🎉 Deneme süresi: <Text style={styles.trialDays}>{sub.daysLeft} gün kaldı</Text>
              </Text>
              <Text style={styles.trialBannerCta}>Plan Seç →</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Genel Durum</Text>
          <View style={styles.statsGrid}>
            <StatCard
              emoji="⚙️" label="Toplam Motor" value={ms?.totalMotors}
              color={Colors.primary} onPress={() => router.push('/(tabs)/motors/index' as any)}
            />
            <StatCard
              emoji="✅" label="Aktif Motor" value={ms?.activeMotors}
              color={Colors.success} onPress={() => router.push('/(tabs)/motors/index' as any)}
            />
            <StatCard
              emoji="🔧" label="Bakımda" value={ms?.maintenanceMotors}
              color={Colors.warning} onPress={() => router.push('/(tabs)/maintenance/index' as any)}
            />
            <StatCard
              emoji="📦" label="Toplam Parça" value={ps?.totalParts}
              color={Colors.secondary} onPress={() => router.push('/(tabs)/parts/index' as any)}
            />
          </View>
        </View>

        {/* Alerts */}
        {(lowStockList.length > 0 || upcomingList.length > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚠️ Dikkat Gerektiren Durumlar</Text>
            <View style={styles.alertsContainer}>
              {lowStockList.slice(0, 3).map((part: any) => (
                <AlertItem
                  key={part.id}
                  title={`Düşük Stok: ${part.name}`}
                  subtitle={`Mevcut: ${part.quantity} ${part.unit} (Min: ${part.min_quantity})`}
                  type="danger"
                />
              ))}
              {upcomingList.slice(0, 3).map((m: any) => (
                <AlertItem
                  key={m.id}
                  title={`Planlı Bakım: ${m.motor?.brand} ${m.motor?.model}`}
                  subtitle={`${m.title} — ${new Date(m.nextMaintenanceDate).toLocaleDateString('tr-TR')}`}
                  type="warning"
                />
              ))}
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hızlı İşlemler</Text>
          <View style={styles.quickActions}>
            {[
              { emoji: '➕', label: 'Motor Ekle', path: '/(tabs)/motors/create' },
              { emoji: '📦', label: 'Parça Ekle', path: '/(tabs)/parts/create' },
              { emoji: '📢', label: 'İlan Ver', path: '/(tabs)/marketplace/create' },
              { emoji: '📷', label: 'QR Tara', path: '/(tabs)/motors/scan' },
            ].map((action) => (
              <TouchableOpacity
                key={action.label}
                style={styles.quickAction}
                onPress={() => router.push(action.path as any)}
                activeOpacity={0.8}
              >
                <LinearGradient colors={['#232736', '#1A1D27']} style={styles.quickActionInner}>
                  <Text style={styles.quickActionEmoji}>{action.emoji}</Text>
                  <Text style={styles.quickActionLabel}>{action.label}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ height: Spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: Spacing.lg, paddingTop: Spacing.md,
  },
  greeting: { fontSize: Typography.fontSize.xl, fontWeight: '700', color: Colors.textPrimary },
  companyName: { fontSize: Typography.fontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  notificationBtn: {
    width: 44, height: 44, borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  notificationIcon: { fontSize: 20 },

  trialBanner: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginHorizontal: Spacing.lg, marginBottom: Spacing.md,
    padding: Spacing.md, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: 'rgba(99,102,241,0.4)',
  },
  trialBannerText: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm },
  trialDays: { color: Colors.primaryLight, fontWeight: '700' },
  trialBannerCta: { color: Colors.primary, fontWeight: '600', fontSize: Typography.fontSize.sm },

  section: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  sectionTitle: {
    fontSize: Typography.fontSize.base, fontWeight: '700',
    color: Colors.textPrimary, marginBottom: Spacing.md,
  },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  statCard: {
    flex: 1, minWidth: '45%', backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg, padding: Spacing.md,
    borderWidth: 1, alignItems: 'center',
    ...Shadows.sm,
  },
  statIconBg: { width: 48, height: 48, borderRadius: BorderRadius.md, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statEmoji: { fontSize: 22 },
  statValue: { fontSize: Typography.fontSize['2xl'], fontWeight: '800' },
  statLabel: { fontSize: Typography.fontSize.xs, color: Colors.textMuted, marginTop: 2, textAlign: 'center' },

  alertsContainer: { gap: Spacing.sm },
  alertItem: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    padding: Spacing.md, borderLeftWidth: 3,
  },
  alertTitle: { color: Colors.textPrimary, fontWeight: '600', fontSize: Typography.fontSize.sm },
  alertSubtitle: { color: Colors.textSecondary, fontSize: Typography.fontSize.xs, marginTop: 2 },

  quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  quickAction: { flex: 1, minWidth: '45%', borderRadius: BorderRadius.md, overflow: 'hidden' },
  quickActionInner: {
    padding: Spacing.md, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md,
  },
  quickActionEmoji: { fontSize: 28, marginBottom: 6 },
  quickActionLabel: { color: Colors.textSecondary, fontSize: Typography.fontSize.xs, textAlign: 'center' },
});
