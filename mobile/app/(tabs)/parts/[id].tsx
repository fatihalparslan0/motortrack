import React from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { partsAPI } from '../../../src/api/client';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../../src/constants/theme';

export default function PartDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['part', id],
    queryFn: () => partsAPI.getById(id),
  });

  const { data: movementsData } = useQuery({
    queryKey: ['partMovements', id],
    queryFn: () => partsAPI.getMovements(id, { limit: 5 }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => partsAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parts'] });
      router.back();
    },
  });

  const part: any = (data as any)?.data;
  const movements: any[] = (movementsData as any)?.data || [];

  const handleDelete = () => {
    Alert.alert(
      'Parçayı Sil',
      `"${part?.name}" parçasını silmek istediğinize emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil', style: 'destructive',
          onPress: () => deleteMutation.mutate(),
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!part) {
    return (
      <View style={styles.loading}>
        <Text style={styles.errorText}>Parça bulunamadı.</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: Colors.primary, marginTop: 16 }}>Geri Dön</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isLowStock = part.quantity <= part.minQuantity && part.minQuantity > 0;
  const stockColor = isLowStock ? Colors.danger : part.quantity === 0 ? Colors.danger : Colors.success;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient colors={['#1A1D27', '#0F1117']} style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backText}>← Geri</Text>
          </TouchableOpacity>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => router.push(`/(tabs)/parts/edit?id=${id}` as any)}
            >
              <Text style={styles.actionBtnText}>✏️ Düzenle</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={handleDelete}>
              <Text style={[styles.actionBtnText, { color: Colors.danger }]}>🗑️</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Parça Kartı */}
        <View style={styles.partCard}>
          <View style={styles.partIconLarge}>
            <Text style={styles.partIconText}>🔩</Text>
          </View>
          <Text style={styles.partName}>{part.name}</Text>
          <Text style={styles.partNumber}>P/N: {part.partNumber || 'Bilinmiyor'}</Text>
          <View style={[styles.stockBadge, { backgroundColor: stockColor + '20', borderColor: stockColor + '40' }]}>
            <Text style={[styles.stockText, { color: stockColor }]}>
              Stok: {part.quantity} {part.unit}
            </Text>
          </View>
        </View>

        {/* Detay Bilgiler */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detaylar</Text>
          <View style={styles.detailsCard}>
            {[
              { label: 'Marka', value: part.brand },
              { label: 'Kategori', value: part.category },
              { label: 'Durum', value: part.condition },
              { label: 'Depo Konumu', value: part.warehouseLocation },
              { label: 'Minimum Stok', value: part.minQuantity > 0 ? part.minQuantity.toString() : 'Belirtilmemiş' },
              { label: 'Alış Fiyatı', value: part.purchasePrice ? `₺${parseFloat(part.purchasePrice).toLocaleString('tr-TR')}` : '—' },
              { label: 'Satış Fiyatı', value: part.sellingPrice ? `₺${parseFloat(part.sellingPrice).toLocaleString('tr-TR')}` : '—' },
            ].map((item, i) => (
              <View key={i} style={[styles.detailRow, i > 0 && styles.detailRowBorder]}>
                <Text style={styles.detailLabel}>{item.label}</Text>
                <Text style={styles.detailValue}>{item.value || '—'}</Text>
              </View>
            ))}
            {part.motor && (
              <View style={[styles.detailRow, styles.detailRowBorder]}>
                <Text style={styles.detailLabel}>Bağlı Motor</Text>
                <Text style={styles.detailValue}>{part.motor.brand} {part.motor.model}</Text>
              </View>
            )}
            {part.notes && (
              <View style={[styles.detailRow, styles.detailRowBorder]}>
                <Text style={styles.detailLabel}>Notlar</Text>
                <Text style={[styles.detailValue, { flex: 1, textAlign: 'right' }]}>{part.notes}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Hızlı Eylemler */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>İşlemler</Text>
          <View style={styles.actionsGrid}>
            {[
              { emoji: '➕', label: 'Stok Ekle', onPress: () => Alert.alert('Stok Ekle', 'Yakında eklenecek') },
              { emoji: '➖', label: 'Stok Düş', onPress: () => Alert.alert('Stok Düş', 'Yakında eklenecek') },
              { emoji: '📢', label: 'İlan Aç', onPress: () => router.push(`/(tabs)/marketplace/create?partId=${id}` as any) },
            ].map((a) => (
              <TouchableOpacity key={a.label} style={styles.actionCard} onPress={a.onPress} activeOpacity={0.8}>
                <Text style={styles.actionEmoji}>{a.emoji}</Text>
                <Text style={styles.actionLabel}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Son Hareketler */}
        {movements.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Son Stok Hareketleri</Text>
            {movements.map((m: any) => (
              <View key={m.id} style={styles.movementItem}>
                <View style={styles.movementHeader}>
                  <Text style={styles.movementType}>
                    {m.movementType === 'IN' ? '🟢 Giriş' : m.movementType === 'OUT' ? '🔴 Çıkış' : '🔵 ' + m.movementType}
                  </Text>
                  <Text style={styles.movementQuantity}>
                    {m.movementType === 'IN' ? '+' : '-'}{m.quantity} {part.unit}
                  </Text>
                </View>
                <Text style={styles.movementDate}>
                  {new Date(m.createdAt).toLocaleDateString('tr-TR')} — {m.user?.fullName}
                </Text>
                {m.notes && <Text style={styles.movementNotes}>{m.notes}</Text>}
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  errorText: { color: Colors.textSecondary, fontSize: Typography.fontSize.base },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg },
  backBtn: {}, backText: { color: Colors.primary, fontSize: Typography.fontSize.base },
  headerActions: { flexDirection: 'row', gap: Spacing.sm },
  actionBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border },
  deleteBtn: { borderColor: Colors.danger + '40' },
  actionBtnText: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm },
  partCard: { alignItems: 'center', padding: Spacing.xl, borderBottomWidth: 1, borderBottomColor: Colors.border },
  partIconLarge: { width: 100, height: 100, backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.xl, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md, ...Shadows.md },
  partIconText: { fontSize: 50 },
  partName: { fontSize: Typography.fontSize['2xl'], fontWeight: '800', color: Colors.textPrimary, textAlign: 'center' },
  partNumber: { fontSize: Typography.fontSize.sm, color: Colors.textMuted, marginTop: 4, marginBottom: Spacing.md },
  stockBadge: { paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: BorderRadius.full, borderWidth: 1 },
  stockText: { fontSize: Typography.fontSize.sm, fontWeight: '700' },
  section: { padding: Spacing.lg, paddingBottom: 0 },
  sectionTitle: { fontSize: Typography.fontSize.base, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.md },
  detailsCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', padding: Spacing.md },
  detailRowBorder: { borderTopWidth: 1, borderTopColor: Colors.border },
  detailLabel: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm },
  detailValue: { color: Colors.textPrimary, fontSize: Typography.fontSize.sm, fontWeight: '600' },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  actionCard: { flex: 1, minWidth: '30%', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  actionEmoji: { fontSize: 28, marginBottom: 6 },
  actionLabel: { color: Colors.textSecondary, fontSize: Typography.fontSize.xs },
  movementItem: { backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  movementHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  movementType: { color: Colors.textPrimary, fontWeight: '600', fontSize: Typography.fontSize.sm },
  movementQuantity: { color: Colors.textPrimary, fontWeight: '700', fontSize: Typography.fontSize.sm },
  movementDate: { color: Colors.textMuted, fontSize: Typography.fontSize.xs },
  movementNotes: { color: Colors.textSecondary, fontSize: Typography.fontSize.xs, marginTop: 4, fontStyle: 'italic' },
});
