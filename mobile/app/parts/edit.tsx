import React, { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { partsAPI, motorsAPI } from '../../src/api/client';
import { Typography, Spacing, BorderRadius } from '../../src/constants/theme';
import { useAppTheme } from '../../src/hooks/useAppTheme';

import { SearchableSelect, SelectOption } from '../../src/components/ui/SearchableSelect';

const CONDITIONS = [
  { value: 'NEW', label: '🟢 Sıfır' },
  { value: 'USED', label: '🟡 İkinci El' },
  { value: 'REFURBISHED', label: '🔵 Yenilenmiş' },
];

const CATEGORIES = ['Filtre', 'Motor', 'Transmisyon', 'Fren', 'Elektrik', 'Soğutma', 'Yakıt', 'Diğer'];

const UNITS = [
  { id: 'adet', label: 'adet' },
  { id: 'litre', label: 'litre' },
  { id: 'takım', label: 'takım' },
  { id: 'set', label: 'set' },
  { id: 'kg', label: 'kg' },
  { id: 'metre', label: 'metre' },
  { id: 'kutu', label: 'kutu' },
];

const PART_BRANDS = [
  { id: 'Bosch', label: 'Bosch' },
  { id: 'Valeo', label: 'Valeo' },
  { id: 'Mann Filter', label: 'Mann Filter' },
  { id: 'NGK', label: 'NGK' },
  { id: 'Delphi', label: 'Delphi' },
  { id: 'Brembo', label: 'Brembo' },
  { id: 'LUK', label: 'LUK' },
  { id: 'Sachs', label: 'Sachs' },
  { id: 'Varta', label: 'Varta' },
  { id: 'Mutlu Akü', label: 'Mutlu Akü' },
  { id: 'Gates', label: 'Gates' },
  { id: 'Castrol', label: 'Castrol' },
  { id: 'Motul', label: 'Motul' },
  { id: 'Mobil 1', label: 'Mobil 1' },
  { id: 'Mahle', label: 'Mahle' },
  { id: 'Hella', label: 'Hella' },
  { id: 'KYB', label: 'KYB' },
  { id: 'Monroe', label: 'Monroe' },
  { id: 'Aisin', label: 'Aisin' },
  { id: 'Denso', label: 'Denso' },
];

const COMMON_PARTS = [
  { id: 'Motor Yağı', label: 'Motor Yağı' },
  { id: 'Yağ Filtresi', label: 'Yağ Filtresi' },
  { id: 'Hava Filtresi', label: 'Hava Filtresi' },
  { id: 'Polen Filtresi', label: 'Polen Filtresi' },
  { id: 'Yakıt Filtresi', label: 'Yakıt Filtresi' },
  { id: 'Fren Balatası', label: 'Fren Balatası' },
  { id: 'Fren Diski', label: 'Fren Diski' },
  { id: 'Silecek Süpürgesi', label: 'Silecek Süpürgesi' },
  { id: 'Akü', label: 'Akü' },
  { id: 'Buji', label: 'Buji' },
  { id: 'Kızdırma Bujisi', label: 'Kızdırma Bujisi' },
  { id: 'Triger Seti', label: 'Triger Seti' },
  { id: 'V Kayışı', label: 'V Kayışı' },
  { id: 'Su Pompası (Devirdaim)', label: 'Su Pompası (Devirdaim)' },
  { id: 'Termostat', label: 'Termostat' },
  { id: 'Radyatör', label: 'Radyatör' },
  { id: 'Amortisör', label: 'Amortisör' },
  { id: 'Debriyaj Seti', label: 'Debriyaj Seti' },
  { id: 'Ateşleme Bobini', label: 'Ateşleme Bobini' },
  { id: 'Şanzıman Yağı', label: 'Şanzıman Yağı' },
  { id: 'Antifriz', label: 'Antifriz' },
  { id: 'Far Ampulü', label: 'Far Ampulü' }
];

export default function EditPartScreen() {
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  
  const { colors: theme } = useAppTheme();
  const dynamicStyles = useMemo(() => styles(theme), [theme]);

  const [form, setForm] = useState({
    name: '', brand: '', partNumber: '', category: '',
    quantity: '1', unit: 'adet', minQuantity: '0',
    purchasePrice: '', warehouseLocation: '',
    condition: 'NEW', motorId: '', notes: '',
  });

  const { data: partData, isLoading: isLoadingPart } = useQuery({
    queryKey: ['part', id],
    queryFn: () => partsAPI.getById(id),
    enabled: !!id,
  });

  React.useEffect(() => {
    if (partData?.data) {
      const p = partData.data;
      setForm({
        name: p.name || '',
        brand: p.brand || '',
        partNumber: p.partNumber || '',
        category: p.category || '',
        quantity: p.quantity?.toString() || '0',
        unit: p.unit || 'adet',
        minQuantity: p.minQuantity?.toString() || '0',
        purchasePrice: p.purchasePrice ? p.purchasePrice.toString().replace('.', ',') : '',
        warehouseLocation: p.warehouseLocation || '',
        condition: p.condition || 'NEW',
        motorId: p.motorId || '',
        notes: p.notes || '',
      });
    }
  }, [partData]);

  const update = (field: string, value: string) => setForm(p => ({ ...p, [field]: value }));

  const { data: motorsData } = useQuery({
    queryKey: ['motors'],
    queryFn: () => motorsAPI.getAll({ limit: 100 }),
  });
  
  const systemMotorsOptions: SelectOption[] = useMemo(() => {
    const data = (motorsData as any)?.data || [];
    return data.map((m: any) => ({
      id: m.id,
      label: `${m.brand} ${m.model}`,
      subtitle: `S/N: ${m.serialNumber}`,
      icon: '⚙️',
    }));
  }, [motorsData]);



  const mutation = useMutation({
    mutationFn: () => partsAPI.update(id, {
      ...form,
      quantity: parseInt(form.quantity) || 0,
      minQuantity: parseInt(form.minQuantity) || 0,
      purchasePrice: form.purchasePrice ? parseFloat(form.purchasePrice.replace(/\./g, '').replace(',', '.')) : null,
      motorId: form.motorId || null,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parts'] });
      queryClient.invalidateQueries({ queryKey: ['partStats'] });
      queryClient.invalidateQueries({ queryKey: ['part', id] });
      Alert.alert('Başarılı', 'Parça başarıyla güncellendi!', [
        { text: 'Tamam', onPress: () => router.back() },
      ]);
    },
    onError: (err: any) => {
      Alert.alert('Hata', err?.message || 'Parça güncellenirken hata oluştu.');
    },
  });

  const handleSubmit = () => {
    if (!form.name) { Alert.alert('Hata', 'Parça adı zorunludur.'); return; }
    if (parseInt(form.quantity) < 0) { Alert.alert('Hata', 'Miktar negatif olamaz.'); return; }
    mutation.mutate();
  };

  if (isLoadingPart) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={dynamicStyles.container} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={dynamicStyles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={dynamicStyles.backText}>← İptal</Text>
          </TouchableOpacity>
          <Text style={dynamicStyles.title}>Parçayı Düzenle</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView contentContainerStyle={dynamicStyles.form} showsVerticalScrollIndicator={false}>
          {/* Temel Bilgiler */}
          <Text style={dynamicStyles.sectionLabel}>Parça Bilgileri</Text>
          <View style={dynamicStyles.card}>
            <SearchableSelect
              label="Parça Adı *"
              value={form.name}
              options={COMMON_PARTS}
              onChange={v => update('name', v)}
              placeholder="Parça seçin veya yazın (Örn: Yağ Filtresi)"
              allowCustomEntry
            />
            
            <SearchableSelect
              label="Parça Markası"
              value={form.brand}
              options={PART_BRANDS}
              onChange={v => update('brand', v)}
              placeholder="Marka seçin veya yazın (Örn: Orijinal BMW)"
              allowCustomEntry
            />
            
            <InputField label="Parça Numarası (P/N)" value={form.partNumber} onChangeText={v => update('partNumber', v)} placeholder="P-00123" last theme={theme} dynamicStyles={dynamicStyles} />
          </View>

          {/* Kategori */}
          <Text style={dynamicStyles.sectionLabel}>Kategori</Text>
          <View style={dynamicStyles.card}>
            <SearchableSelect
              label="Kategori"
              value={form.category}
              options={CATEGORIES.map(c => ({ id: c, label: c }))}
              onChange={v => update('category', v)}
              placeholder="Filtre, Motor, vs..."
              allowCustomEntry
              last
            />
          </View>

          {/* Stok */}
          <Text style={dynamicStyles.sectionLabel}>Stok Bilgileri</Text>
          <View style={dynamicStyles.card}>
            <View style={dynamicStyles.row}>
              <View style={dynamicStyles.halfField}>
                <InputField label="Miktar *" value={form.quantity} onChangeText={v => update('quantity', v)} keyboardType="numeric" placeholder="0" last theme={theme} dynamicStyles={dynamicStyles} />
              </View>
              <View style={[dynamicStyles.halfField, dynamicStyles.fieldBorder]}>
                <SearchableSelect label="Birim" value={form.unit} options={UNITS} onChange={v => update('unit', v)} placeholder="adet, kg..." allowCustomEntry last />
              </View>
            </View>
            <View style={[dynamicStyles.row, { borderTopWidth: 1, borderTopColor: theme.border }]}>
              <View style={dynamicStyles.halfField}>
                <InputField label="Min. Stok Eşiği" value={form.minQuantity} onChangeText={v => update('minQuantity', v)} keyboardType="numeric" placeholder="5" last theme={theme} dynamicStyles={dynamicStyles} />
              </View>
              <View style={[dynamicStyles.halfField, dynamicStyles.fieldBorder]}>
                <InputField label="Alış Fiyatı (₺)" value={form.purchasePrice} onChangeText={v => {
                    let numeric = v.replace(/[^0-9,]/g, '');
                    const parts = numeric.split(',');
                    if (parts.length > 2) numeric = parts[0] + ',' + parts.slice(1).join('');
                    let [whole, decimal] = numeric.split(',');
                    whole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
                    update('purchasePrice', decimal !== undefined ? `${whole},${decimal}` : whole);
                  }} keyboardType="decimal-pad" placeholder="0,00" last theme={theme} dynamicStyles={dynamicStyles} />
              </View>
            </View>
            <View style={[dynamicStyles.row, { borderTopWidth: 1, borderTopColor: theme.border }]}>
              <View style={dynamicStyles.halfField}>
                <InputField label="Depo Konumu" value={form.warehouseLocation} onChangeText={v => update('warehouseLocation', v)} placeholder="A-Raf-3" last theme={theme} dynamicStyles={dynamicStyles} />
              </View>
            </View>
          </View>

          {/* Durum */}
          <Text style={dynamicStyles.sectionLabel}>Parça Durumu</Text>
          <View style={dynamicStyles.card}>
            <View style={dynamicStyles.conditionRow}>
              {CONDITIONS.map(c => (
                <TouchableOpacity
                  key={c.value}
                  style={[dynamicStyles.condBtn, form.condition === c.value && dynamicStyles.condBtnActive]}
                  onPress={() => update('condition', c.value)}
                >
                  <Text style={[dynamicStyles.condText, form.condition === c.value && dynamicStyles.condTextActive]}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Motora Bağla */}
          <Text style={dynamicStyles.sectionLabel}>Motora Bağla (Opsiyonel)</Text>
          <View style={dynamicStyles.card}>
            <SearchableSelect
              label="Motor"
              value={form.motorId}
              options={systemMotorsOptions}
              onChange={v => update('motorId', v)}
              placeholder="Envanterden motor seçin..."
              last
            />
          </View>

          <TouchableOpacity
            style={[dynamicStyles.submitBtn, mutation.isPending && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={mutation.isPending}
            activeOpacity={0.8}
          >
            <LinearGradient colors={['#6366F1', '#4F46E5']} style={dynamicStyles.submitBtnInner}>
              {mutation.isPending
                ? <ActivityIndicator color="#fff" />
                : <Text style={dynamicStyles.submitBtnText}>✅ Değişiklikleri Kaydet</Text>
              }
            </LinearGradient>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function InputField({ label, last = false, theme, dynamicStyles, ...props }: any) {
  return (
    <View style={[dynamicStyles.inputWrapper, !last && dynamicStyles.inputBorder]}>
      <Text style={dynamicStyles.inputLabel}>{label}</Text>
      <TextInput style={dynamicStyles.input} placeholderTextColor={theme.textMuted} {...props} />
    </View>
  );
}

const styles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg },
  backText: { color: theme.primary, fontSize: Typography.fontSize.base },
  title: { fontSize: Typography.fontSize.lg, fontWeight: '700', color: theme.textPrimary },
  form: { padding: Spacing.lg },
  sectionLabel: { fontSize: Typography.fontSize.xs, fontWeight: '700', color: theme.textSecondary, marginBottom: Spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  card: { backgroundColor: theme.surface, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: theme.border, marginBottom: Spacing.lg, overflow: 'hidden' },
  inputWrapper: { padding: Spacing.md },
  inputBorder: { borderBottomWidth: 1, borderBottomColor: theme.border },
  inputLabel: { fontSize: Typography.fontSize.xs, color: theme.textMuted, marginBottom: 4 },
  input: { fontSize: Typography.fontSize.base, color: theme.textPrimary },
  row: { flexDirection: 'row' },
  halfField: { flex: 1 },
  fieldBorder: { borderLeftWidth: 1, borderLeftColor: theme.border },
  
  typeToggleRow: { flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.border },
  typeToggleBtn: { flex: 1, paddingVertical: Spacing.md, alignItems: 'center', backgroundColor: theme.surface },
  typeToggleBtnActive: { backgroundColor: theme.primary + '15' },
  typeToggleText: { fontSize: Typography.fontSize.sm, color: theme.textSecondary, fontWeight: '500' },
  typeToggleTextActive: { color: theme.primary, fontWeight: '700' },
  
  categoriesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, padding: Spacing.md },
  catBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: theme.border },
  catBtnActive: { backgroundColor: theme.primary + '20', borderColor: theme.primary },
  catText: { fontSize: Typography.fontSize.xs, color: theme.textSecondary },
  catTextActive: { color: theme.primary, fontWeight: '600' },
  conditionRow: { flexDirection: 'row', padding: Spacing.sm, gap: Spacing.sm },
  condBtn: { flex: 1, paddingVertical: Spacing.sm, alignItems: 'center', borderRadius: BorderRadius.md, borderWidth: 1, borderColor: theme.border },
  condBtnActive: { backgroundColor: theme.primary + '20', borderColor: theme.primary },
  condText: { fontSize: Typography.fontSize.xs, color: theme.textSecondary },
  condTextActive: { color: theme.primary, fontWeight: '600' },
  submitBtn: { borderRadius: BorderRadius.lg, overflow: 'hidden', marginTop: Spacing.md },
  submitBtnInner: { padding: Spacing.md, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontSize: Typography.fontSize.base, fontWeight: '700' },
});
