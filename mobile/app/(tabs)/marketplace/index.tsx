import React, { useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { listingsAPI } from '../../../src/api/client';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../../src/constants/theme';

const CONDITION_CONFIG: Record<string, { label: string; color: string }> = {
  NEW: { label: 'Sıfır', color: Colors.success },
  USED: { label: 'İkinci El', color: Colors.warning },
  REFURBISHED: { label: 'Yenilenmiş', color: Colors.primary },
  DAMAGED: { label: 'Hasarlı', color: Colors.danger },
};

function ListingCard({ listing, onPress }: any) {
  const condition = CONDITION_CONFIG[listing.condition] || CONDITION_CONFIG.USED;
  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'Bugün';
    if (days === 1) return 'Dün';
    return `${days} gün önce`;
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.cardHeader}>
        <View style={styles.imagePlaceholder}>
          {listing.imageUrls?.length > 0
            ? <Text style={styles.imageIcon}>🖼️</Text>
            : <Text style={styles.imageIcon}>🔩</Text>
          }
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={2}>{listing.title}</Text>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: condition.color + '20', borderColor: condition.color + '40' }]}>
              <Text style={[styles.badgeText, { color: condition.color }]}>{condition.label}</Text>
            </View>
          </View>
          <Text style={styles.company}>🏢 {listing.company?.name}</Text>
          {listing.company?.city && <Text style={styles.city}>📍 {listing.company.city}</Text>}
        </View>
      </View>
      <View style={styles.cardFooter}>
        <Text style={styles.price}>₺{parseFloat(listing.price).toLocaleString('tr-TR')}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>👁️ {listing.viewsCount}</Text>
          <Text style={styles.meta}>{timeAgo(listing.createdAt)}</Text>
          {listing.quantity > 1 && <Text style={styles.meta}>x{listing.quantity}</Text>}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function MarketplaceScreen() {
  const [search, setSearch] = useState('');
  const [condition, setCondition] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'marketplace' | 'my'>('marketplace');

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
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Pazar Yeri</Text>
          <Text style={styles.subtitle}>Şirketler arası parça alım-satımı</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/(tabs)/marketplace/create' as any)}
          activeOpacity={0.8}
        >
          <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.addBtnInner}>
            <Text style={styles.addBtnText}>+ İlan</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {[
          { key: 'marketplace', label: '🏪 Tüm İlanlar' },
          { key: 'my', label: '📢 İlanlarım' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key as any)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search (sadece marketplace için) */}
      {activeTab === 'marketplace' && (
        <>
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Parça, marka, açıklama ara..."
              placeholderTextColor={Colors.textMuted}
              value={search}
              onChangeText={setSearch}
            />
          </View>
          <View style={styles.filtersRow}>
            {['Hepsi', 'NEW', 'USED', 'REFURBISHED'].map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.filter, (condition === (c === 'Hepsi' ? null : c)) && styles.filterActive]}
                onPress={() => setCondition(c === 'Hepsi' ? null : c)}
              >
                <Text style={[
                  styles.filterText,
                  (condition === (c === 'Hepsi' ? null : c)) && styles.filterTextActive,
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
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ListingCard
              listing={item}
              onPress={() => router.push(`/(tabs)/marketplace/${item.id}` as any)}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={activeQuery.isLoading}
              onRefresh={() => activeQuery.refetch()}
              tintColor={Colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🏪</Text>
              <Text style={styles.emptyTitle}>
                {activeTab === 'marketplace' ? 'Henüz ilan yok' : 'Henüz ilan açmadınız'}
              </Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => router.push('/(tabs)/marketplace/create' as any)}
              >
                <Text style={styles.emptyBtnText}>İlk İlanı Ver</Text>
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
  subtitle: { fontSize: Typography.fontSize.xs, color: Colors.textSecondary },
  addBtn: { borderRadius: BorderRadius.md, overflow: 'hidden' },
  addBtnInner: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: Typography.fontSize.sm },
  tabs: { flexDirection: 'row', paddingHorizontal: Spacing.lg, gap: Spacing.sm, marginBottom: Spacing.sm },
  tab: {
    flex: 1, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md,
    alignItems: 'center', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  tabActive: { backgroundColor: Colors.primary + '20', borderColor: Colors.primary },
  tabText: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm },
  tabTextActive: { color: Colors.primary, fontWeight: '700' },
  searchContainer: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm },
  searchInput: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: BorderRadius.md, padding: Spacing.md, color: Colors.textPrimary,
  },
  filtersRow: { flexDirection: 'row', paddingHorizontal: Spacing.lg, gap: Spacing.sm, marginBottom: Spacing.md },
  filter: {
    paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  filterActive: { backgroundColor: Colors.primary + '20', borderColor: Colors.primary },
  filterText: { fontSize: Typography.fontSize.xs, color: Colors.textSecondary },
  filterTextActive: { color: Colors.primary, fontWeight: '600' },
  list: { padding: Spacing.lg, gap: Spacing.md },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.border, ...Shadows.sm,
  },
  cardHeader: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.md },
  imagePlaceholder: {
    width: 80, height: 80, backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md, justifyContent: 'center', alignItems: 'center',
  },
  imageIcon: { fontSize: 32 },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: Typography.fontSize.base, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  badgeRow: { flexDirection: 'row', gap: Spacing.xs, marginBottom: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: BorderRadius.full, borderWidth: 1 },
  badgeText: { fontSize: Typography.fontSize.xs, fontWeight: '600' },
  company: { fontSize: Typography.fontSize.xs, color: Colors.textSecondary },
  city: { fontSize: Typography.fontSize.xs, color: Colors.textMuted },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  price: { fontSize: Typography.fontSize.xl, fontWeight: '800', color: Colors.primary },
  metaRow: { flexDirection: 'row', gap: Spacing.sm },
  meta: { fontSize: Typography.fontSize.xs, color: Colors.textMuted },
  empty: { alignItems: 'center', paddingTop: Spacing['2xl'] },
  emptyEmoji: { fontSize: 64, marginBottom: Spacing.md },
  emptyTitle: { fontSize: Typography.fontSize.lg, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.md },
  emptyBtn: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: BorderRadius.md },
  emptyBtnText: { color: '#fff', fontWeight: '700' },
});
