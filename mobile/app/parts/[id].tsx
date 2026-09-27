import React, { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { partsAPI, warehouseAPI, stockAPI, supplierAPI } from '../../src/api/client';
import { Typography, Spacing, BorderRadius, Shadows } from '../../src/constants/theme';
import { useAppTheme } from '../../src/hooks/useAppTheme';
import { openWhatsApp, generateSupplierInquiryMessage } from '../../src/utils/whatsapp';

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

  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehouseAPI.getAll(),
  });
  const warehouses: any[] = (warehousesData as any)?.data || [];

  const [stockModalVisible, setStockModalVisible] = useState(false);
  const [movementType, setMovementType] = useState<'IN'|'OUT'>('IN');
  const [movementQty, setMovementQty] = useState('');
  const [movementNotes, setMovementNotes] = useState('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');

  // Depo Sayım / Düzenleme Modalı
  const [adjustModalVisible, setAdjustModalVisible] = useState(false);
  const [warehouseQuantities, setWarehouseQuantities] = useState<{ [id: string]: string }>({});

  const movementMutation = useMutation({
    mutationFn: () => partsAPI.addMovement(id, {
      movementType,
      quantity: parseInt(movementQty),
      warehouseId: selectedWarehouseId || undefined,
      notes: movementNotes,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['part', id] });
      queryClient.invalidateQueries({ queryKey: ['partMovements', id] });
      queryClient.invalidateQueries({ queryKey: ['parts'] });
      queryClient.invalidateQueries({ queryKey: ['warehouseStats'] });
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
    const defW = warehouses.find(w => w.isDefault);
    setSelectedWarehouseId(defW ? defW.id : (warehouses[0]?.id || ''));
    setStockModalVisible(true);
  };

  const handleOpenAdjustModal = () => {
    const partData = (data as any)?.data;
    const initial: { [id: string]: string } = {};
    warehouses.forEach(w => {
      const existingWs = partData?.warehouseStocks?.find((ws: any) => ws.warehouseId === w.id);
      initial[w.id] = existingWs ? String(existingWs.quantity) : '0';
    });
    setWarehouseQuantities(initial);
    setAdjustModalVisible(true);
  };

  const adjustMutation = useMutation({
    mutationFn: () => stockAPI.adjustWarehouses({
      partId: id,
      warehouseStocks: Object.entries(warehouseQuantities).map(([wId, qty]) => ({
        warehouseId: wId,
        quantity: parseInt(qty) || 0,
      })),
    }),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['part', id] });
      queryClient.invalidateQueries({ queryKey: ['parts'] });
      queryClient.invalidateQueries({ queryKey: ['warehouseStats'] });
      setAdjustModalVisible(false);
      Alert.alert('✅ Başarılı', res?.message || 'Depo stokları güncellendi.');
    },
    onError: (err: any) => {
      Alert.alert('Hata', err?.message || 'Depo stokları güncellenemedi.');
    }
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

  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => supplierAPI.getAll(),
  });
  const suppliers: any[] = (suppliersData as any)?.data || [];

  const handleAskSupplier = () => {
    if (!suppliers || suppliers.length === 0) {
      Alert.alert(
        'Tedarikçi Bulunamadı',
        'Kayıtlı yedek parçacı bulunmuyor. Depo > Tedarikçiler bölümünden parça tedarikçisi ekleyebilirsiniz.'
      );
      return;
    }

    if (suppliers.length === 1) {
      const s = suppliers[0];
      const msg = generateSupplierInquiryMessage(part, 1);
      openWhatsApp(s.phone, msg);
      return;
    }

    Alert.alert(
      '💬 Parçacıya WhatsApp İle Sor',
      `"${part?.name}" parçası için hangi tedarikçiye sormak istersiniz?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        ...suppliers.slice(0, 5).map((s: any) => ({
          text: `🏭 ${s.name}`,
          onPress: () => {
            const msg = generateSupplierInquiryMessage(part, 1);
            openWhatsApp(s.phone, msg);
          },
        })),
      ]
    );
  };

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

  const available = part.quantity - (part.reservedQuantity || 0);
  const isLowStock = available <= part.minQuantity && part.minQuantity > 0;
  const stockColor = part.quantity === 0 ? theme.danger : isLowStock ? '#F59E0B' : theme.success;

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
          {(part.reservedQuantity || 0) > 0 && (
            <Text style={{ color: '#F59E0B', fontSize: Typography.fontSize.xs, marginTop: 4 }}>
              ⚠️ {part.reservedQuantity} {part.unit} rezerve — Kullanılabilir: {available} {part.unit}
            </Text>
          )}

          {/* Depo Bazlı Stoklar */}
          <View style={{ marginTop: Spacing.md, width: '100%', backgroundColor: theme.background, borderRadius: BorderRadius.md, padding: Spacing.sm, borderWidth: 1, borderColor: theme.border }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text style={{ fontSize: Typography.fontSize.xs, fontWeight: '700', color: theme.textMuted, textTransform: 'uppercase' }}>Depo Bazlı Stok</Text>
              <TouchableOpacity onPress={handleOpenAdjustModal}>
                <Text style={{ fontSize: Typography.fontSize.xs, color: theme.primary, fontWeight: '700' }}>✏️ Miktarları Düzenle</Text>
              </TouchableOpacity>
            </View>

            {part.warehouseStocks && part.warehouseStocks.length > 0 ? (
              part.warehouseStocks.filter((ws: any) => ws.quantity !== 0).map((ws: any, idx: number) => (
                <View key={ws.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderTopWidth: idx > 0 ? 1 : 0, borderTopColor: theme.borderLight }}>
                  <Text style={{ color: theme.textSecondary, fontSize: Typography.fontSize.sm }}>{ws.warehouse?.name || 'Bilinmeyen Depo'}</Text>
                  <Text style={{ color: theme.textPrimary, fontSize: Typography.fontSize.sm, fontWeight: '700' }}>{ws.quantity} {part.unit}</Text>
                </View>
              ))
            ) : (
              <Text style={{ color: theme.textMuted, fontSize: Typography.fontSize.xs, fontStyle: 'italic', paddingVertical: 4 }}>
                Depo dağılımı girilmemiş. "Miktarları Düzenle" ile ekleyebilirsiniz.
              </Text>
            )}
          </View>
        </View>

        {/* Detay Bilgiler */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>Detaylar</Text>
          <View style={dynamicStyles.detailsCard}>
            {[
              { label: 'Marka', value: part.brand },
              { label: 'SKU', value: part.sku },
              { label: 'Barkod', value: part.barcode },
              { label: 'OEM Kodu', value: part.oemCode },
              { label: 'Kategori', value: part.category },
              { label: 'Durum', value: part.condition === 'NEW' ? '🟢 Sıfır' : part.condition === 'USED' ? '🟡 İkinci El' : part.condition === 'REFURBISHED' ? '🔵 Yenilenmiş' : part.condition },
              { label: 'Depo Konumu', value: part.warehouseLocation },
              { label: 'Rezerve', value: (part.reservedQuantity || 0) > 0 ? `${part.reservedQuantity} ${part.unit}` : null },
              { label: 'Minimum Stok', value: part.minQuantity > 0 ? part.minQuantity.toString() : 'Belirtilmemiş' },
              { label: 'Alış Fiyatı', value: part.purchasePrice ? `₺${parseFloat(part.purchasePrice).toLocaleString('tr-TR')}` : '—' },
              { label: 'Satış Fiyatı', value: part.sellingPrice ? `₺${parseFloat(part.sellingPrice).toLocaleString('tr-TR')}` : '—' },
            ].filter(i => i.value).map((item, i) => (
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
              { emoji: '💬', label: 'Parçacıya Sor', onPress: handleAskSupplier },
              { emoji: '🏢', label: 'Depo Sayım', onPress: handleOpenAdjustModal },
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

      {/* Stok Giriş/Çıkış Modalı */}
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

            {/* Depo Seçimi */}
            <Text style={{ color: theme.textMuted, marginBottom: 6, fontSize: Typography.fontSize.sm }}>Depo Seçimi *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.md, maxHeight: 44 }}>
              {warehouses.map((w: any) => (
                <TouchableOpacity
                  key={w.id}
                  onPress={() => setSelectedWarehouseId(w.id)}
                  style={{
                    paddingHorizontal: Spacing.md,
                    paddingVertical: 8,
                    borderRadius: BorderRadius.full,
                    borderWidth: 1,
                    borderColor: selectedWarehouseId === w.id ? theme.primary : theme.border,
                    backgroundColor: selectedWarehouseId === w.id ? theme.primary + '15' : theme.surface,
                    marginRight: Spacing.sm
                  }}
                >
                  <Text style={{
                    color: selectedWarehouseId === w.id ? theme.primary : theme.textSecondary,
                    fontSize: Typography.fontSize.sm,
                    fontWeight: selectedWarehouseId === w.id ? '700' : '400'
                  }}>
                    {w.name} {w.isDefault ? '⭐' : ''}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
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

      {/* Depo Miktarlarını Düzenle / Sayım Modalı */}
      <Modal visible={adjustModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setAdjustModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: theme.background }}>
          <SafeAreaView style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: theme.border }}>
              <View>
                <Text style={{ fontSize: Typography.fontSize.lg, fontWeight: '700', color: theme.textPrimary }}>🏢 Depo Stok Dağılımı</Text>
                <Text style={{ fontSize: Typography.fontSize.xs, color: theme.textMuted, marginTop: 2 }}>{part.name}</Text>
              </View>
              <TouchableOpacity onPress={() => setAdjustModalVisible(false)}>
                <Text style={{ color: theme.primary, fontWeight: '600' }}>İptal</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: Spacing.lg }} showsVerticalScrollIndicator={false}>
              <Text style={{ color: theme.textSecondary, fontSize: Typography.fontSize.sm, marginBottom: Spacing.md }}>
                Her deponun içindeki miktarını doğrudan girin. Toplam stok bu değerlerin toplamı olacaktır.
              </Text>

              {warehouses.map((w: any) => (
                <View
                  key={w.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: theme.surface,
                    borderRadius: BorderRadius.md,
                    padding: Spacing.md,
                    marginBottom: Spacing.sm,
                    borderWidth: 1,
                    borderColor: theme.border
                  }}
                >
                  <View style={{ flex: 1, paddingRight: Spacing.sm }}>
                    <Text style={{ color: theme.textPrimary, fontWeight: '700', fontSize: Typography.fontSize.sm }}>
                      {w.name} {w.isDefault ? '⭐' : ''}
                    </Text>
                    {w.address && (
                      <Text style={{ color: theme.textMuted, fontSize: Typography.fontSize.xs, marginTop: 2 }}>
                        {w.address}
                      </Text>
                    )}
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <TextInput
                      style={{
                        backgroundColor: theme.background,
                        borderWidth: 1,
                        borderColor: theme.border,
                        borderRadius: BorderRadius.sm,
                        width: 80,
                        paddingVertical: 8,
                        paddingHorizontal: 12,
                        textAlign: 'center',
                        color: theme.textPrimary,
                        fontSize: Typography.fontSize.md,
                        fontWeight: '700'
                      }}
                      keyboardType="numeric"
                      value={warehouseQuantities[w.id] !== undefined ? warehouseQuantities[w.id] : '0'}
                      onChangeText={(val) => {
                        const sanitized = val.replace(/[^0-9]/g, '');
                        setWarehouseQuantities(prev => ({ ...prev, [w.id]: sanitized }));
                      }}
                    />
                    <Text style={{ color: theme.textMuted, fontSize: Typography.fontSize.sm }}>{part.unit}</Text>
                  </View>
                </View>
              ))}

              {/* Toplam Özeti */}
              <View style={{ backgroundColor: theme.primary + '15', borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1, borderColor: theme.primary + '40', marginTop: Spacing.md, marginBottom: Spacing.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: theme.primary, fontWeight: '700', fontSize: Typography.fontSize.base }}>📦 Yeni Toplam Stok</Text>
                <Text style={{ color: theme.primary, fontWeight: '800', fontSize: Typography.fontSize.xl }}>
                  {Object.values(warehouseQuantities).reduce((acc, v) => acc + (parseInt(v) || 0), 0)} {part.unit}
                </Text>
              </View>

              <TouchableOpacity
                style={{
                  backgroundColor: theme.primary,
                  borderRadius: BorderRadius.md,
                  padding: Spacing.md,
                  alignItems: 'center',
                  opacity: adjustMutation.isPending ? 0.7 : 1
                }}
                onPress={() => adjustMutation.mutate()}
                disabled={adjustMutation.isPending}
              >
                {adjustMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: Typography.fontSize.base }}>
                    💾 Depo Miktarlarını Kaydet
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
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
