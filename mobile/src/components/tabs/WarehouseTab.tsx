import React, { useMemo, useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert, Modal, TextInput,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import {
  Package, AlertTriangle, TrendingUp, TrendingDown,
  Plus, ArrowDownCircle, ArrowUpCircle, ChevronRight, Warehouse,
  ArrowLeftRight,
} from 'lucide-react-native';
import { warehouseAPI, stockAPI, partsAPI, supplierAPI } from '../../api/client';
import { Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { useAppTheme } from '../../hooks/useAppTheme';

// ─── Hareket Tipi Türkçe ──────────────────────────────────────────────────────
const movementLabel: Record<string, { label: string; color: string; sign: string }> = {
  SATIN_ALMA: { label: 'Satın Alma', color: '#10B981', sign: '+' },
  IS_EMRI_KULLANIMI: { label: 'İş Emri', color: '#EF4444', sign: '-' },
  SATIS: { label: 'Satış', color: '#EF4444', sign: '-' },
  IADE: { label: 'İade', color: '#10B981', sign: '+' },
  FIRE: { label: 'Fire', color: '#F59E0B', sign: '-' },
  DUZELTME: { label: 'Düzeltme', color: '#6366F1', sign: '±' },
  DEPO_TRANSFERI: { label: 'Transfer', color: '#6366F1', sign: '↔' },
  ATOLYE_SARFI: { label: 'Atölye Sarfı', color: '#8B5CF6', sign: '-' },
  IN: { label: 'Giriş', color: '#10B981', sign: '+' },
  OUT: { label: 'Çıkış', color: '#EF4444', sign: '-' },
  RETURN: { label: 'İade', color: '#10B981', sign: '+' },
  TRANSFER: { label: 'Transfer', color: '#6366F1', sign: '↔' },
  ADJUSTMENT: { label: 'Düzeltme', color: '#6366F1', sign: '±' },
};

const isOutMovement = (type: string) =>
  ['IS_EMRI_KULLANIMI', 'SATIS', 'FIRE', 'OUT', 'TRANSFER', 'ATOLYE_SARFI'].includes(type);

// ─── Stok Giriş Modal ─────────────────────────────────────────────────────────
function StockInModal({ visible, onClose, theme }: any) {
  const queryClient = useQueryClient();
  const [partSearch, setPartSearch] = useState('');
  const [selectedPart, setSelectedPart] = useState<any>(null);
  const [quantity, setQuantity] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [notes, setNotes] = useState('');

  const { data: partsData } = useQuery({
    queryKey: ['parts-search', partSearch],
    queryFn: () => partsAPI.getAll({ search: partSearch.trim() || undefined, limit: 50 }),
  });

  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => supplierAPI.getAll(),
  });
  
  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehouseAPI.getAll(),
  });

  const parts = (partsData as any)?.data || [];
  const suppliers = (suppliersData as any)?.data || [];
  const warehouses = (warehousesData as any)?.data || [];

  const mutation = useMutation({
    mutationFn: () => stockAPI.purchase({
      partId: selectedPart.id,
      quantity: parseInt(quantity),
      unitCost: parseFloat(unitCost.replace(',', '.')),
      supplierId: supplierId || undefined,
      warehouseId: warehouseId || undefined,
      invoiceNumber: invoiceNumber.trim() || undefined,
      notes,
    }),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['warehouseStats'] });
      queryClient.invalidateQueries({ queryKey: ['criticalStock'] });
      queryClient.invalidateQueries({ queryKey: ['parts'] });
      queryClient.invalidateQueries({ queryKey: ['partStats'] });
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['supplierSummary'] });
      Alert.alert('✅ Başarılı', res?.message || 'Stok girişi yapıldı.');
      setSelectedPart(null);
      setPartSearch('');
      setQuantity('');
      setUnitCost('');
      setSupplierId('');
      setInvoiceNumber('');
      setNotes('');
      onClose();
    },
    onError: (err: any) => {
      Alert.alert('Hata', err?.message || 'Stok girişi yapılamadı.');
    },
  });

  const handleSubmit = () => {
    if (!selectedPart) { Alert.alert('Hata', 'Lütfen bir ürün seçin.'); return; }
    if (!quantity || parseInt(quantity) <= 0) { Alert.alert('Hata', 'Lütfen geçerli bir miktar girin.'); return; }
    if (!unitCost || parseFloat(unitCost.replace(',', '.')) < 0) { Alert.alert('Hata', 'Lütfen alış fiyatı girin.'); return; }
    mutation.mutate();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: theme.background }}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: theme.border }}>
            <Text style={{ fontSize: Typography.fontSize.lg, fontWeight: '700', color: theme.textPrimary }}>📦 Stok Girişi</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ color: theme.primary, fontWeight: '600' }}>İptal</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: Spacing.lg }} showsVerticalScrollIndicator={false}>
            {/* Ürün Seçimi */}
            <Text style={{ color: theme.textMuted, fontSize: Typography.fontSize.xs, fontWeight: '700', marginBottom: 4, textTransform: 'uppercase' }}>
              Ürün Seçimi *
            </Text>
            {selectedPart ? (
              <TouchableOpacity
                onPress={() => setSelectedPart(null)}
                style={{ backgroundColor: theme.primary + '15', borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1, borderColor: theme.primary + '40', marginBottom: Spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.primary, fontWeight: '700', fontSize: Typography.fontSize.base }}>{selectedPart.name}</Text>
                  <Text style={{ color: theme.textMuted, fontSize: Typography.fontSize.xs }}>Toplam Stok: {selectedPart.quantity} {selectedPart.unit}</Text>
                </View>
                <Text style={{ color: theme.textMuted, fontWeight: '600' }}>✕ Değiştir</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TextInput
                  style={{ backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: BorderRadius.md, padding: Spacing.md, color: theme.textPrimary, marginBottom: Spacing.xs }}
                  placeholder="🔍 Parça ara veya listeden seçin..."
                  placeholderTextColor={theme.textMuted}
                  value={partSearch}
                  onChangeText={setPartSearch}
                />
                <ScrollView nestedScrollEnabled style={{ maxHeight: 200, marginBottom: Spacing.md }}>
                  {parts.map((p: any) => (
                    <TouchableOpacity
                      key={p.id}
                      style={{ backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                      onPress={() => { setSelectedPart(p); setUnitCost(p.purchasePrice ? String(parseFloat(p.purchasePrice)) : ''); }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: theme.textPrimary, fontWeight: '600' }}>{p.name}</Text>
                        {p.brand && <Text style={{ color: theme.textMuted, fontSize: Typography.fontSize.xs }}>{p.brand}</Text>}
                      </View>
                      <Text style={{ color: theme.primary, fontSize: Typography.fontSize.sm, fontWeight: '700' }}>{p.quantity} {p.unit}</Text>
                    </TouchableOpacity>
                  ))}
                  {parts.length === 0 && (
                    <Text style={{ color: theme.textMuted, textAlign: 'center', paddingVertical: Spacing.md }}>Parça bulunamadı</Text>
                  )}
                </ScrollView>
              </>
            )}

            {/* Miktar ve Fiyat */}
            <View style={{ flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.textMuted, fontSize: Typography.fontSize.xs, marginBottom: 4 }}>Miktar *</Text>
                <TextInput
                  style={{ backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: BorderRadius.md, padding: Spacing.md, color: theme.textPrimary }}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={theme.textMuted}
                  value={quantity}
                  onChangeText={setQuantity}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.textMuted, fontSize: Typography.fontSize.xs, marginBottom: 4 }}>Alış Fiyatı (₺) *</Text>
                <TextInput
                  style={{ backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: BorderRadius.md, padding: Spacing.md, color: theme.textPrimary }}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={theme.textMuted}
                  value={unitCost}
                  onChangeText={setUnitCost}
                />
              </View>
            </View>

            {/* Depo */}
            <Text style={{ color: theme.textMuted, fontSize: Typography.fontSize.xs, marginBottom: 4 }}>Depo</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.md }}>
              {warehouses.map((w: any) => (
                <TouchableOpacity
                  key={w.id}
                  onPress={() => setWarehouseId(w.id)}
                  style={{ paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: (warehouseId === w.id || (!warehouseId && w.isDefault)) ? theme.primary : theme.border, backgroundColor: (warehouseId === w.id || (!warehouseId && w.isDefault)) ? theme.primary + '15' : theme.surface, marginRight: Spacing.sm }}
                >
                  <Text style={{ color: (warehouseId === w.id || (!warehouseId && w.isDefault)) ? theme.primary : theme.textSecondary, fontSize: Typography.fontSize.sm, fontWeight: (warehouseId === w.id || (!warehouseId && w.isDefault)) ? '700' : '400' }}>{w.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Tedarikçi */}
            <Text style={{ color: theme.textMuted, fontSize: Typography.fontSize.xs, marginBottom: 4 }}>Tedarikçi (Opsiyonel)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.md }}>
              {[{ id: '', name: 'Seçiniz' }, ...suppliers].map((s: any) => (
                <TouchableOpacity
                  key={s.id}
                  onPress={() => setSupplierId(s.id)}
                  style={{ paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: supplierId === s.id ? theme.primary : theme.border, backgroundColor: supplierId === s.id ? theme.primary + '15' : theme.surface, marginRight: Spacing.sm }}
                >
                  <Text style={{ color: supplierId === s.id ? theme.primary : theme.textSecondary, fontSize: Typography.fontSize.sm, fontWeight: supplierId === s.id ? '700' : '400' }}>{s.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* İrsaliye / Fiş No */}
            <Text style={{ color: theme.textMuted, fontSize: Typography.fontSize.xs, marginBottom: 4 }}>İrsaliye / Fiş No (Opsiyonel)</Text>
            <TextInput
              style={{ backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: BorderRadius.md, padding: Spacing.md, color: theme.textPrimary, marginBottom: Spacing.md }}
              placeholder="Örn: İRS-2024-8841 veya Kurye Fişi"
              placeholderTextColor={theme.textMuted}
              value={invoiceNumber}
              onChangeText={setInvoiceNumber}
            />

            {/* Not */}
            <Text style={{ color: theme.textMuted, fontSize: Typography.fontSize.xs, marginBottom: 4 }}>Not</Text>
            <TextInput
              style={{ backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: BorderRadius.md, padding: Spacing.md, color: theme.textPrimary, height: 70, textAlignVertical: 'top', marginBottom: Spacing.lg }}
              multiline
              placeholder="Opsiyonel not..."
              placeholderTextColor={theme.textMuted}
              value={notes}
              onChangeText={setNotes}
            />

            <TouchableOpacity
              style={{ backgroundColor: theme.primary, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', opacity: mutation.isPending ? 0.7 : 1 }}
              onPress={handleSubmit}
              disabled={mutation.isPending}
            >
              {mutation.isPending
                ? <ActivityIndicator color="#fff" />
                : <Text style={{ color: '#fff', fontWeight: '700', fontSize: Typography.fontSize.base }}>📦 Stok Girişi Yap</Text>
              }
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Stok Çıkış Modal ─────────────────────────────────────────────────────────
function StockOutModal({ visible, onClose, theme }: any) {
  const queryClient = useQueryClient();
  const [partSearch, setPartSearch] = useState('');
  const [selectedPart, setSelectedPart] = useState<any>(null);
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('ATOLYE_SARFI');
  const [warehouseId, setWarehouseId] = useState('');
  const [notes, setNotes] = useState('');

  const { data: partsData } = useQuery({
    queryKey: ['parts-search-out', partSearch],
    queryFn: () => partsAPI.getAll({ search: partSearch.trim() || undefined, limit: 50 }),
  });

  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehouseAPI.getAll(),
  });

  const parts = (partsData as any)?.data || [];
  const warehouses = (warehousesData as any)?.data || [];

  const REASONS = [
    { value: 'ATOLYE_SARFI', label: '🧰 Atölye Sarfı' },
    { value: 'FIRE', label: '🔥 Fire / Zayi' },
    { value: 'SATIS', label: '💰 Satış' },
    { value: 'DUZELTME', label: '📝 Düzeltme' },
  ];

  const mutation = useMutation({
    mutationFn: () => stockAPI.out({
      partId: selectedPart.id,
      quantity: parseInt(quantity),
      reason,
      warehouseId: warehouseId || undefined,
      notes,
    }),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['warehouseStats'] });
      queryClient.invalidateQueries({ queryKey: ['criticalStock'] });
      queryClient.invalidateQueries({ queryKey: ['parts'] });
      queryClient.invalidateQueries({ queryKey: ['partStats'] });
      Alert.alert('✅ Başarılı', res?.message || 'Stok çıkışı yapıldı.');
      setSelectedPart(null); setPartSearch(''); setQuantity(''); setNotes('');
      onClose();
    },
    onError: (err: any) => {
      Alert.alert('Hata', err?.message || 'Stok çıkışı yapılamadı.');
    },
  });

  const handleSubmit = () => {
    if (!selectedPart) { Alert.alert('Hata', 'Lütfen bir ürün seçin.'); return; }
    if (!quantity || parseInt(quantity) <= 0) { Alert.alert('Hata', 'Lütfen geçerli bir miktar girin.'); return; }
    const available = selectedPart.quantity - (selectedPart.reservedQuantity || 0);
    if (parseInt(quantity) > available) {
      Alert.alert('Yetersiz Stok', `Kullanılabilir stok: ${available} ${selectedPart.unit}`);
      return;
    }
    mutation.mutate();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: theme.background }}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: theme.border }}>
            <Text style={{ fontSize: Typography.fontSize.lg, fontWeight: '700', color: theme.textPrimary }}>📤 Stok Çıkışı</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ color: theme.primary, fontWeight: '600' }}>İptal</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: Spacing.lg }}>
            {/* Ürün */}
            <Text style={{ color: theme.textMuted, fontSize: Typography.fontSize.xs, fontWeight: '700', marginBottom: 4, textTransform: 'uppercase' }}>Ürün Seçimi *</Text>
            {selectedPart ? (
              <TouchableOpacity onPress={() => setSelectedPart(null)}
                style={{ backgroundColor: theme.danger + '15', borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1, borderColor: theme.danger + '40', marginBottom: Spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.danger, fontWeight: '700', fontSize: Typography.fontSize.base }}>{selectedPart.name}</Text>
                  <Text style={{ color: theme.textMuted, fontSize: Typography.fontSize.xs }}>
                    Kullanılabilir Toplam: {selectedPart.quantity - (selectedPart.reservedQuantity || 0)} {selectedPart.unit}
                  </Text>
                </View>
                <Text style={{ color: theme.textMuted, fontWeight: '600' }}>✕ Değiştir</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TextInput
                  style={{ backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: BorderRadius.md, padding: Spacing.md, color: theme.textPrimary, marginBottom: Spacing.xs }}
                  placeholder="🔍 Parça ara veya aşağıdan seçin..."
                  placeholderTextColor={theme.textMuted}
                  value={partSearch}
                  onChangeText={setPartSearch}
                />
                <ScrollView nestedScrollEnabled style={{ maxHeight: 200, marginBottom: Spacing.md }}>
                  {parts.map((p: any) => (
                    <TouchableOpacity key={p.id} onPress={() => setSelectedPart(p)}
                      style={{ backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: theme.textPrimary, fontWeight: '600' }}>{p.name}</Text>
                        {p.brand && <Text style={{ color: theme.textMuted, fontSize: Typography.fontSize.xs }}>{p.brand}</Text>}
                      </View>
                      <Text style={{ color: theme.textMuted, fontSize: Typography.fontSize.sm }}>
                        {p.quantity - (p.reservedQuantity || 0)} {p.unit}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  {parts.length === 0 && (
                    <Text style={{ color: theme.textMuted, textAlign: 'center', paddingVertical: Spacing.md }}>Parça bulunamadı</Text>
                  )}
                </ScrollView>
              </>
            )}

            {/* Sebep */}
            <Text style={{ color: theme.textMuted, fontSize: Typography.fontSize.xs, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase' }}>Sebep *</Text>
            <View style={{ flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md }}>
              {REASONS.map(r => (
                <TouchableOpacity key={r.value} onPress={() => setReason(r.value)}
                  style={{ flex: 1, paddingVertical: Spacing.sm, alignItems: 'center', borderRadius: BorderRadius.md, borderWidth: 1, borderColor: reason === r.value ? theme.danger : theme.border, backgroundColor: reason === r.value ? theme.danger + '15' : theme.surface }}
                >
                  <Text style={{ color: reason === r.value ? theme.danger : theme.textSecondary, fontSize: Typography.fontSize.xs, fontWeight: reason === r.value ? '700' : '400' }}>{r.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Depo */}
            <Text style={{ color: theme.textMuted, fontSize: Typography.fontSize.xs, marginBottom: 4 }}>Depo</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.md }}>
              {warehouses.map((w: any) => (
                <TouchableOpacity
                  key={w.id}
                  onPress={() => setWarehouseId(w.id)}
                  style={{ paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: (warehouseId === w.id || (!warehouseId && w.isDefault)) ? theme.danger : theme.border, backgroundColor: (warehouseId === w.id || (!warehouseId && w.isDefault)) ? theme.danger + '15' : theme.surface, marginRight: Spacing.sm }}
                >
                  <Text style={{ color: (warehouseId === w.id || (!warehouseId && w.isDefault)) ? theme.danger : theme.textSecondary, fontSize: Typography.fontSize.sm, fontWeight: (warehouseId === w.id || (!warehouseId && w.isDefault)) ? '700' : '400' }}>{w.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Miktar */}
            <Text style={{ color: theme.textMuted, fontSize: Typography.fontSize.xs, marginBottom: 4 }}>Miktar *</Text>
            <TextInput
              style={{ backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: BorderRadius.md, padding: Spacing.md, color: theme.textPrimary, marginBottom: Spacing.md }}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={theme.textMuted}
              value={quantity}
              onChangeText={setQuantity}
            />

            {/* Not */}
            <Text style={{ color: theme.textMuted, fontSize: Typography.fontSize.xs, marginBottom: 4 }}>Not</Text>
            <TextInput
              style={{ backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: BorderRadius.md, padding: Spacing.md, color: theme.textPrimary, height: 80, textAlignVertical: 'top', marginBottom: Spacing.lg }}
              multiline placeholder="Opsiyonel..." placeholderTextColor={theme.textMuted}
              value={notes} onChangeText={setNotes}
            />

            <TouchableOpacity
              style={{ backgroundColor: theme.danger, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', opacity: mutation.isPending ? 0.7 : 1 }}
              onPress={handleSubmit} disabled={mutation.isPending}
            >
              {mutation.isPending
                ? <ActivityIndicator color="#fff" />
                : <Text style={{ color: '#fff', fontWeight: '700', fontSize: Typography.fontSize.base }}>📤 Stok Çıkışı Yap</Text>
              }
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Depolar Arası Transfer Modal ─────────────────────────────────────────────
function StockTransferModal({ visible, onClose, theme }: any) {
  const queryClient = useQueryClient();
  const [partSearch, setPartSearch] = useState('');
  const [selectedPart, setSelectedPart] = useState<any>(null);
  const [fromWarehouseId, setFromWarehouseId] = useState('');
  const [toWarehouseId, setToWarehouseId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');

  const { data: partsData } = useQuery({
    queryKey: ['parts-search-transfer', partSearch],
    queryFn: () => partsAPI.getAll({ search: partSearch.trim() || undefined, limit: 100 }),
  });

  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehouseAPI.getAll(),
  });

  const parts = (partsData as any)?.data || [];
  const warehouses = (warehousesData as any)?.data || [];

  // Varsayılan depoları belirle
  useEffect(() => {
    if (warehouses.length > 0) {
      if (!fromWarehouseId) {
        const def = warehouses.find((w: any) => w.isDefault) || warehouses[0];
        setFromWarehouseId(def.id);
        const other = warehouses.find((w: any) => w.id !== def.id);
        if (other && !toWarehouseId) setToWarehouseId(other.id);
      }
    }
  }, [warehouses]);

  // Kaynak depo değiştikçe hedef depoyu otomatik düzelt
  const handleSelectFromWarehouse = (wId: string) => {
    setFromWarehouseId(wId);
    if (toWarehouseId === wId) {
      const other = warehouses.find((w: any) => w.id !== wId);
      if (other) setToWarehouseId(other.id);
    }
  };

  // Seçilen parçanın kaynak depodaki stoku
  const fromWs = selectedPart?.warehouseStocks?.find((ws: any) => ws.warehouseId === fromWarehouseId);
  const sourceQty = fromWs ? fromWs.quantity : 0;

  // Parçaları sırala: Kaynak depoda stoku olanlar en üstte görünsün!
  const sortedParts = useMemo(() => {
    return [...parts].sort((a: any, b: any) => {
      const stockA = a.warehouseStocks?.find((ws: any) => ws.warehouseId === fromWarehouseId)?.quantity || 0;
      const stockB = b.warehouseStocks?.find((ws: any) => ws.warehouseId === fromWarehouseId)?.quantity || 0;
      return stockB - stockA;
    });
  }, [parts, fromWarehouseId]);

  const fromWarehouseName = warehouses.find((w: any) => w.id === fromWarehouseId)?.name || 'Kaynak Depo';
  const toWarehouseName = warehouses.find((w: any) => w.id === toWarehouseId)?.name || 'Hedef Depo';

  const mutation = useMutation({
    mutationFn: () => stockAPI.transfer({
      partId: selectedPart.id,
      fromWarehouseId,
      toWarehouseId,
      quantity: parseInt(quantity),
      notes,
    }),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['warehouseStats'] });
      queryClient.invalidateQueries({ queryKey: ['criticalStock'] });
      queryClient.invalidateQueries({ queryKey: ['parts'] });
      queryClient.invalidateQueries({ queryKey: ['partStats'] });
      Alert.alert('✅ Başarılı', res?.message || `${quantity} adet başarıyla transfer edildi.`);
      setSelectedPart(null);
      setPartSearch('');
      setQuantity('');
      setNotes('');
      onClose();
    },
    onError: (err: any) => {
      Alert.alert('Hata', err?.message || 'Transfer gerçekleştirilemedi.');
    },
  });

  const handleSubmit = () => {
    if (!selectedPart) { Alert.alert('Hata', 'Lütfen transfer edilecek malzemeyi listeden seçin.'); return; }
    if (!fromWarehouseId) { Alert.alert('Hata', 'Lütfen kaynak depoyu seçin.'); return; }
    if (!toWarehouseId) { Alert.alert('Hata', 'Lütfen hedef depoyu seçin.'); return; }
    if (fromWarehouseId === toWarehouseId) { Alert.alert('Hata', 'Kaynak ve hedef depo aynı olamaz.'); return; }
    const qty = parseInt(quantity);
    if (!qty || qty <= 0) { Alert.alert('Hata', 'Lütfen geçerli bir transfer miktarı girin.'); return; }
    if (qty > sourceQty) {
      Alert.alert('Yetersiz Stok', `"${fromWarehouseName}" deposunda yalnızca ${sourceQty} ${selectedPart.unit} bulunuyor.`);
      return;
    }
    mutation.mutate();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: theme.background }}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: theme.border }}>
            <View>
              <Text style={{ fontSize: Typography.fontSize.lg, fontWeight: '700', color: theme.textPrimary }}>🔄 Depolar Arası Transfer</Text>
              <Text style={{ fontSize: Typography.fontSize.xs, color: theme.textMuted }}>{fromWarehouseName} ➔ {toWarehouseName}</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ color: theme.primary, fontWeight: '600' }}>İptal</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: Spacing.lg }} showsVerticalScrollIndicator={false}>
            {/* ADIM 1: Kaynak Depo Seçimi */}
            <Text style={{ color: theme.textMuted, fontSize: Typography.fontSize.xs, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase' }}>
              1. Kaynak Depo (Nereden Çıkacak?) *
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.md }}>
              {warehouses.map((w: any) => {
                const isSelected = fromWarehouseId === w.id;
                return (
                  <TouchableOpacity
                    key={w.id}
                    onPress={() => handleSelectFromWarehouse(w.id)}
                    style={{
                      paddingHorizontal: Spacing.md,
                      paddingVertical: 8,
                      borderRadius: BorderRadius.full,
                      borderWidth: 1.5,
                      borderColor: isSelected ? '#EF4444' : theme.border,
                      backgroundColor: isSelected ? '#EF444415' : theme.surface,
                      marginRight: Spacing.sm
                    }}
                  >
                    <Text style={{ color: isSelected ? '#EF4444' : theme.textSecondary, fontSize: Typography.fontSize.sm, fontWeight: isSelected ? '700' : '400' }}>
                      {w.isDefault ? '⭐ ' : ''}{w.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* ADIM 2: Malzeme Seçimi (Doğrudan Listeden) */}
            <Text style={{ color: theme.textMuted, fontSize: Typography.fontSize.xs, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase' }}>
              2. Transfer Edilecek Malzeme *
            </Text>
            {selectedPart ? (
              <TouchableOpacity
                onPress={() => setSelectedPart(null)}
                style={{
                  backgroundColor: '#6366F115',
                  borderRadius: BorderRadius.md,
                  padding: Spacing.md,
                  borderWidth: 1.5,
                  borderColor: '#6366F1',
                  marginBottom: Spacing.md,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#6366F1', fontWeight: '800', fontSize: Typography.fontSize.base }}>{selectedPart.name}</Text>
                  {selectedPart.brand && <Text style={{ color: theme.textSecondary, fontSize: Typography.fontSize.xs }}>{selectedPart.brand}</Text>}
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 }}>
                    <Text style={{ color: sourceQty > 0 ? theme.success : theme.danger, fontWeight: '700', fontSize: Typography.fontSize.xs }}>
                      📍 {fromWarehouseName} Mevcut: {sourceQty} {selectedPart.unit}
                    </Text>
                    <Text style={{ color: theme.textMuted, fontSize: Typography.fontSize.xs }}>
                      (Toplam: {selectedPart.quantity} {selectedPart.unit})
                    </Text>
                  </View>
                </View>
                <Text style={{ color: '#6366F1', fontWeight: '700', fontSize: Typography.fontSize.xs, backgroundColor: '#6366F120', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                  ✕ Değiştir
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={{ marginBottom: Spacing.md }}>
                <TextInput
                  style={{
                    backgroundColor: theme.surface,
                    borderWidth: 1,
                    borderColor: theme.border,
                    borderRadius: BorderRadius.md,
                    padding: Spacing.md,
                    color: theme.textPrimary,
                    marginBottom: Spacing.xs
                  }}
                  placeholder="🔍 Parça ara (veya aşağıdaki listeden seçin)..."
                  placeholderTextColor={theme.textMuted}
                  value={partSearch}
                  onChangeText={setPartSearch}
                />

                <Text style={{ color: theme.textMuted, fontSize: Typography.fontSize.xs, marginBottom: 6, fontStyle: 'italic' }}>
                  {fromWarehouseName} deposundaki parçalar üstte listelenmiştir:
                </Text>

                <ScrollView nestedScrollEnabled style={{ maxHeight: 230, backgroundColor: theme.surface, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: theme.border, padding: Spacing.xs }}>
                  {sortedParts.map((p: any) => {
                    const inStock = p.warehouseStocks?.find((ws: any) => ws.warehouseId === fromWarehouseId)?.quantity || 0;
                    const hasStock = inStock > 0;
                    return (
                      <TouchableOpacity
                        key={p.id}
                        onPress={() => {
                          if (!hasStock) {
                            Alert.alert('Bilgi', `"${p.name}" parçası "${fromWarehouseName}" deposunda bulunmuyor.`);
                            return;
                          }
                          setSelectedPart(p);
                          setQuantity('');
                        }}
                        style={{
                          padding: Spacing.md,
                          borderRadius: BorderRadius.sm,
                          marginBottom: 4,
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          backgroundColor: hasStock ? theme.background : 'transparent',
                          opacity: hasStock ? 1 : 0.45,
                          borderWidth: hasStock ? 1 : 0,
                          borderColor: theme.borderLight
                        }}
                      >
                        <View style={{ flex: 1, paddingRight: Spacing.sm }}>
                          <Text style={{ color: theme.textPrimary, fontWeight: '700', fontSize: Typography.fontSize.sm }}>{p.name}</Text>
                          <Text style={{ color: theme.textMuted, fontSize: Typography.fontSize.xs }}>
                            {p.brand || p.category || 'Yedek Parça'}
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={{
                            color: hasStock ? '#10B981' : theme.textMuted,
                            fontWeight: '700',
                            fontSize: Typography.fontSize.sm
                          }}>
                            {inStock > 0 ? `${inStock} ${p.unit}` : 'Stok Yok'}
                          </Text>
                          <Text style={{ color: theme.textMuted, fontSize: 10 }}>bu depoda</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                  {sortedParts.length === 0 && (
                    <Text style={{ color: theme.textMuted, textAlign: 'center', paddingVertical: Spacing.lg }}>
                      Kayıtlı malzeme bulunamadı.
                    </Text>
                  )}
                </ScrollView>
              </View>
            )}

            {/* ADIM 3: Hedef Depo Seçimi */}
            <Text style={{ color: theme.textMuted, fontSize: Typography.fontSize.xs, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase' }}>
              3. Hedef Depo (Nereye Eklenecek?) *
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.md }}>
              {warehouses.filter((w: any) => w.id !== fromWarehouseId).map((w: any) => {
                const isSelected = toWarehouseId === w.id;
                return (
                  <TouchableOpacity
                    key={w.id}
                    onPress={() => setToWarehouseId(w.id)}
                    style={{
                      paddingHorizontal: Spacing.md,
                      paddingVertical: 8,
                      borderRadius: BorderRadius.full,
                      borderWidth: 1.5,
                      borderColor: isSelected ? '#10B981' : theme.border,
                      backgroundColor: isSelected ? '#10B98115' : theme.surface,
                      marginRight: Spacing.sm
                    }}
                  >
                    <Text style={{ color: isSelected ? '#10B981' : theme.textSecondary, fontSize: Typography.fontSize.sm, fontWeight: isSelected ? '700' : '400' }}>
                      {w.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* ADIM 4: Transfer Miktarı */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text style={{ color: theme.textMuted, fontSize: Typography.fontSize.xs, fontWeight: '700', textTransform: 'uppercase' }}>
                4. Transfer Miktarı *
              </Text>
              {selectedPart && sourceQty > 0 && (
                <Text style={{ color: theme.primary, fontSize: Typography.fontSize.xs, fontWeight: '600' }}>
                  Maksimum: {sourceQty} {selectedPart.unit}
                </Text>
              )}
            </View>

            <TextInput
              style={{
                backgroundColor: theme.surface,
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: BorderRadius.md,
                padding: Spacing.md,
                color: theme.textPrimary,
                fontSize: Typography.fontSize.lg,
                fontWeight: '700',
                marginBottom: Spacing.xs
              }}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={theme.textMuted}
              value={quantity}
              onChangeText={setQuantity}
            />

            {/* Hızlı Miktar Butonları */}
            {selectedPart && sourceQty > 0 && (
              <View style={{ flexDirection: 'row', gap: Spacing.xs, marginBottom: Spacing.md }}>
                {[1, 2, 5].filter(q => q <= sourceQty).map(q => (
                  <TouchableOpacity
                    key={q}
                    onPress={() => setQuantity(String(q))}
                    style={{
                      paddingHorizontal: Spacing.md,
                      paddingVertical: 6,
                      backgroundColor: theme.surface,
                      borderRadius: BorderRadius.sm,
                      borderWidth: 1,
                      borderColor: theme.border
                    }}
                  >
                    <Text style={{ color: theme.textSecondary, fontSize: Typography.fontSize.xs, fontWeight: '600' }}>+{q}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  onPress={() => setQuantity(String(sourceQty))}
                  style={{
                    paddingHorizontal: Spacing.md,
                    paddingVertical: 6,
                    backgroundColor: theme.primary + '15',
                    borderRadius: BorderRadius.sm,
                    borderWidth: 1,
                    borderColor: theme.primary + '40'
                  }}
                >
                  <Text style={{ color: theme.primary, fontSize: Typography.fontSize.xs, fontWeight: '700' }}>
                    Tümü ({sourceQty} {selectedPart.unit})
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ADIM 5: Not (Opsiyonel) */}
            <Text style={{ color: theme.textMuted, fontSize: Typography.fontSize.xs, marginBottom: 4 }}>Açıklama / Not</Text>
            <TextInput
              style={{
                backgroundColor: theme.surface,
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: BorderRadius.md,
                padding: Spacing.md,
                color: theme.textPrimary,
                height: 65,
                textAlignVertical: 'top',
                marginBottom: Spacing.lg
              }}
              multiline
              placeholder="Opsiyonel transfer notu..."
              placeholderTextColor={theme.textMuted}
              value={notes}
              onChangeText={setNotes}
            />

            <TouchableOpacity
              style={{
                backgroundColor: '#6366F1',
                borderRadius: BorderRadius.md,
                padding: Spacing.md,
                alignItems: 'center',
                opacity: mutation.isPending ? 0.7 : 1
              }}
              onPress={handleSubmit}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: Typography.fontSize.base }}>
                  🔄 {fromWarehouseName} ➔ {toWarehouseName} Transfer Et
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Ana Depo Ekranı ─────────────────────────────────────────────────────────
export default function WarehouseTab() {
  const { colors: theme } = useAppTheme();
  const dynamicStyles = useMemo(() => styles(theme), [theme]);
  const [showStockIn, setShowStockIn] = useState(false);
  const [showStockOut, setShowStockOut] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);

  const { data: statsData, isLoading, refetch } = useQuery({
    queryKey: ['warehouseStats'],
    queryFn: () => warehouseAPI.getStats(),
  });

  const { data: criticalData } = useQuery({
    queryKey: ['criticalStock'],
    queryFn: () => warehouseAPI.getCriticalStock(),
  });

  const { data: supplierSummaryData } = useQuery({
    queryKey: ['supplierSummary'],
    queryFn: () => supplierAPI.getSummary(),
  });

  const stats = (statsData as any)?.data;
  const supplierSummary = (supplierSummaryData as any)?.data;
  const criticalParts: any[] = ((criticalData as any)?.data || []).slice(0, 5);
  const recentMovements: any[] = (stats?.recentMovements || []).slice(0, 8);

  return (
    <SafeAreaView style={dynamicStyles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={theme.primary} />}
      >
        {/* Header */}
        <LinearGradient
          colors={[theme.primary + 'CC', theme.primaryDark + 'EE'] as [string, string]}
          style={dynamicStyles.header}
        >
          <View>
            <Text style={dynamicStyles.headerTitle}>🏭 Depo & Stok</Text>
            <Text style={dynamicStyles.headerSubtitle}>Envanter Yönetimi</Text>
          </View>
          <TouchableOpacity
            style={dynamicStyles.addPartBtn}
            onPress={() => router.push('/warehouse/list' as any)}
          >
            <Warehouse size={16} color="#fff" />
            <Text style={dynamicStyles.addPartBtnText}>Depoları Yönet</Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* Özet Kartlar */}
        <View style={dynamicStyles.statsGrid}>
          <View style={[dynamicStyles.statCard, { borderColor: theme.primary + '30' }]}>
            <View style={[dynamicStyles.statIcon, { backgroundColor: theme.primary + '20' }]}>
              <Package size={20} color={theme.primary} />
            </View>
            <Text style={dynamicStyles.statValue}>{stats?.totalParts ?? '—'}</Text>
            <Text style={dynamicStyles.statLabel}>Toplam Ürün</Text>
          </View>

          <View style={[dynamicStyles.statCard, { borderColor: theme.success + '30' }]}>
            <View style={[dynamicStyles.statIcon, { backgroundColor: theme.success + '20' }]}>
              <TrendingUp size={20} color={theme.success} />
            </View>
            <Text style={[dynamicStyles.statValue, { color: theme.success }]}>
              {stats?.totalStockQuantity ?? '—'}
            </Text>
            <Text style={dynamicStyles.statLabel}>Toplam Stok</Text>
          </View>

          <View style={[dynamicStyles.statCard, { borderColor: theme.danger + '30' }]}>
            <View style={[dynamicStyles.statIcon, { backgroundColor: theme.danger + '20' }]}>
              <AlertTriangle size={20} color={theme.danger} />
            </View>
            <Text style={[dynamicStyles.statValue, { color: theme.danger }]}>
              {stats?.criticalStockCount ?? '—'}
            </Text>
            <Text style={dynamicStyles.statLabel}>Kritik Stok</Text>
          </View>

          <View style={[dynamicStyles.statCard, { borderColor: theme.secondary + '30' }]}>
            <View style={[dynamicStyles.statIcon, { backgroundColor: theme.secondary + '20' }]}>
              <Warehouse size={20} color={theme.secondary} />
            </View>
            <Text style={[dynamicStyles.statValue, { color: theme.secondary }]}>
              {stats?.totalWarehouses ?? '—'}
            </Text>
            <Text style={dynamicStyles.statLabel}>Depo Sayısı</Text>
          </View>
        </View>

        {/* Parçacı Borçları / Cariler Kartı */}
        <TouchableOpacity
          onPress={() => router.push('/warehouse/suppliers' as any)}
          style={{
            marginHorizontal: Spacing.lg,
            marginTop: Spacing.md,
            backgroundColor: theme.surface,
            borderWidth: 1,
            borderColor: (supplierSummary?.totalDebt || 0) > 0 ? '#EF444440' : theme.border,
            borderRadius: BorderRadius.lg,
            padding: Spacing.md,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            ...Shadows.sm,
          }}
          activeOpacity={0.8}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 }}>
            <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: (supplierSummary?.totalDebt || 0) > 0 ? '#EF444415' : theme.success + '15', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 20 }}>🏪</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: Typography.fontSize.xs, color: theme.textMuted, fontWeight: '700', textTransform: 'uppercase' }}>
                Parçacılara Toplam Borcumuz
              </Text>
              <Text style={{ fontSize: Typography.fontSize.lg, fontWeight: '800', color: (supplierSummary?.totalDebt || 0) > 0 ? '#EF4444' : theme.success, marginTop: 2 }}>
                ₺{Number(supplierSummary?.totalDebt || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ fontSize: Typography.fontSize.xs, color: theme.primary, fontWeight: '700' }}>Carileri Gör</Text>
            <ChevronRight size={16} color={theme.primary} />
          </View>
        </TouchableOpacity>

        {/* Hızlı İşlemler */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>⚡ Hızlı İşlemler</Text>
          <View style={dynamicStyles.quickActions}>
            <TouchableOpacity
              style={[dynamicStyles.quickActionBtn, { backgroundColor: theme.success + '15', borderColor: theme.success + '40' }]}
              onPress={() => setShowStockIn(true)}
              activeOpacity={0.8}
            >
              <ArrowDownCircle size={28} color={theme.success} />
              <Text style={[dynamicStyles.quickActionLabel, { color: theme.success }]}>+ STOK GİR</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[dynamicStyles.quickActionBtn, { backgroundColor: theme.danger + '15', borderColor: theme.danger + '40' }]}
              onPress={() => setShowStockOut(true)}
              activeOpacity={0.8}
            >
              <ArrowUpCircle size={28} color={theme.danger} />
              <Text style={[dynamicStyles.quickActionLabel, { color: theme.danger }]}>- STOK ÇIK</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[dynamicStyles.quickActionBtn, { backgroundColor: '#6366F115', borderColor: '#6366F140' }]}
              onPress={() => setShowTransfer(true)}
              activeOpacity={0.8}
            >
              <ArrowLeftRight size={28} color="#6366F1" />
              <Text style={[dynamicStyles.quickActionLabel, { color: '#6366F1' }]}>TRANSFER</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[dynamicStyles.quickActionBtn, { backgroundColor: theme.primary + '15', borderColor: theme.primary + '40' }]}
              onPress={() => router.push('/work-orders' as any)}
              activeOpacity={0.8}
            >
              <Package size={28} color={theme.primary} />
              <Text style={[dynamicStyles.quickActionLabel, { color: theme.primary }]}>İŞ EMRİ</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Kritik Stok */}
        {criticalParts.length > 0 && (
          <View style={dynamicStyles.section}>
            <View style={dynamicStyles.sectionHeader}>
              <Text style={dynamicStyles.sectionTitle}>⚠️ Kritik Stok</Text>
              <TouchableOpacity onPress={() => router.push('/warehouse/critical' as any)}>
                <Text style={{ color: theme.primary, fontSize: Typography.fontSize.sm }}>Tümü →</Text>
              </TouchableOpacity>
            </View>
            <View style={dynamicStyles.card}>
              {criticalParts.map((p: any, i: number) => (
                <TouchableOpacity
                  key={p.id}
                  style={[dynamicStyles.criticalItem, i < criticalParts.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border }]}
                  onPress={() => router.push(`/parts/${p.id}` as any)}
                >
                  <View style={[dynamicStyles.criticalIndicator, { backgroundColor: theme.danger }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={dynamicStyles.criticalName}>{p.name}</Text>
                    {p.brand && <Text style={dynamicStyles.criticalBrand}>{p.brand}</Text>}
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[dynamicStyles.criticalQty, { color: theme.danger }]}>
                      {p.quantity} {p.unit}
                    </Text>
                    <Text style={dynamicStyles.criticalMin}>Min: {p.minQuantity}</Text>
                  </View>
                  <ChevronRight size={16} color={theme.textMuted} style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Stok & Transfer Hareketleri Sorgulama Kartı */}
        <View style={dynamicStyles.section}>
          <TouchableOpacity
            style={{
              backgroundColor: theme.surface,
              borderRadius: BorderRadius.xl,
              borderWidth: 1.5,
              borderColor: '#6366F140',
              padding: Spacing.lg,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              ...Shadows.sm,
            }}
            onPress={() => router.push('/warehouse/movements' as any)}
            activeOpacity={0.85}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 }}>
              <LinearGradient
                colors={['#6366F1', '#4F46E5']}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: BorderRadius.lg,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <ArrowLeftRight size={24} color="#fff" />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: Typography.fontSize.base, fontWeight: '800', color: theme.textPrimary }}>
                  🔍 Stok & Transfer Sorgulama
                </Text>
                <Text style={{ fontSize: Typography.fontSize.xs, color: theme.textMuted, marginTop: 2 }}>
                  Depo bazlı giriş, çıkış ve transfer geçmişini filtreleyin
                </Text>
              </View>
            </View>
            <ChevronRight size={20} color={theme.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Navigasyon Kısayolları */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>🔗 Diğer Bölümler</Text>
          <View style={dynamicStyles.navGrid}>
            {[
              { emoji: '🔍', label: 'Hareketler', path: '/warehouse/movements', onPress: null },
              { emoji: '📦', label: 'Depolar', path: '/warehouse/list', onPress: null },
              { emoji: '🏭', label: 'Tedarikçiler', path: '/warehouse/suppliers', onPress: null },
              { emoji: '📜', label: 'İş Emirleri', path: '/work-orders', onPress: null },
            ].map((item, i) => (
              <TouchableOpacity
                key={i}
                style={dynamicStyles.navItem}
                onPress={item.onPress || (() => router.push(item.path as any))}
                activeOpacity={0.8}
              >
                <Text style={dynamicStyles.navEmoji}>{item.emoji}</Text>
                <Text style={dynamicStyles.navLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ height: Spacing.xl }} />
      </ScrollView>

      {/* Modals */}
      <StockInModal visible={showStockIn} onClose={() => setShowStockIn(false)} theme={theme} />
      <StockOutModal visible={showStockOut} onClose={() => setShowStockOut(false)} theme={theme} />
      <StockTransferModal visible={showTransfer} onClose={() => setShowTransfer(false)} theme={theme} />
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
    ...Shadows.sm,
  },
  headerTitle: { fontSize: Typography.fontSize.xl, fontWeight: '800', color: '#fff' },
  headerSubtitle: { fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  addPartBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  addPartBtnText: { color: '#fff', fontWeight: '700', fontSize: Typography.fontSize.sm },

  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm,
    paddingHorizontal: Spacing.lg, marginBottom: Spacing.md,
  },
  statCard: {
    flex: 1, minWidth: '44%', backgroundColor: theme.surface,
    borderRadius: BorderRadius.lg, padding: Spacing.md,
    borderWidth: 1, alignItems: 'center', ...Shadows.sm,
  },
  statIcon: { width: 44, height: 44, borderRadius: BorderRadius.full, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statValue: { fontSize: Typography.fontSize['2xl'], fontWeight: '800', color: theme.textPrimary },
  statLabel: { fontSize: Typography.fontSize.xs, color: theme.textMuted, marginTop: 2, textAlign: 'center' },

  section: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  sectionTitle: { fontSize: Typography.fontSize.base, fontWeight: '700', color: theme.textPrimary, marginBottom: Spacing.md },

  quickActions: { flexDirection: 'row', gap: Spacing.xs },
  quickActionBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: Spacing.md, paddingHorizontal: 4, borderRadius: BorderRadius.lg, borderWidth: 1.5,
    gap: 6, minHeight: 82,
  },
  quickActionLabel: { fontWeight: '800', fontSize: 11, textAlign: 'center' },

  card: {
    backgroundColor: theme.surface, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: theme.border, overflow: 'hidden', ...Shadows.sm,
  },
  criticalItem: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.sm },
  criticalIndicator: { width: 4, height: '100%', borderRadius: 2, minHeight: 32 },
  criticalName: { fontSize: Typography.fontSize.sm, fontWeight: '600', color: theme.textPrimary },
  criticalBrand: { fontSize: Typography.fontSize.xs, color: theme.textMuted },
  criticalQty: { fontSize: Typography.fontSize.base, fontWeight: '800' },
  criticalMin: { fontSize: Typography.fontSize.xs, color: theme.textMuted },

  movementItem: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.sm },
  movementDot: { width: 32, height: 32, borderRadius: BorderRadius.full, justifyContent: 'center', alignItems: 'center' },
  movementPartName: { fontSize: Typography.fontSize.sm, fontWeight: '600', color: theme.textPrimary },
  movementTypeLabel: { fontSize: Typography.fontSize.xs, color: theme.textMuted, marginTop: 1 },
  movementQty: { fontSize: Typography.fontSize.sm, fontWeight: '700' },

  navGrid: { flexDirection: 'row', gap: Spacing.sm },
  navItem: {
    flex: 1, backgroundColor: theme.surface, borderRadius: BorderRadius.lg,
    padding: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: theme.border, ...Shadows.sm,
  },
  navEmoji: { fontSize: 28, marginBottom: 6 },
  navLabel: { fontSize: Typography.fontSize.xs, color: theme.textSecondary, textAlign: 'center', fontWeight: '500' },
});
