import React, { useState, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Modal, KeyboardAvoidingView,
  Platform, ScrollView, RefreshControl, Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { warehouseAPI, stockAPI } from '../../src/api/client';
import { Typography, Spacing, BorderRadius, Shadows } from '../../src/constants/theme';
import { useAppTheme } from '../../src/hooks/useAppTheme';
import { useAuthStore, isTechnicianRole } from '../../src/store/auth.store';
import {
  Plus, Warehouse, MapPin, CheckCircle2, Star, Edit3, Trash2, ArrowLeft,
  Search, Package, Tag, ArrowRight, X, ChevronRight, FileSpreadsheet, Download
} from 'lucide-react-native';
import { exportWarehouseToExcel, exportAllWarehousesToExcel } from '../../src/utils/warehouseExporter';

// ─── Sanayi Depo Tipleri ──────────────────────────────────────────────────────
export const WAREHOUSE_TYPES: Record<string, { label: string; icon: string; color: string; desc: string }> = {
  MAIN: { label: 'Ana Yedek Parça', icon: '📦', color: '#3B82F6', desc: 'Kilitli ana depo, sıfır yedek parçalar' },
  WORKSHOP_CONSUMABLES: { label: 'Atölye Sarfiyat & Yağ', icon: '🧰', color: '#10B981', desc: 'Lift kenarı sprey, conta, yağ, cıvata' },
  USED_PARTS: { label: 'Çıkma & Revizyon', icon: '♻️', color: '#F59E0B', desc: 'İkinci el, sağlam, revizyonlu parçalar' },
  SCRAP: { label: 'Hurda / Müşteri Çıkan', icon: '🗑️', color: '#EF4444', desc: 'Araçtan sökülen eski ve hurda parçalar' },
  OTHER: { label: 'Diğer / Harici Depo', icon: '🏢', color: '#6366F1', desc: 'Ek depolama veya harici alan' },
};

// ─── Yeni Depo Ekleme Modalı ──────────────────────────────────────────────────
function AddWarehouseModal({ visible, onClose, theme }: any) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: '',
    type: 'MAIN',
    description: '',
    address: '',
    isDefault: false
  });
  const update = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const mutation = useMutation({
    mutationFn: () => warehouseAPI.create(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      queryClient.invalidateQueries({ queryKey: ['warehouseStats'] });
      setForm({ name: '', type: 'MAIN', description: '', address: '', isDefault: false });
      onClose();
      Alert.alert('✅ Başarılı', 'Yeni depo başarıyla eklendi.');
    },
    onError: (err: any) => Alert.alert('Hata', err?.response?.data?.error || err?.message || 'Depo eklenemedi.'),
  });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: theme.background }}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: theme.border }}>
            <Text style={{ fontSize: Typography.fontSize.lg, fontWeight: '800', color: theme.textPrimary }}>📦 Yeni Depo Ekle</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ color: theme.primary, fontWeight: '600' }}>İptal</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: Spacing.lg }} showsVerticalScrollIndicator={false}>
            {/* Sanayi Depo Tipi Seçimi */}
            <Text style={{ color: theme.textMuted, fontSize: Typography.fontSize.xs, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase' }}>
              Depo Tipi / Amacı *
            </Text>
            <View style={{ gap: Spacing.xs, marginBottom: Spacing.md }}>
              {Object.entries(WAREHOUSE_TYPES).map(([key, info]) => {
                const isSelected = form.type === key;
                return (
                  <TouchableOpacity
                    key={key}
                    onPress={() => update('type', key)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: Spacing.sm,
                      borderRadius: BorderRadius.md,
                      borderWidth: isSelected ? 2 : 1,
                      borderColor: isSelected ? info.color : theme.border,
                      backgroundColor: isSelected ? info.color + '15' : theme.surface,
                      gap: Spacing.sm,
                    }}
                  >
                    <Text style={{ fontSize: 20 }}>{info.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: isSelected ? info.color : theme.textPrimary, fontWeight: '700', fontSize: Typography.fontSize.sm }}>
                        {info.label}
                      </Text>
                      <Text style={{ color: theme.textMuted, fontSize: Typography.fontSize.xs }}>
                        {info.desc}
                      </Text>
                    </View>
                    {isSelected && <CheckCircle2 size={18} color={info.color} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={{ color: theme.textMuted, fontSize: Typography.fontSize.xs, fontWeight: '700', marginBottom: 4, textTransform: 'uppercase' }}>
              Depo Adı *
            </Text>
            <TextInput
              style={{
                backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border,
                borderRadius: BorderRadius.md, padding: Spacing.md, color: theme.textPrimary,
                marginBottom: Spacing.md, fontSize: Typography.fontSize.base
              }}
              value={form.name}
              onChangeText={v => update('name', v)}
              placeholder="Örn: Atölye Hızlı Sarfiyat & Yağ Reyonu"
              placeholderTextColor={theme.textMuted}
            />

            <Text style={{ color: theme.textMuted, fontSize: Typography.fontSize.xs, fontWeight: '700', marginBottom: 4, textTransform: 'uppercase' }}>
              Açıklama
            </Text>
            <TextInput
              style={{
                backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border,
                borderRadius: BorderRadius.md, padding: Spacing.md, color: theme.textPrimary,
                marginBottom: Spacing.md
              }}
              value={form.description}
              onChangeText={v => update('description', v)}
              placeholder="Deponun kullanım amacı veya konumu..."
              placeholderTextColor={theme.textMuted}
            />

            <Text style={{ color: theme.textMuted, fontSize: Typography.fontSize.xs, fontWeight: '700', marginBottom: 4, textTransform: 'uppercase' }}>
              Adres / Raf / Konum
            </Text>
            <TextInput
              style={{
                backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border,
                borderRadius: BorderRadius.md, padding: Spacing.md, color: theme.textPrimary,
                marginBottom: Spacing.lg, height: 75, textAlignVertical: 'top'
              }}
              multiline
              value={form.address}
              onChangeText={v => update('address', v)}
              placeholder="Örn: Zemin Kat / 1. & 2. Lift Yanı"
              placeholderTextColor={theme.textMuted}
            />

            {/* Ana Depo Belirleme Switch'i */}
            <View style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border,
              borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.xl
            }}>
              <View style={{ flex: 1, paddingRight: Spacing.sm }}>
                <Text style={{ fontSize: Typography.fontSize.sm, fontWeight: '700', color: theme.textPrimary }}>
                  ⭐ Ana Depo Olarak Ayarla
                </Text>
                <Text style={{ fontSize: Typography.fontSize.xs, color: theme.textMuted, marginTop: 2 }}>
                  Varsayılan depo olarak seçilir ve stok işlemlerinde ilk sırada gelir.
                </Text>
              </View>
              <Switch
                value={form.isDefault}
                onValueChange={v => update('isDefault', v)}
                trackColor={{ false: theme.border, true: '#F59E0B' }}
                thumbColor="#fff"
              />
            </View>

            <TouchableOpacity
              style={{
                backgroundColor: theme.primary, borderRadius: BorderRadius.md,
                padding: Spacing.md, alignItems: 'center', opacity: mutation.isPending ? 0.7 : 1
              }}
              onPress={() => {
                if (!form.name.trim()) { Alert.alert('Hata', 'Depo adı zorunludur.'); return; }
                mutation.mutate();
              }}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: Typography.fontSize.base }}>
                  Depoyu Kaydet
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Depo Düzenleme Modalı ────────────────────────────────────────────────────
function EditWarehouseModal({ visible, warehouse, onClose, theme }: any) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [type, setType] = useState('MAIN');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  React.useEffect(() => {
    if (warehouse) {
      setName(warehouse.name || '');
      setType(warehouse.type || 'MAIN');
      setDescription(warehouse.description || '');
      setAddress(warehouse.address || '');
      setIsDefault(Boolean(warehouse.isDefault));
    }
  }, [warehouse]);

  const updateMutation = useMutation({
    mutationFn: () => warehouseAPI.update(warehouse.id, {
      name: name.trim(),
      type,
      description: description.trim(),
      address: address.trim(),
      isDefault,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      queryClient.invalidateQueries({ queryKey: ['warehouseStats'] });
      onClose();
      Alert.alert('✅ Başarılı', 'Depo bilgileri güncellendi.');
    },
    onError: (err: any) => Alert.alert('Hata', err?.response?.data?.error || err?.message || 'Depo güncellenemedi.'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => warehouseAPI.delete(warehouse.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      queryClient.invalidateQueries({ queryKey: ['warehouseStats'] });
      onClose();
      Alert.alert('✅ Başarılı', 'Depo silindi.');
    },
    onError: (err: any) => Alert.alert('Hata', err?.response?.data?.error || err?.message || 'Depo silinemedi.'),
  });

  const handleDelete = () => {
    if (warehouse.isDefault) {
      Alert.alert('Uyarı', 'Ana depo silinemez. Lütfen önce başka bir depoyu ana depo olarak belirleyin.');
      return;
    }
    Alert.alert(
      'Depoyu Sil',
      `"${warehouse.name}" deposunu silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`,
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Sil', style: 'destructive', onPress: () => deleteMutation.mutate() }
      ]
    );
  };

  if (!warehouse) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: theme.background }}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: theme.border }}>
            <View>
              <Text style={{ fontSize: Typography.fontSize.lg, fontWeight: '800', color: theme.textPrimary }}>
                ✏️ Depo Düzenle
              </Text>
              <Text style={{ fontSize: Typography.fontSize.xs, color: theme.textMuted }}>{warehouse.name}</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ color: theme.primary, fontWeight: '600' }}>İptal</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: Spacing.lg }} showsVerticalScrollIndicator={false}>
            {/* Sanayi Depo Tipi Seçimi */}
            <Text style={{ color: theme.textMuted, fontSize: Typography.fontSize.xs, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase' }}>
              Depo Tipi / Amacı *
            </Text>
            <View style={{ gap: Spacing.xs, marginBottom: Spacing.md }}>
              {Object.entries(WAREHOUSE_TYPES).map(([key, info]) => {
                const isSelected = type === key;
                return (
                  <TouchableOpacity
                    key={key}
                    onPress={() => setType(key)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: Spacing.sm,
                      borderRadius: BorderRadius.md,
                      borderWidth: isSelected ? 2 : 1,
                      borderColor: isSelected ? info.color : theme.border,
                      backgroundColor: isSelected ? info.color + '15' : theme.surface,
                      gap: Spacing.sm,
                    }}
                  >
                    <Text style={{ fontSize: 20 }}>{info.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: isSelected ? info.color : theme.textPrimary, fontWeight: '700', fontSize: Typography.fontSize.sm }}>
                        {info.label}
                      </Text>
                      <Text style={{ color: theme.textMuted, fontSize: Typography.fontSize.xs }}>
                        {info.desc}
                      </Text>
                    </View>
                    {isSelected && <CheckCircle2 size={18} color={info.color} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={{ color: theme.textMuted, fontSize: Typography.fontSize.xs, fontWeight: '700', marginBottom: 4, textTransform: 'uppercase' }}>
              Depo Adı *
            </Text>
            <TextInput
              style={{
                backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border,
                borderRadius: BorderRadius.md, padding: Spacing.md, color: theme.textPrimary,
                marginBottom: Spacing.md, fontSize: Typography.fontSize.base, fontWeight: '600'
              }}
              value={name}
              onChangeText={setName}
              placeholder="Depo adı..."
              placeholderTextColor={theme.textMuted}
            />

            <Text style={{ color: theme.textMuted, fontSize: Typography.fontSize.xs, fontWeight: '700', marginBottom: 4, textTransform: 'uppercase' }}>
              Açıklama
            </Text>
            <TextInput
              style={{
                backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border,
                borderRadius: BorderRadius.md, padding: Spacing.md, color: theme.textPrimary,
                marginBottom: Spacing.md
              }}
              value={description}
              onChangeText={setDescription}
              placeholder="Açıklama..."
              placeholderTextColor={theme.textMuted}
            />

            <Text style={{ color: theme.textMuted, fontSize: Typography.fontSize.xs, fontWeight: '700', marginBottom: 4, textTransform: 'uppercase' }}>
              Adres / Konum
            </Text>
            <TextInput
              style={{
                backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border,
                borderRadius: BorderRadius.md, padding: Spacing.md, color: theme.textPrimary,
                marginBottom: Spacing.lg, height: 75, textAlignVertical: 'top'
              }}
              multiline
              value={address}
              onChangeText={setAddress}
              placeholder="Adres / Konum..."
              placeholderTextColor={theme.textMuted}
            />

            {/* Ana Depo Switch */}
            <View style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              backgroundColor: isDefault ? '#F59E0B15' : theme.surface,
              borderWidth: 1.5, borderColor: isDefault ? '#F59E0B' : theme.border,
              borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.xl
            }}>
              <View style={{ flex: 1, paddingRight: Spacing.sm }}>
                <Text style={{ fontSize: Typography.fontSize.sm, fontWeight: '800', color: isDefault ? '#D97706' : theme.textPrimary }}>
                  ⭐ Ana Depo (Varsayılan) Yap
                </Text>
                <Text style={{ fontSize: Typography.fontSize.xs, color: theme.textMuted, marginTop: 2 }}>
                  {isDefault
                    ? 'Bu depo şu an sistemin birincil Ana Deposu durumundadır.'
                    : 'Açıldığında bu depo birincil ana depo olur ve eski ana deponun yerini alır.'}
                </Text>
              </View>
              <Switch
                value={isDefault}
                onValueChange={setIsDefault}
                trackColor={{ false: theme.border, true: '#F59E0B' }}
                thumbColor="#fff"
              />
            </View>

            <TouchableOpacity
              style={{
                backgroundColor: theme.primary, borderRadius: BorderRadius.md,
                padding: Spacing.md, alignItems: 'center', marginBottom: Spacing.md,
                opacity: updateMutation.isPending ? 0.7 : 1
              }}
              onPress={() => {
                if (!name.trim()) { Alert.alert('Hata', 'Depo adı boş olamaz.'); return; }
                updateMutation.mutate();
              }}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: Typography.fontSize.base }}>
                  Değişiklikleri Kaydet
                </Text>
              )}
            </TouchableOpacity>

            {!warehouse.isDefault && (
              <TouchableOpacity
                style={{
                  backgroundColor: theme.danger + '12', borderRadius: BorderRadius.md,
                  padding: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: theme.danger + '30',
                  opacity: deleteMutation.isPending ? 0.7 : 1
                }}
                onPress={handleDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
                  <ActivityIndicator color={theme.danger} />
                ) : (
                  <Text style={{ color: theme.danger, fontWeight: '700', fontSize: Typography.fontSize.sm }}>
                    🗑️ Bu Depoyu Sil
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Depo İçi Stok & Raf Detay Modalı (Sanayi Depo Envanter Görünümü) ─────────
function WarehouseInventoryModal({ visible, warehouse, onClose, theme }: any) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [editingShelfPart, setEditingShelfPart] = useState<any>(null);
  const [shelfInput, setShelfInput] = useState('');

  const { data: detailData, isLoading, refetch } = useQuery({
    queryKey: ['warehouse-detail', warehouse?.id],
    queryFn: () => warehouseAPI.getById(warehouse.id),
    enabled: Boolean(warehouse?.id && visible),
  });

  const detail = (detailData as any)?.data;
  const stocks: any[] = detail?.stocks || [];

  const typeInfo = WAREHOUSE_TYPES[warehouse?.type] || WAREHOUSE_TYPES.MAIN;

  const filteredStocks = useMemo(() => {
    if (!search.trim()) return stocks;
    const term = search.toLowerCase().trim();
    return stocks.filter((s: any) =>
      s.part?.name?.toLowerCase().includes(term) ||
      s.part?.brand?.toLowerCase().includes(term) ||
      s.part?.sku?.toLowerCase().includes(term) ||
      s.part?.oemCode?.toLowerCase().includes(term) ||
      s.shelfLocation?.toLowerCase().includes(term)
    );
  }, [stocks, search]);

  const shelfMutation = useMutation({
    mutationFn: () => warehouseAPI.updateShelfLocation({
      warehouseId: warehouse.id,
      partId: editingShelfPart.id,
      shelfLocation: shelfInput.trim(),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouse-detail', warehouse.id] });
      queryClient.invalidateQueries({ queryKey: ['parts'] });
      setEditingShelfPart(null);
      setShelfInput('');
      Alert.alert('✅ Başarılı', 'Raf/Göz konumu güncellendi.');
    },
    onError: (err: any) => Alert.alert('Hata', err?.response?.data?.error || err?.message || 'Güncellenemedi.'),
  });

  const handleOpenShelfEdit = (part: any, currentShelf: string) => {
    setEditingShelfPart(part);
    setShelfInput(currentShelf || '');
  };

  const [isExporting, setIsExporting] = useState(false);

  const handleExportExcel = async () => {
    if (!warehouse?.id) return;
    setIsExporting(true);
    try {
      await exportWarehouseToExcel(warehouse.id, warehouse.name);
    } finally {
      setIsExporting(false);
    }
  };

  if (!warehouse) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
        {/* Header */}
        <View style={{
          flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
          padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: theme.border
        }}>
          <View style={{ flex: 1, paddingRight: Spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 20 }}>{typeInfo.icon}</Text>
              <Text style={{ fontSize: Typography.fontSize.lg, fontWeight: '800', color: theme.textPrimary }} numberOfLines={1}>
                {warehouse.name}
              </Text>
            </View>
            <Text style={{ fontSize: Typography.fontSize.xs, color: typeInfo.color, fontWeight: '700', marginTop: 2 }}>
              {typeInfo.label} • {stocks.length} Kalem Parça Kayıtlı
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
            <TouchableOpacity
              onPress={handleExportExcel}
              disabled={isExporting}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                backgroundColor: '#10B98115',
                borderColor: '#10B981',
                borderWidth: 1.5,
                paddingHorizontal: Spacing.sm + 2,
                paddingVertical: 6,
                borderRadius: BorderRadius.md,
              }}
              activeOpacity={0.8}
            >
              {isExporting ? (
                <ActivityIndicator size="small" color="#10B981" />
              ) : (
                <>
                  <FileSpreadsheet size={15} color="#10B981" />
                  <Text style={{ color: '#10B981', fontWeight: '800', fontSize: Typography.fontSize.xs }}>
                    Excel İndir
                  </Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <X size={24} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Arama Barı */}
        <View style={{ padding: Spacing.md, paddingBottom: 0 }}>
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
            backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border,
            borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.md, height: 44
          }}>
            <Search size={18} color={theme.textMuted} />
            <TextInput
              style={{ flex: 1, color: theme.textPrimary, fontSize: Typography.fontSize.sm }}
              placeholder="🔍 Bu depodaki parça veya raf kodunu ara..."
              placeholderTextColor={theme.textMuted}
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <X size={16} color={theme.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Raf Konumu Düzenleme Barı (Varsa) */}
        {editingShelfPart && (
          <View style={{
            margin: Spacing.md,
            backgroundColor: '#6366F115',
            borderWidth: 1.5,
            borderColor: '#6366F1',
            borderRadius: BorderRadius.lg,
            padding: Spacing.md,
            gap: Spacing.xs,
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: Typography.fontSize.xs, fontWeight: '800', color: '#6366F1', textTransform: 'uppercase' }}>
                📍 Raf / Göz Konumu Düzenle
              </Text>
              <TouchableOpacity onPress={() => setEditingShelfPart(null)}>
                <Text style={{ color: theme.textMuted, fontSize: 12 }}>İptal</Text>
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: Typography.fontSize.sm, fontWeight: '700', color: theme.textPrimary }}>
              {editingShelfPart.name}
            </Text>
            <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: 4 }}>
              <TextInput
                style={{
                  flex: 1,
                  backgroundColor: theme.surface,
                  borderWidth: 1,
                  borderColor: theme.border,
                  borderRadius: BorderRadius.md,
                  paddingHorizontal: Spacing.sm,
                  paddingVertical: 6,
                  color: theme.textPrimary,
                  fontSize: Typography.fontSize.sm,
                }}
                value={shelfInput}
                onChangeText={setShelfInput}
                placeholder="Örn: Raf A-3 / Göz 12 / Kat 2"
                placeholderTextColor={theme.textMuted}
              />
              <TouchableOpacity
                onPress={() => shelfMutation.mutate()}
                style={{
                  backgroundColor: '#6366F1',
                  borderRadius: BorderRadius.md,
                  paddingHorizontal: Spacing.md,
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: Typography.fontSize.xs }}>Kaydet</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Parça Listesi */}
        {isLoading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        ) : (
          <FlatList
            data={filteredStocks}
            keyExtractor={s => s.id}
            contentContainerStyle={{ padding: Spacing.md, paddingBottom: 40, gap: Spacing.sm }}
            refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={theme.primary} />}
            renderItem={({ item: ws }) => {
              const p = ws.part;
              const shelf = ws.shelfLocation || p?.warehouseLocation || '';
              const isZero = ws.quantity === 0;

              return (
                <View
                  style={{
                    backgroundColor: theme.surface,
                    borderRadius: BorderRadius.lg,
                    borderWidth: 1,
                    borderColor: isZero ? theme.danger + '30' : theme.border,
                    padding: Spacing.md,
                    ...Shadows.sm,
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1, paddingRight: Spacing.sm }}>
                      <Text style={{ fontSize: Typography.fontSize.base, fontWeight: '700', color: theme.textPrimary }}>
                        {p?.name}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
                        {p?.brand && (
                          <Text style={{ fontSize: Typography.fontSize.xs, color: theme.textSecondary, fontWeight: '600' }}>
                            {p.brand}
                          </Text>
                        )}
                        {p?.sku && (
                          <Text style={{ fontSize: 11, color: theme.textMuted }}>
                            SKU: {p.sku}
                          </Text>
                        )}
                        {p?.oemCode && (
                          <Text style={{ fontSize: 11, color: theme.textMuted }}>
                            OEM: {p.oemCode}
                          </Text>
                        )}
                      </View>
                    </View>

                    {/* Miktar */}
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{
                        fontSize: Typography.fontSize.lg,
                        fontWeight: '800',
                        color: isZero ? theme.danger : theme.success
                      }}>
                        {ws.quantity} {p?.unit}
                      </Text>
                      <Text style={{ fontSize: 10, color: theme.textMuted }}>bu depoda</Text>
                    </View>
                  </View>

                  {/* Raf Konumu & Hızlı Eylemler */}
                  <View style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: Spacing.sm,
                    paddingTop: Spacing.sm,
                    borderTopWidth: 1,
                    borderTopColor: theme.borderLight || theme.border,
                  }}>
                    {/* Raf Konumu Rozeti */}
                    <TouchableOpacity
                      onPress={() => handleOpenShelfEdit(p, shelf)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        backgroundColor: shelf ? '#6366F115' : theme.background,
                        borderWidth: 1,
                        borderColor: shelf ? '#6366F140' : theme.border,
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: BorderRadius.md,
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={{ fontSize: 11, color: shelf ? '#6366F1' : theme.textMuted, fontWeight: '700' }}>
                        📍 {shelf ? `Raf: ${shelf}` : 'Raf Konumu Ata +'}
                      </Text>
                    </TouchableOpacity>

                    {/* Parça Detayı Butonu */}
                    <TouchableOpacity
                      onPress={() => {
                        onClose();
                        router.push(`/parts/${p?.id}` as any);
                      }}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}
                    >
                      <Text style={{ fontSize: Typography.fontSize.xs, color: theme.primary, fontWeight: '700' }}>
                        Detay
                      </Text>
                      <ChevronRight size={14} color={theme.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', paddingTop: 40 }}>
                <Text style={{ fontSize: 48, marginBottom: Spacing.sm }}>🔍</Text>
                <Text style={{ fontSize: Typography.fontSize.base, fontWeight: '700', color: theme.textPrimary }}>
                  {search ? 'Aramayla eşleşen parça bulunamadı.' : 'Bu depoda henüz parça kaydı bulunmuyor.'}
                </Text>
                <Text style={{ fontSize: Typography.fontSize.xs, color: theme.textMuted, marginTop: 4, textAlign: 'center' }}>
                  Stok Girişi veya Depolar Arası Transfer yaparak bu depoya malzeme ekleyebilirsiniz.
                </Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

// ─── Ana Ekran ────────────────────────────────────────────────────────────────
export default function WarehousesScreen() {
  const { colors: theme } = useAppTheme();
  const { user } = useAuthStore();
  const isTechnician = isTechnicianRole(user?.role);
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [selectedWarehouseForEdit, setSelectedWarehouseForEdit] = useState<any>(null);
  const [selectedWarehouseForInventory, setSelectedWarehouseForInventory] = useState<any>(null);
  const [isExportingAll, setIsExportingAll] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehouseAPI.getAll(),
  });

  const warehouses: any[] = (data as any)?.data || [];

  const handleExportAll = async () => {
    setIsExportingAll(true);
    try {
      await exportAllWarehousesToExcel(user?.companyName || 'MotorTrack Servis');
    } finally {
      setIsExportingAll(false);
    }
  };

  // Hızlı 1-Tap Ana Depo Yap Mutation
  const setDefaultMutation = useMutation({
    mutationFn: (warehouseId: string) => warehouseAPI.update(warehouseId, { isDefault: true }),
    onSuccess: (_, warehouseId) => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      queryClient.invalidateQueries({ queryKey: ['warehouseStats'] });
      const target = warehouses.find(w => w.id === warehouseId);
      Alert.alert('⭐ Ana Depo Güncellendi', `"${target?.name || 'Seçilen depo'}" artık varsayılan Ana Depo olarak ayarlandı.`);
    },
    onError: (err: any) => Alert.alert('Hata', err?.response?.data?.error || err?.message || 'Ana depo belirlenemedi.'),
  });

  const handleQuickSetDefault = (w: any) => {
    if (w.isDefault) return;
    Alert.alert(
      'Ana Depo Değişikliği',
      `"${w.name}" deposunu varsayılan Ana Depo yapmak istiyor musunuz?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: '⭐ Ana Depo Yap', onPress: () => setDefaultMutation.mutate(w.id) }
      ]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top']}>
      {/* ─── Header ─── */}
      <LinearGradient
        colors={[theme.primary, theme.primaryDark || '#312E81'] as [string, string]}
        style={{
          padding: Spacing.lg,
          borderBottomLeftRadius: BorderRadius.xl,
          borderBottomRightRadius: BorderRadius.xl,
          marginBottom: Spacing.md,
          ...Shadows.sm,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 6,
            marginBottom: Spacing.sm
          }}
        >
          <ArrowLeft size={18} color="rgba(255,255,255,0.85)" />
          <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: Typography.fontSize.sm, fontWeight: '600' }}>Geri</Text>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1, paddingRight: Spacing.sm }}>
            <Text style={{ fontSize: Typography.fontSize.xl, fontWeight: '800', color: '#fff' }}>
              📦 Depo Yönetimi
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: Typography.fontSize.xs, marginTop: 2 }}>
              Sanayi depoları, raflar ve stok durumları
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <TouchableOpacity
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 5,
                backgroundColor: 'rgba(16, 185, 129, 0.35)',
                borderRadius: BorderRadius.full, paddingHorizontal: Spacing.md - 2, paddingVertical: 8,
                borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)'
              }}
              onPress={handleExportAll}
              disabled={isExportingAll}
              activeOpacity={0.8}
            >
              {isExportingAll ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <FileSpreadsheet size={15} color="#fff" />
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: Typography.fontSize.xs }}>
                    Excel'e Aktar
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {!isTechnician && (
              <TouchableOpacity
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                  backgroundColor: 'rgba(255,255,255,0.25)',
                  borderRadius: BorderRadius.full, paddingHorizontal: Spacing.md, paddingVertical: 8,
                  borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)'
                }}
                onPress={() => setShowAdd(true)}
                activeOpacity={0.8}
              >
                <Plus size={16} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: Typography.fontSize.sm }}>Yeni Depo</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </LinearGradient>

      {/* ─── Depolar Listesi ─── */}
      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <FlatList
          data={warehouses}
          keyExtractor={i => i.id}
          contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: 60, gap: Spacing.md }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={theme.primary} />}
          renderItem={({ item }) => {
            const isMain = item.isDefault;
            const typeInfo = WAREHOUSE_TYPES[item.type] || WAREHOUSE_TYPES.MAIN;

            return (
              <TouchableOpacity
                onPress={() => setSelectedWarehouseForInventory(item)}
                activeOpacity={0.85}
                style={{
                  backgroundColor: theme.surface,
                  borderRadius: BorderRadius.xl,
                  borderWidth: isMain ? 2 : 1,
                  borderColor: isMain ? '#F59E0B' : theme.border,
                  padding: Spacing.md,
                  ...Shadows.sm,
                }}
              >
                {/* Üst Satır */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: BorderRadius.lg,
                        backgroundColor: typeInfo.color + '20',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 22 }}>{typeInfo.icon}</Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text style={{ fontSize: Typography.fontSize.base, fontWeight: '800', color: theme.textPrimary }}>
                          {item.name}
                        </Text>

                        {isMain && (
                          <View
                            style={{
                              backgroundColor: '#F59E0B20',
                              borderWidth: 1,
                              borderColor: '#F59E0B60',
                              paddingHorizontal: 8,
                              paddingVertical: 2,
                              borderRadius: BorderRadius.full,
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 3,
                            }}
                          >
                            <Star size={10} color="#D97706" fill="#D97706" />
                            <Text style={{ fontSize: 10, color: '#D97706', fontWeight: '800' }}>
                              ANA DEPO
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Sanayi Depo Türü Rozeti */}
                      <Text style={{ fontSize: Typography.fontSize.xs, color: typeInfo.color, fontWeight: '700', marginTop: 2 }}>
                        {typeInfo.label}
                      </Text>

                      {item.description ? (
                        <Text style={{ color: theme.textSecondary, fontSize: Typography.fontSize.xs, marginTop: 2 }}>
                          {item.description}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  {/* Düzenle Butonu (Sadece Admin / Manager) */}
                  {!isTechnician && (
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        setSelectedWarehouseForEdit(item);
                      }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        backgroundColor: theme.surfaceElevated || theme.background,
                        paddingHorizontal: Spacing.sm,
                        paddingVertical: 6,
                        borderRadius: BorderRadius.md,
                        borderWidth: 1,
                        borderColor: theme.border,
                      }}
                      activeOpacity={0.7}
                    >
                      <Edit3 size={13} color={theme.textPrimary} />
                      <Text style={{ fontSize: Typography.fontSize.xs, color: theme.textPrimary, fontWeight: '700' }}>
                        Düzenle
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Adres / Konum Bilgisi */}
                {item.address ? (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      marginTop: Spacing.sm,
                      paddingTop: Spacing.xs,
                    }}
                  >
                    <MapPin size={13} color={theme.textMuted} />
                    <Text style={{ color: theme.textMuted, fontSize: Typography.fontSize.xs, flex: 1 }}>
                      {item.address}
                    </Text>
                  </View>
                ) : null}

                {/* Alt Eylem Barı */}
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: Spacing.sm,
                    paddingTop: Spacing.sm,
                    borderTopWidth: 1,
                    borderTopColor: theme.borderLight || theme.border,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: Typography.fontSize.xs, color: theme.primary, fontWeight: '700' }}>
                      📦 {item._count?.stocks ?? 0} çeşit parça
                    </Text>

                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        exportWarehouseToExcel(item.id, item.name);
                      }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 3,
                        backgroundColor: '#10B98115',
                        borderWidth: 1,
                        borderColor: '#10B98135',
                        paddingHorizontal: 6,
                        paddingVertical: 2.5,
                        borderRadius: 4,
                      }}
                      activeOpacity={0.7}
                    >
                      <FileSpreadsheet size={11} color="#10B981" />
                      <Text style={{ fontSize: 10, color: '#10B981', fontWeight: '800' }}>Excel</Text>
                    </TouchableOpacity>
                  </View>

                  {isMain ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <CheckCircle2 size={14} color="#10B981" />
                      <Text style={{ fontSize: Typography.fontSize.xs, color: '#10B981', fontWeight: '700' }}>
                        Varsayılan Depo
                      </Text>
                    </View>
                  ) : !isTechnician ? (
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        handleQuickSetDefault(item);
                      }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        backgroundColor: '#F59E0B15',
                        borderWidth: 1,
                        borderColor: '#F59E0B40',
                        paddingHorizontal: Spacing.sm,
                        paddingVertical: 4,
                        borderRadius: BorderRadius.md,
                      }}
                      activeOpacity={0.7}
                    >
                      <Star size={12} color="#D97706" />
                      <Text style={{ fontSize: Typography.fontSize.xs, color: '#D97706', fontWeight: '700' }}>
                        ⭐ Ana Depo Yap
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Text style={{ fontSize: 64, marginBottom: Spacing.md }}>📦</Text>
              <Text style={{ fontSize: Typography.fontSize.lg, fontWeight: '700', color: theme.textPrimary, marginBottom: Spacing.sm }}>
                Kayıtlı Depo Bulunamadı
              </Text>
            </View>
          }
        />
      )}

      {/* Modallar */}
      <AddWarehouseModal visible={showAdd} onClose={() => setShowAdd(false)} theme={theme} />
      <EditWarehouseModal
        visible={Boolean(selectedWarehouseForEdit)}
        warehouse={selectedWarehouseForEdit}
        onClose={() => setSelectedWarehouseForEdit(null)}
        theme={theme}
      />
      <WarehouseInventoryModal
        visible={Boolean(selectedWarehouseForInventory)}
        warehouse={selectedWarehouseForInventory}
        onClose={() => setSelectedWarehouseForInventory(null)}
        theme={theme}
      />
    </SafeAreaView>
  );
}
