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

const VEHICLE_TYPES = [
  { value: 'CAR', label: '🚗 Araba / Kamyon' },
  { value: 'MOTOR', label: '🏍️ Motosiklet' },
];

const CAR_BRANDS = [
  { id: 'Volvo', label: 'Volvo' },
  { id: 'Scania', label: 'Scania' },
  { id: 'Mercedes-Benz', label: 'Mercedes-Benz' },
  { id: 'MAN', label: 'MAN' },
  { id: 'Ford', label: 'Ford' },
  { id: 'Renault', label: 'Renault' },
  { id: 'DAF', label: 'DAF' },
  { id: 'Iveco', label: 'Iveco' },
  { id: 'BMC', label: 'BMC' },
  { id: 'Isuzu', label: 'Isuzu' },
  { id: 'Fiat', label: 'Fiat' },
  { id: 'Volkswagen', label: 'Volkswagen' },
  { id: 'Mann', label: 'Mann' },
  { id: 'Bosch', label: 'Bosch' },
  { id: 'Gates', label: 'Gates' },
];

const MOTOR_BRANDS = [
  { id: 'Yamaha', label: 'Yamaha' },
  { id: 'Honda', label: 'Honda' },
  { id: 'Suzuki', label: 'Suzuki' },
  { id: 'Kawasaki', label: 'Kawasaki' },
  { id: 'Ducati', label: 'Ducati' },
  { id: 'BMW', label: 'BMW' },
  { id: 'Triumph', label: 'Triumph' },
  { id: 'KTM', label: 'KTM' },
  { id: 'Harley-Davidson', label: 'Harley-Davidson' },
];

