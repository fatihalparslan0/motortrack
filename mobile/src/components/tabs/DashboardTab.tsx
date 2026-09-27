import React, { useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useAuthStore } from '../../store/auth.store';
import { useThemeStore } from '../../store/theme.store';
import { useAppTheme } from '../../hooks/useAppTheme';
import { motorsAPI, partsAPI, workOrderAPI, subscriptionsAPI } from '../../api/client';
import { Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { useTabStore } from '../../store/tab.store';
import { 
  Settings, CheckCircle, ClipboardList, Package, Bell, 
  PlusCircle, Megaphone, ScanLine, Moon, Sun, Palette
} from 'lucide-react-native';

function StatCard({ Icon, label, value, color, onPress, theme }: any) {
  return (
    <TouchableOpacity style={[styles(theme).statCard, { borderColor: color + '40' }]} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles(theme).statIconBg, { backgroundColor: color + '20' }]}>
        <Icon size={24} color={color} />
      </View>
      <Text style={[styles(theme).statValue, { color }]}>{value ?? '-'}</Text>
      <Text style={styles(theme).statLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function AlertItem({ title, subtitle, type, theme, onPress }: any) {
  const colors: any = { danger: theme.danger, warning: theme.warning, info: theme.primary };
  return (
    <TouchableOpacity onPress={onPress} disabled={!onPress} activeOpacity={0.8}>
      <View style={[styles(theme).alertItem, { borderLeftColor: colors[type] || theme.primary }]}>
        <Text style={styles(theme).alertTitle}>{title}</Text>
        <Text style={styles(theme).alertSubtitle}>{subtitle}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const { colors: theme, themeMode } = useAppTheme();
  const setTheme = useThemeStore((s) => s.setTheme);
  const setActiveTab = useTabStore((s) => s.setActiveTab);

  const { data: motorStats, isLoading: l1, refetch: r1 } = useQuery({
    queryKey: ['motorStats'],
    queryFn: () => motorsAPI.getStats(),
  });

  const { data: partStats, isLoading: l2, refetch: r2 } = useQuery({
    queryKey: ['partStats'],
    queryFn: () => partsAPI.getStats(),
  });

  const { data: woStatsData, isLoading: l3, refetch: r3 } = useQuery({
    queryKey: ['workOrderStats'],
    queryFn: () => workOrderAPI.getStats(),
  });

  const { data: recData, isLoading: l4, refetch: r4 } = useQuery({
    queryKey: ['receivables'],
    queryFn: () => workOrderAPI.getReceivables(),
  });

  const { data: lowStock, isLoading: l5, refetch: r5 } = useQuery({
    queryKey: ['lowStock'],
    queryFn: () => partsAPI.getLowStock(),
  });

  const { data: subscription } = useQuery({
    queryKey: ['subscriptionStatus'],
    queryFn: () => subscriptionsAPI.getStatus(),
  });

  const isLoading = l1 || l2 || l3 || l4 || l5;
  const refetch = () => { r1(); r2(); r3(); r4(); r5(); };

  const ms = (motorStats as any)?.data;
  const ps = (partStats as any)?.data;
  const woStats = (woStatsData as any)?.data;
  const receivables = (recData as any)?.data;
  const lowStockList = (lowStock as any)?.data || [];
  const sub = (subscription as any)?.data;

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Günaydın';
    if (h < 18) return 'İyi günler';
    return 'İyi akşamlar';
  };

  const toggleTheme = () => {
    if (themeMode === 'light') setTheme('dark');
    else if (themeMode === 'dark') setTheme('navy');
    else setTheme('light');
  };

  const ThemeIcon = themeMode === 'light' ? Sun : themeMode === 'dark' ? Moon : Palette;

  const dynamicStyles = useMemo(() => styles(theme), [theme]);

  // LinearGradient colors based on theme
  const gradientHeaderColors = themeMode === 'light' 
    ? [theme.primary, theme.primaryDark] 
    : [theme.surface, theme.background];

  return (
    <SafeAreaView style={dynamicStyles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={theme.primary} />}
      >
        {/* Header */}
        <LinearGradient colors={gradientHeaderColors as [string, string]} style={dynamicStyles.header}>
          <View>
            <Text style={[dynamicStyles.greeting, themeMode === 'light' && {color: '#FFF'}]}>{greeting()}, {user?.fullName?.split(' ')[0]} 👋</Text>
            <Text style={[dynamicStyles.companyName, themeMode === 'light' && {color: 'rgba(255,255,255,0.8)'}]}>{user?.companyName}</Text>
          </View>
          <View style={{flexDirection: 'row', gap: 10}}>
            <TouchableOpacity style={dynamicStyles.iconBtn} onPress={toggleTheme}>
              <ThemeIcon size={20} color={themeMode === 'light' ? '#FFF' : theme.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={dynamicStyles.iconBtn}
              onPress={() => router.push('/notifications' as any)}
            >
              <Bell size={20} color={themeMode === 'light' ? '#FFF' : theme.textPrimary} />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Trial Banner */}
        {sub?.status === 'TRIAL' && (
          <TouchableOpacity onPress={() => router.push('/subscription/plans' as any)}>
            <LinearGradient colors={[theme.primary + '30', theme.primary + '10']} style={dynamicStyles.trialBanner}>
              <Text style={dynamicStyles.trialBannerText}>
                🎉 Deneme süresi: <Text style={dynamicStyles.trialDays}>{sub.daysLeft} gün kaldı</Text>
              </Text>
              <Text style={dynamicStyles.trialBannerCta}>Plan Seç →</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Stats */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>Genel Durum</Text>
          <View style={dynamicStyles.statsGrid}>
            <StatCard
              Icon={ClipboardList} label="Açık İş Emri" value={woStats?.openCount}
              color={theme.primary} onPress={() => setActiveTab(1)}
              theme={theme}
            />
            <StatCard
              Icon={Package} label="Toplam Parça" value={ps?.totalParts}
              color={theme.secondary} onPress={() => setActiveTab(2)}
              theme={theme}
            />
          </View>
        </View>

        {/* Alerts */}
        {(lowStockList.length > 0 || (receivables?.totalReceivables > 0)) && (
          <View style={dynamicStyles.section}>
            <Text style={dynamicStyles.sectionTitle}>⚠️ Dikkat Gerektiren Durumlar</Text>
            <View style={dynamicStyles.alertsContainer}>
              {receivables?.totalReceivables > 0 && (
                <AlertItem
                  title={`📒 Açık Hesap & Veresiye: ₺${receivables.totalReceivables.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`}
                  subtitle={`${receivables.debtorOrdersCount} müşteriden tahsilat bekleyen alacak mevcut.`}
                  type="warning"
                  theme={theme}
                  onPress={() => router.push('/work-orders/receivables' as any)}
                />
              )}
              {lowStockList.slice(0, 3).map((part: any) => (
                <AlertItem
                  key={part.id}
                  title={`Düşük Stok: ${part.name}`}
                  subtitle={`Mevcut: ${part.quantity} ${part.unit} (Min: ${part.min_quantity})`}
                  type="danger"
                  theme={theme}
                  onPress={() => router.push(`/parts/${part.id}` as any)}
                />
              ))}
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>Hızlı İşlemler</Text>
          <View style={dynamicStyles.quickActions}>
            {[
              { Icon: ClipboardList, label: 'Yeni İş Emri', path: '/work-orders/create' },
              { Icon: Package, label: 'Parça Ekle', path: '/parts/create' },
              { Icon: Megaphone, label: 'İlan Ver', path: '/marketplace/create' },
            ].map((action) => (
              <TouchableOpacity
                key={action.label}
                style={dynamicStyles.quickAction}
                onPress={() => router.push(action.path as any)}
                activeOpacity={0.8}
              >
                <View style={dynamicStyles.quickActionInner}>
                  <action.Icon size={28} color={theme.primary} style={{marginBottom: 6}} />
                  <Text style={dynamicStyles.quickActionLabel}>{action.label}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ height: Spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: Spacing.lg, paddingTop: Spacing.md,
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
    marginBottom: Spacing.md,
    ...Shadows.sm
  },
  greeting: { fontSize: Typography.fontSize.xl, fontWeight: '700', color: theme.textPrimary },
  companyName: { fontSize: Typography.fontSize.sm, color: theme.textSecondary, marginTop: 2 },
  iconBtn: {
    width: 44, height: 44, borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: theme.border,
  },

  trialBanner: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginHorizontal: Spacing.lg, marginBottom: Spacing.md,
    padding: Spacing.md, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: theme.primary + '50',
  },
  trialBannerText: { color: theme.textSecondary, fontSize: Typography.fontSize.sm },
  trialDays: { color: theme.primary, fontWeight: '700' },
  trialBannerCta: { color: theme.primary, fontWeight: '600', fontSize: Typography.fontSize.sm },

  section: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  sectionTitle: {
    fontSize: Typography.fontSize.base, fontWeight: '700',
    color: theme.textPrimary, marginBottom: Spacing.md,
  },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  statCard: {
    flex: 1, minWidth: '45%', backgroundColor: theme.surface,
    borderRadius: BorderRadius.lg, padding: Spacing.md,
    borderWidth: 1, alignItems: 'center',
    ...Shadows.sm,
  },
  statIconBg: { width: 48, height: 48, borderRadius: BorderRadius.full, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statValue: { fontSize: Typography.fontSize['2xl'], fontWeight: '800' },
  statLabel: { fontSize: Typography.fontSize.xs, color: theme.textMuted, marginTop: 4, textAlign: 'center' },

  alertsContainer: { gap: Spacing.sm },
  alertItem: {
    backgroundColor: theme.surface, borderRadius: BorderRadius.md,
    padding: Spacing.md, borderLeftWidth: 4,
    ...Shadows.sm,
  },
  alertTitle: { color: theme.textPrimary, fontWeight: '600', fontSize: Typography.fontSize.sm },
  alertSubtitle: { color: theme.textSecondary, fontSize: Typography.fontSize.xs, marginTop: 4 },

  quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  quickAction: { flex: 1, minWidth: '45%', borderRadius: BorderRadius.md, overflow: 'hidden', ...Shadows.sm },
  quickActionInner: {
    padding: Spacing.md, alignItems: 'center', backgroundColor: theme.surface,
    borderWidth: 1, borderColor: theme.border, borderRadius: BorderRadius.md,
  },
  quickActionLabel: { color: theme.textPrimary, fontWeight: '500', fontSize: Typography.fontSize.sm, textAlign: 'center' },
});
