import React, { useState, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { listingsAPI } from '../../api/client';
import { Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { useAppTheme } from '../../hooks/useAppTheme';

function ListingCard({ listing, onPress, theme }: any) {
  const dynamicStyles = useMemo(() => styles(theme), [theme]);
  
  const CONDITION_CONFIG: Record<string, { label: string; color: string }> = {
    NEW: { label: 'Sıfır', color: theme.success },
    USED: { label: 'İkinci El', color: theme.warning },
    REFURBISHED: { label: 'Yenilenmiş', color: theme.primary },
    DAMAGED: { label: 'Hasarlı', color: theme.danger },
  };

  const condition = CONDITION_CONFIG[listing.condition] || CONDITION_CONFIG.USED;
  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'Bugün';
    if (days === 1) return 'Dün';
    return `${days} gün önce`;
  };

  return (
    <TouchableOpacity style={dynamicStyles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={dynamicStyles.cardHeader}>
        <View style={dynamicStyles.imagePlaceholder}>
          {listing.imageUrls?.length > 0
            ? <Text style={dynamicStyles.imageIcon}>🖼️</Text>
            : <Text style={dynamicStyles.imageIcon}>🔩</Text>
          }
        </View>
        <View style={dynamicStyles.cardInfo}>
          <Text style={dynamicStyles.cardTitle} numberOfLines={2}>{listing.title}</Text>
          <View style={dynamicStyles.badgeRow}>
            <View style={[dynamicStyles.badge, { backgroundColor: condition.color + '20', borderColor: condition.color + '40' }]}>
              <Text style={[dynamicStyles.badgeText, { color: condition.color }]}>{condition.label}</Text>
            </View>
          </View>
          <Text style={dynamicStyles.company}>🏢 {listing.company?.name}</Text>
          {listing.company?.city && <Text style={dynamicStyles.city}>📍 {listing.company.city}</Text>}
        </View>
      </View>
      <View style={dynamicStyles.cardFooter}>
        <Text style={dynamicStyles.price}>₺{parseFloat(listing.price).toLocaleString('tr-TR')}</Text>
        <View style={dynamicStyles.metaRow}>
          <Text style={dynamicStyles.meta}>👁️ {listing.viewsCount}</Text>
          <Text style={dynamicStyles.meta}>{timeAgo(listing.createdAt)}</Text>
          {listing.quantity > 1 && <Text style={dynamicStyles.meta}>x{listing.quantity}</Text>}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function MarketplaceScreen() {
  const [search, setSearch] = useState('');
  const [condition, setCondition] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'marketplace' | 'my'>('marketplace');
  const { colors: theme } = useAppTheme();
  const dynamicStyles = useMemo(() => styles(theme), [theme]);
  
  const CONDITION_CONFIG: Record<string, { label: string; color: string }> = {
    NEW: { label: 'Sıfır', color: theme.success },
    USED: { label: 'İkinci El', color: theme.warning },
    REFURBISHED: { label: 'Yenilenmiş', color: theme.primary },
    DAMAGED: { label: 'Hasarlı', color: theme.danger },
  };

  const marketplaceQuery = useQuery({
    queryKey: ['marketplace', search, condition],
    queryFn: () => listingsAPI.getMarketplace({ search, condition, limit: 50 }),
    enabled: activeTab === 'marketplace',
  });

  const myListingsQuery = useQuery({
    queryKey: ['myListings'],
    queryFn: () => listingsAPI.getMy(),
    enabled: activeTab === 'my',
  });

  const activeQuery = activeTab === 'marketplace' ? marketplaceQuery : myListingsQuery;
  const listings = (activeQuery.data as any)?.data || [];

  return (
    <SafeAreaView style={dynamicStyles.container} edges={['top']}>
      {/* Header */}
      <View style={dynamicStyles.header}>
        <View>
          <Text style={dynamicStyles.title}>Pazar Yeri</Text>
          <Text style={dynamicStyles.subtitle}>Şirketler arası parça alım-satımı</Text>
        </View>
        <TouchableOpacity
          style={dynamicStyles.addBtn}
          onPress={() => router.push('/marketplace/create' as any)}
          activeOpacity={0.8}
        >
          <LinearGradient colors={[theme.primary, theme.primaryDark || '#4F46E5']} style={dynamicStyles.addBtnInner}>
            <Text style={dynamicStyles.addBtnText}>+ İlan</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={dynamicStyles.tabs}>
        {[
          { key: 'marketplace', label: '🏪 Tüm İlanlar' },
          { key: 'my', label: '📢 İlanlarım' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[dynamicStyles.tab, activeTab === tab.key && dynamicStyles.tabActive]}
            onPress={() => setActiveTab(tab.key as any)}
          >
            <Text style={[dynamicStyles.tabText, activeTab === tab.key && dynamicStyles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search (sadece marketplace için) */}
      {activeTab === 'marketplace' && (
        <>
          <View style={dynamicStyles.searchContainer}>
            <TextInput
              style={dynamicStyles.searchInput}
              placeholder="Parça, marka, açıklama ara..."
              placeholderTextColor={theme.textMuted}
              value={search}
              onChangeText={setSearch}
            />
          </View>
          <View style={dynamicStyles.filtersRow}>
            {['Hepsi', 'NEW', 'USED', 'REFURBISHED'].map((c) => (
              <TouchableOpacity
                key={c}
                style={[dynamicStyles.filter, (condition === (c === 'Hepsi' ? null : c)) && dynamicStyles.filterActive]}
                onPress={() => setCondition(c === 'Hepsi' ? null : c)}
              >
                <Text style={[
                  dynamicStyles.filterText,
                  (condition === (c === 'Hepsi' ? null : c)) && dynamicStyles.filterTextActive,
                ]}>
                  {c === 'Hepsi' ? 'Hepsi' : CONDITION_CONFIG[c]?.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {/* Listings */}
      {activeQuery.isLoading ? (
        <View style={dynamicStyles.loading}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ListingCard
              listing={item}
              theme={theme}
              onPress={() => router.push(`/marketplace/${item.id}` as any)}
            />
          )}
          contentContainerStyle={dynamicStyles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={activeQuery.isLoading}
              onRefresh={() => activeQuery.refetch()}
              tintColor={theme.primary}
            />
          }
          ListEmptyComponent={
            <View style={dynamicStyles.empty}>
              <Text style={dynamicStyles.emptyEmoji}>🏪</Text>
              <Text style={dynamicStyles.emptyTitle}>
                {activeTab === 'marketplace' ? 'Henüz ilan yok' : 'Henüz ilan açmadınız'}
              </Text>
              <TouchableOpacity
                style={[dynamicStyles.emptyBtn, { backgroundColor: theme.primary }]}
                onPress={() => router.push('/marketplace/create' as any)}
              >
                <Text style={dynamicStyles.emptyBtnText}>İlk İlanı Ver</Text>
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
  subtitle: { fontSize: Typography.fontSize.xs, color: theme.textSecondary },
  addBtn: { borderRadius: BorderRadius.md, overflow: 'hidden' },
  addBtnInner: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: Typography.fontSize.sm },
  tabs: { flexDirection: 'row', paddingHorizontal: Spacing.lg, gap: Spacing.sm, marginBottom: Spacing.sm },
  tab: {
    flex: 1, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md,
    alignItems: 'center', backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border,
  },
  tabActive: { backgroundColor: theme.primary + '20', borderColor: theme.primary },
  tabText: { color: theme.textSecondary, fontSize: Typography.fontSize.sm },
  tabTextActive: { color: theme.primary, fontWeight: '700' },
  searchContainer: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm },
  searchInput: {
    backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border,
    borderRadius: BorderRadius.md, padding: Spacing.md, color: theme.textPrimary,
  },
  filtersRow: { flexDirection: 'row', paddingHorizontal: Spacing.lg, gap: Spacing.sm, marginBottom: Spacing.md },
  filter: {
    paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: BorderRadius.full,
    backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border,
  },
  filterActive: { backgroundColor: theme.primary + '20', borderColor: theme.primary },
  filterText: { fontSize: Typography.fontSize.xs, color: theme.textSecondary },
  filterTextActive: { color: theme.primary, fontWeight: '600' },
  list: { padding: Spacing.lg, gap: Spacing.md },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    backgroundColor: theme.surface, borderRadius: BorderRadius.lg, padding: Spacing.md,
    borderWidth: 1, borderColor: theme.border, ...Shadows.sm,
  },
  cardHeader: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.md },
  imagePlaceholder: {
    width: 80, height: 80, backgroundColor: theme.surfaceElevated || theme.surface,
    borderRadius: BorderRadius.md, justifyContent: 'center', alignItems: 'center',
  },
  imageIcon: { fontSize: 32 },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: Typography.fontSize.base, fontWeight: '700', color: theme.textPrimary, marginBottom: 4 },
  badgeRow: { flexDirection: 'row', gap: Spacing.xs, marginBottom: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: BorderRadius.full, borderWidth: 1 },
  badgeText: { fontSize: Typography.fontSize.xs, fontWeight: '600' },
  company: { fontSize: Typography.fontSize.xs, color: theme.textSecondary },
  city: { fontSize: Typography.fontSize.xs, color: theme.textMuted },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  price: { fontSize: Typography.fontSize.xl, fontWeight: '800', color: theme.primary },
  metaRow: { flexDirection: 'row', gap: Spacing.sm },
  meta: { fontSize: Typography.fontSize.xs, color: theme.textMuted },
  empty: { alignItems: 'center', paddingTop: Spacing['2xl'] },
  emptyEmoji: { fontSize: 64, marginBottom: Spacing.md },
  emptyTitle: { fontSize: Typography.fontSize.lg, fontWeight: '700', color: theme.textPrimary, marginBottom: Spacing.md },
  emptyBtn: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: BorderRadius.md },
  emptyBtnText: { color: '#fff', fontWeight: '700' },
});