export default function CreatePartScreen() {
  const queryClient = useQueryClient();
  const { motorId: preselectedMotorId } = useLocalSearchParams<{ motorId?: string }>();
  
  const { colors: theme } = useAppTheme();
  const dynamicStyles = useMemo(() => styles(theme), [theme]);

  const [form, setForm] = useState({
    name: '', vehicleType: 'CAR', brand: '', partNumber: '', category: '',
    quantity: '1', unit: 'adet', minQuantity: '0',
    purchasePrice: '', warehouseLocation: '',
    condition: 'NEW', motorId: preselectedMotorId || '', notes: '',
  });

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

  const brandOptions = form.vehicleType === 'CAR' ? CAR_BRANDS : MOTOR_BRANDS;

  const mutation = useMutation({
    mutationFn: () => partsAPI.create({
      ...form,
      quantity: parseInt(form.quantity) || 0,
      minQuantity: parseInt(form.minQuantity) || 0,
      purchasePrice: form.purchasePrice ? parseFloat(form.purchasePrice.replace(/\./g, '').replace(',', '.')) : undefined,
      motorId: form.motorId || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parts'] });
      queryClient.invalidateQueries({ queryKey: ['partStats'] });
      Alert.alert('Başarılı', 'Parça başarıyla eklendi!', [
        { text: 'Tamam', onPress: () => router.back() },
      ]);
    },
    onError: (err: any) => {
      Alert.alert('Hata', err?.message || 'Parça eklenirken hata oluştu.');
    },
  });

  const handleSubmit = () => {
    if (!form.name) { Alert.alert('Hata', 'Parça adı zorunludur.'); return; }
    if (parseInt(form.quantity) < 0) { Alert.alert('Hata', 'Miktar negatif olamaz.'); return; }
    mutation.mutate();
  };

  return (
    <SafeAreaView style={dynamicStyles.container} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={dynamicStyles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={dynamicStyles.backText}>← İptal</Text>
          </TouchableOpacity>
          <Text style={dynamicStyles.title}>Parça Ekle</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView contentContainerStyle={dynamicStyles.form} showsVerticalScrollIndicator={false}>
          {/* Temel Bilgiler */}
          <Text style={dynamicStyles.sectionLabel}>Parça Bilgileri</Text>
          <View style={dynamicStyles.card}>
            <InputField label="Parça Adı *" value={form.name} onChangeText={v => update('name', v)} placeholder="Yağ Filtresi, V Kayışı..." theme={theme} dynamicStyles={dynamicStyles} />
            
            {/* Marka Türü Seçimi */}
            <View style={dynamicStyles.typeToggleRow}>
              {VEHICLE_TYPES.map(vt => (
                <TouchableOpacity
                  key={vt.value}
                  style={[dynamicStyles.typeToggleBtn, form.vehicleType === vt.value && dynamicStyles.typeToggleBtnActive]}
                  onPress={() => {
                    update('vehicleType', vt.value);
                    update('brand', '');
                  }}
                >
                  <Text style={[dynamicStyles.typeToggleText, form.vehicleType === vt.value && dynamicStyles.typeToggleTextActive]}>
                    {vt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <SearchableSelect
              label="Marka"
              value={form.brand}
              options={brandOptions}
              onChange={v => update('brand', v)}
              placeholder="Marka seçin veya yazın..."
              allowCustomEntry
            />
            
            <InputField label="Parça Numarası (P/N)" value={form.partNumber} onChangeText={v => update('partNumber', v)} placeholder="P-00123" last theme={theme} dynamicStyles={dynamicStyles} />
          </View>

          {/* Kategori */}
          <Text style={dynamicStyles.sectionLabel}>Kategori</Text>
          <View style={dynamicStyles.card}>
            <View style={dynamicStyles.categoriesGrid}>
              {CATEGORIES.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[dynamicStyles.catBtn, form.category === c && dynamicStyles.catBtnActive]}
                  onPress={() => update('category', form.category === c ? '' : c)}
                >
                  <Text style={[dynamicStyles.catText, form.category === c && dynamicStyles.catTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Stok */}
          <Text style={dynamicStyles.sectionLabel}>Stok Bilgileri</Text>
          <View style={dynamicStyles.card}>
            <View style={dynamicStyles.row}>
              <View style={dynamicStyles.halfField}>
                <Text style={dynamicStyles.inputLabel}>Miktar *</Text>
                <TextInput
                  style={dynamicStyles.input}
                  value={form.quantity}
                  onChangeText={v => update('quantity', v)}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={theme.textMuted}
                />
              </View>
              <View style={[dynamicStyles.halfField, dynamicStyles.fieldBorder]}>
                <Text style={dynamicStyles.inputLabel}>Birim</Text>
                <TextInput
                  style={dynamicStyles.input}
                  value={form.unit}
                  onChangeText={v => update('unit', v)}
                  placeholder="adet, kg, m..."
                  placeholderTextColor={theme.textMuted}
                />
              </View>
            </View>
            <View style={[dynamicStyles.row, { borderTopWidth: 1, borderTopColor: theme.border }]}>
              <View style={dynamicStyles.halfField}>
                <Text style={dynamicStyles.inputLabel}>Min. Stok Eşiği</Text>
                <TextInput
                  style={dynamicStyles.input}
                  value={form.minQuantity}
                  onChangeText={v => update('minQuantity', v)}
                  keyboardType="numeric"
                  placeholder="5"
                  placeholderTextColor={theme.textMuted}
                />
              </View>
              <View style={[dynamicStyles.halfField, dynamicStyles.fieldBorder]}>
                <Text style={dynamicStyles.inputLabel}>Alış Fiyatı (₺)</Text>
                <TextInput
                  style={dynamicStyles.input}
                  value={form.purchasePrice}
                  onChangeText={v => {
                    let numeric = v.replace(/[^0-9,]/g, '');
                    const parts = numeric.split(',');
                    if (parts.length > 2) numeric = parts[0] + ',' + parts.slice(1).join('');
                    let [whole, decimal] = numeric.split(',');
                    whole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
                    update('purchasePrice', decimal !== undefined ? `${whole},${decimal}` : whole);
                  }}
                  keyboardType="decimal-pad"
                  placeholder="0,00"
                  placeholderTextColor={theme.textMuted}
                />
              </View>
            </View>
            <View style={[dynamicStyles.row, { borderTopWidth: 1, borderTopColor: theme.border }]}>
              <View style={{ flex: 1, padding: Spacing.md }}>
                <Text style={dynamicStyles.inputLabel}>Depo Konumu</Text>
                <TextInput
                  style={dynamicStyles.input}
                  value={form.warehouseLocation}
                  onChangeText={v => update('warehouseLocation', v)}
                  placeholder="A-Raf-3"
                  placeholderTextColor={theme.textMuted}
                />
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
                : <Text style={dynamicStyles.submitBtnText}>✅ Parçayı Kaydet</Text>
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
  halfField: { flex: 1, padding: Spacing.md },
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
