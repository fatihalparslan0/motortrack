import React, { useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { partsAPI } from '../../src/api/client';
import { Typography, Spacing, BorderRadius, Shadows } from '../../src/constants/theme';
import { useAppTheme } from '../../src/hooks/useAppTheme';

const QUICK_NOTES_IN = ['📦 Yeni Sevkiyat', '♻️ İade Geldi', '📈 Sayım Fazlası'];
const QUICK_NOTES_OUT = ['🔧 Tamirde Kullanıldı', '⚠️ Defolu / Hasarlı', '📉 Sayım Eksiği'];

export default function PartDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  
  const { colors: theme } = useAppTheme();
  const dynamicStyles = useMemo(() => styles(theme), [theme]);

  const { data, isLoading } = useQuery({
    queryKey: ['part', id],
    queryFn: () => partsAPI.getById(id),
  });

  const { data: movementsData } = useQuery({
    queryKey: ['partMovements', id],
    queryFn: () => partsAPI.getMovements(id, { limit: 5 }),
  });

  const [stockModalVisible, setStockModalVisible] = React.useState(false);
  const [movementType, setMovementType] = React.useState<'IN'|'OUT'>('IN');
  const [movementQty, setMovementQty] = React.useState('');
  const [movementNotes, setMovementNotes] = React.useState('');

  const movementMutation = useMutation({
    mutationFn: () => partsAPI.addMovement(id, {
      movementType,
      quantity: parseInt(movementQty),
      notes: movementNotes,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['part', id] });
      queryClient.invalidateQueries({ queryKey: ['partMovements', id] });
      queryClient.invalidateQueries({ queryKey: ['parts'] });
      setStockModalVisible(false);
      setMovementQty('');
      setMovementNotes('');
      Alert.alert('Başarılı', 'Stok hareketi kaydedildi.');
    },
    onError: (err: any) => {
      Alert.alert('Hata', err?.message || 'Stok kaydedilemedi.');
    }
  });

  const handleOpenStockModal = (type: 'IN'|'OUT') => {
    setMovementType(type);
    setMovementQty('');
    setMovementNotes('');
    setStockModalVisible(true);
  };

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
      <View style={dynamicStyles.loading}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!part) {
    return (
      <View style={dynamicStyles.loading}>
        <Text style={dynamicStyles.errorText}>Parça bulunamadı.</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: theme.primary, marginTop: 16 }}>Geri Dön</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isLowStock = part.quantity <= part.minQuantity && part.minQuantity > 0;
  const stockColor = isLowStock ? theme.danger : part.quantity === 0 ? theme.danger : theme.success;

  return (
    <SafeAreaView style={dynamicStyles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient colors={['#1A1D27', '#0F1117']} style={dynamicStyles.header}>
          <TouchableOpacity style={dynamicStyles.backBtn} onPress={() => router.back()}>
            <Text style={dynamicStyles.backText}>← Geri</Text>
          </TouchableOpacity>
          <View style={dynamicStyles.headerActions}>
            <TouchableOpacity
              style={dynamicStyles.actionBtn}
              onPress={() => router.push(`/parts/edit?id=${id}` as any)}
            >
              <Text style={dynamicStyles.actionBtnText}>✏️ Düzenle</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[dynamicStyles.actionBtn, dynamicStyles.deleteBtn]} onPress={handleDelete}>
              <Text style={[dynamicStyles.actionBtnText, { color: theme.danger }]}>🗑️</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Parça Kartı */}
        <View style={dynamicStyles.partCard}>
          <View style={dynamicStyles.partIconLarge}>
            <Text style={dynamicStyles.partIconText}>🔩</Text>
          </View>
          <Text style={dynamicStyles.partName}>{part.name}</Text>
          <Text style={dynamicStyles.partNumber}>P/N: {part.partNumber || 'Bilinmiyor'}</Text>
          <View style={[dynamicStyles.stockBadge, { backgroundColor: stockColor + '20', borderColor: stockColor + '40' }]}>
            <Text style={[dynamicStyles.stockText, { color: stockColor }]}>
              Stok: {part.quantity} {part.unit}
            </Text>
          </View>
        </View>

        {/* Detay Bilgiler */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>Detaylar</Text>
          <View style={dynamicStyles.detailsCard}>
            {[
              { label: 'Marka', value: part.brand },
              { label: 'Kategori', value: part.category },
              { label: 'Durum', value: part.condition === 'NEW' ? '🟢 Sıfır' : part.condition === 'USED' ? '🟡 İkinci El' : part.condition === 'REFURBISHED' ? '🔵 Yenilenmiş' : part.condition },
              { label: 'Depo Konumu', value: part.warehouseLocation },
              { label: 'Minimum Stok', value: part.minQuantity > 0 ? part.minQuantity.toString() : 'Belirtilmemiş' },
              { label: 'Alış Fiyatı', value: part.purchasePrice ? `₺${parseFloat(part.purchasePrice).toLocaleString('tr-TR')}` : '—' },
              { label: 'Satış Fiyatı', value: part.sellingPrice ? `₺${parseFloat(part.sellingPrice).toLocaleString('tr-TR')}` : '—' },
            ].map((item, i) => (
              <View key={i} style={[dynamicStyles.detailRow, i > 0 && dynamicStyles.detailRowBorder]}>
                <Text style={dynamicStyles.detailLabel}>{item.label}</Text>
                <Text style={dynamicStyles.detailValue}>{item.value || '—'}</Text>
              </View>
            ))}
            {part.motor && (
              <View style={[dynamicStyles.detailRow, dynamicStyles.detailRowBorder]}>
                <Text style={dynamicStyles.detailLabel}>Bağlı Motor</Text>
                <Text style={dynamicStyles.detailValue}>{part.motor.brand} {part.motor.model}</Text>
              </View>
            )}
            {part.notes && (
              <View style={[dynamicStyles.detailRow, dynamicStyles.detailRowBorder]}>
                <Text style={dynamicStyles.detailLabel}>Notlar</Text>
                <Text style={[dynamicStyles.detailValue, { flex: 1, textAlign: 'right' }]}>{part.notes}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Hızlı Eylemler */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>İşlemler</Text>
          <View style={dynamicStyles.actionsGrid}>
            {[
              { emoji: '➕', label: 'Stok Ekle', onPress: () => handleOpenStockModal('IN') },
              { emoji: '➖', label: 'Stok Düş', onPress: () => handleOpenStockModal('OUT') },
              { emoji: '📢', label: 'İlan Aç', onPress: () => router.push(`/marketplace/create?partId=${id}` as any) },
            ].map((a) => (
              <TouchableOpacity key={a.label} style={dynamicStyles.actionCard} onPress={a.onPress} activeOpacity={0.8}>
                <Text style={dynamicStyles.actionEmoji}>{a.emoji}</Text>
                <Text style={dynamicStyles.actionLabel}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Son Hareketler */}
        {movements.length > 0 && (
          <View style={dynamicStyles.section}>
            <Text style={dynamicStyles.sectionTitle}>Son Stok Hareketleri</Text>
            {movements.map((m: any) => (
              <View key={m.id} style={dynamicStyles.movementItem}>
                <View style={dynamicStyles.movementHeader}>
                  <Text style={dynamicStyles.movementType}>
                    {m.movementType === 'IN' ? '🟢 Giriş' : m.movementType === 'OUT' ? '🔴 Çıkış' : '🔵 ' + m.movementType}
                  </Text>
                  <Text style={dynamicStyles.movementQuantity}>
                    {m.movementType === 'IN' ? '+' : '-'}{m.quantity} {part.unit}
                  </Text>
                </View>
                <Text style={dynamicStyles.movementDate}>
                  {new Date(m.createdAt).toLocaleDateString('tr-TR')} — {m.user?.fullName}
                </Text>
                {m.notes && <Text style={dynamicStyles.movementNotes}>{m.notes}</Text>}
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={stockModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setStockModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: theme.background }}>
          <SafeAreaView style={{ flex: 1, padding: Spacing.lg }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.lg }}>
              <Text style={{ fontSize: Typography.fontSize.lg, fontWeight: 'bold', color: theme.textPrimary }}>
                {movementType === 'IN' ? '➕ Stok Ekle' : '➖ Stok Düş'}
              </Text>
              <TouchableOpacity onPress={() => setStockModalVisible(false)}>
                <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: Typography.fontSize.md }}>Kapat</Text>
              </TouchableOpacity>
            </View>
            
            <Text style={{ color: theme.textMuted, marginBottom: 4, fontSize: Typography.fontSize.sm }}>Miktar *</Text>
            <TextInput
              style={{ backgroundColor: theme.surface, color: theme.textPrimary, padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: theme.border, marginBottom: Spacing.md, fontSize: Typography.fontSize.base }}
              keyboardType="numeric"
              placeholder="Örn: 5"
              placeholderTextColor={theme.textMuted}
              value={movementQty}
              onChangeText={setMovementQty}
              autoFocus
            />

            <Text style={{ color: theme.textMuted, marginBottom: 4, fontSize: Typography.fontSize.sm }}>Hızlı Açıklama</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.md }}>
              {(movementType === 'IN' ? QUICK_NOTES_IN : QUICK_NOTES_OUT).map(note => (
                <TouchableOpacity
                  key={note}
                  style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: movementNotes === note ? theme.primary : theme.surface, borderWidth: 1, borderColor: movementNotes === note ? theme.primary : theme.border }}
                  onPress={() => setMovementNotes(note)}
                >
                  <Text style={{ color: movementNotes === note ? '#fff' : theme.textSecondary, fontSize: 13, fontWeight: movementNotes === note ? 'bold' : 'normal' }}>{note}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={{ color: theme.textMuted, marginBottom: 4, fontSize: Typography.fontSize.sm }}>Açıklama *</Text>
            <TextInput
              style={{ backgroundColor: theme.surface, color: theme.textPrimary, padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: theme.border, marginBottom: Spacing.lg, height: 80, textAlignVertical: 'top', fontSize: Typography.fontSize.base }}
              multiline
              placeholder="Hızlı açıklama seçin veya kendi notunuzu yazın..."
              placeholderTextColor={theme.textMuted}
              value={movementNotes}
              onChangeText={setMovementNotes}
            />

            <TouchableOpacity
              style={[dynamicStyles.actionBtn, { backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' }, movementMutation.isPending && { opacity: 0.7 }]}
              onPress={() => {
                if (!parseInt(movementQty) || parseInt(movementQty) <= 0) {
                  Alert.alert('Hata', 'Lütfen geçerli bir miktar girin.');
                  return;
                }
                if (!movementNotes.trim()) {
                  Alert.alert('Hata', 'Lütfen stok işlemi için bir açıklama girin.');
                  return;
                }
                movementMutation.mutate();
              }}
              disabled={movementMutation.isPending}
            >
              {movementMutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: Typography.fontSize.base }}>Kaydet</Text>}
            </TouchableOpacity>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background },
  errorText: { color: theme.textSecondary, fontSize: Typography.fontSize.base },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg },
  backBtn: {}, backText: { color: theme.primary, fontSize: Typography.fontSize.base },
  headerActions: { flexDirection: 'row', gap: Spacing.sm },
  actionBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, backgroundColor: theme.surface, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: theme.border },
  deleteBtn: { borderColor: theme.danger + '40' },
  actionBtnText: { color: theme.textSecondary, fontSize: Typography.fontSize.sm },
  partCard: { alignItems: 'center', padding: Spacing.xl, borderBottomWidth: 1, borderBottomColor: theme.border },
  partIconLarge: { width: 100, height: 100, backgroundColor: theme.surfaceElevated, borderRadius: BorderRadius.xl, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md, ...Shadows.md },
  partIconText: { fontSize: 50 },
  partName: { fontSize: Typography.fontSize['2xl'], fontWeight: '800', color: theme.textPrimary, textAlign: 'center' },
  partNumber: { fontSize: Typography.fontSize.sm, color: theme.textMuted, marginTop: 4, marginBottom: Spacing.md },
  stockBadge: { paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: BorderRadius.full, borderWidth: 1 },
  stockText: { fontSize: Typography.fontSize.sm, fontWeight: '700' },
  section: { padding: Spacing.lg, paddingBottom: 0 },
  sectionTitle: { fontSize: Typography.fontSize.base, fontWeight: '700', color: theme.textPrimary, marginBottom: Spacing.md },
  detailsCard: { backgroundColor: theme.surface, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: theme.border, overflow: 'hidden' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', padding: Spacing.md },
  detailRowBorder: { borderTopWidth: 1, borderTopColor: theme.border },
  detailLabel: { color: theme.textSecondary, fontSize: Typography.fontSize.sm },
  detailValue: { color: theme.textPrimary, fontSize: Typography.fontSize.sm, fontWeight: '600' },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  actionCard: { flex: 1, minWidth: '30%', backgroundColor: theme.surface, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: theme.border },
  actionEmoji: { fontSize: 28, marginBottom: 6 },
  actionLabel: { color: theme.textSecondary, fontSize: Typography.fontSize.xs },
  movementItem: { backgroundColor: theme.surface, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: theme.border },
  movementHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  movementType: { color: theme.textPrimary, fontWeight: '600', fontSize: Typography.fontSize.sm },
  movementQuantity: { color: theme.textPrimary, fontWeight: '700', fontSize: Typography.fontSize.sm },
  movementDate: { color: theme.textMuted, fontSize: Typography.fontSize.xs },
  movementNotes: { color: theme.textSecondary, fontSize: Typography.fontSize.xs, marginTop: 4, fontStyle: 'italic' },
});
