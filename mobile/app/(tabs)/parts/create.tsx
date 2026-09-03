import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { partsAPI, motorsAPI } from '../../../src/api/client';
import { Colors, Typography, Spacing, BorderRadius } from '../../../src/constants/theme';

const CONDITIONS = [
  { value: 'NEW', label: '🟢 Sıfır' },
  { value: 'USED', label: '🟡 İkinci El' },
  { value: 'REFURBISHED', label: '🔵 Yenilenmiş' },
];

const CATEGORIES = ['Filtre', 'Motor', 'Transmisyon', 'Fren', 'Elektrik', 'Soğutma', 'Yakıt', 'Diğer'];

export default function CreatePartScreen() {
  const queryClient = useQueryClient();
  const { motorId: preselectedMotorId } = useLocalSearchParams<{ motorId?: string }>();

  const [form, setForm] = useState({
    name: '', brand: '', partNumber: '', category: '',
    quantity: '1', unit: 'adet', minQuantity: '0',
    purchasePrice: '', warehouseLocation: '',
    condition: 'NEW', motorId: preselectedMotorId || '', notes: '',
  });

  const update = (field: string, value: string) => setForm(p => ({ ...p, [field]: value }));

  const { data: motorsData } = useQuery({
    queryKey: ['motors'],
    queryFn: () => motorsAPI.getAll({ limit: 100 }),
  });
  const motors: any[] = (motorsData as any)?.data || [];

  const mutation = useMutation({
    mutationFn: () => partsAPI.create({
      ...form,
      quantity: parseInt(form.quantity) || 0,
      minQuantity: parseInt(form.minQuantity) || 0,
      purchasePrice: form.purchasePrice ? parseFloat(form.purchasePrice) : undefined,
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
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>← İptal</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Parça Ekle</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView contentContainerStyle={styles.form} showsVerticalScrollIndicator={false}>
          {/* Temel Bilgiler */}
          <Text style={styles.sectionLabel}>Parça Bilgileri</Text>
          <View style={styles.card}>
            <InputField label="Parça Adı *" value={form.name} onChangeText={v => update('name', v)} placeholder="Yağ Filtresi, V Kayışı..." />
            <InputField label="Marka" value={form.brand} onChangeText={v => update('brand', v)} placeholder="Mann, Bosch, Gates..." />
            <InputField label="Parça Numarası (P/N)" value={form.partNumber} onChangeText={v => update('partNumber', v)} placeholder="P-00123" last />
          </View>

          {/* Kategori */}
          <Text style={styles.sectionLabel}>Kategori</Text>
          <View style={styles.card}>
            <View style={styles.categoriesGrid}>
              {CATEGORIES.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[styles.catBtn, form.category === c && styles.catBtnActive]}
                  onPress={() => update('category', form.category === c ? '' : c)}
                >
                  <Text style={[styles.catText, form.category === c && styles.catTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Stok */}
          <Text style={styles.sectionLabel}>Stok Bilgileri</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.halfField}>
                <Text style={styles.inputLabel}>Miktar *</Text>
                <TextInput
                  style={styles.input}
                  value={form.quantity}
                  onChangeText={v => update('quantity', v)}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
              <View style={[styles.halfField, styles.fieldBorder]}>
                <Text style={styles.inputLabel}>Birim</Text>
                <TextInput
                  style={styles.input}
                  value={form.unit}
                  onChangeText={v => update('unit', v)}
                  placeholder="adet, kg, m..."
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
            </View>
            <View style={[styles.row, { borderTopWidth: 1, borderTopColor: Colors.border }]}>
              <View style={styles.halfField}>
                <Text style={styles.inputLabel}>Min. Stok Eşiği</Text>
                <TextInput
                  style={styles.input}
                  value={form.minQuantity}
                  onChangeText={v => update('minQuantity', v)}
                  keyboardType="numeric"
                  placeholder="5"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
              <View style={[styles.halfField, styles.fieldBorder]}>
                <Text style={styles.inputLabel}>Alış Fiyatı (₺)</Text>
                <TextInput
                  style={styles.input}
                  value={form.purchasePrice}
                  onChangeText={v => update('purchasePrice', v)}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
            </View>
            <View style={[styles.row, { borderTopWidth: 1, borderTopColor: Colors.border }]}>
              <View style={{ flex: 1, padding: Spacing.md }}>
                <Text style={styles.inputLabel}>Depo Konumu</Text>
                <TextInput
                  style={styles.input}
                  value={form.warehouseLocation}
                  onChangeText={v => update('warehouseLocation', v)}
                  placeholder="A-Raf-3"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
            </View>
          </View>

          {/* Durum */}
          <Text style={styles.sectionLabel}>Parça Durumu</Text>
          <View style={styles.card}>
            <View style={styles.conditionRow}>
              {CONDITIONS.map(c => (
                <TouchableOpacity
                  key={c.value}
                  style={[styles.condBtn, form.condition === c.value && styles.condBtnActive]}
                  onPress={() => update('condition', c.value)}
                >
                  <Text style={[styles.condText, form.condition === c.value && styles.condTextActive]}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Motora Bağla */}
          <Text style={styles.sectionLabel}>Motora Bağla (Opsiyonel)</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={[styles.motorSelectBtn, !form.motorId && styles.motorSelectBtnEmpty]}
              onPress={() => update('motorId', '')}
            >
              <Text style={styles.motorSelectText}>
                {form.motorId
                  ? motors.find(m => m.id === form.motorId)
                    ? `⚙️ ${motors.find(m => m.id === form.motorId).brand} ${motors.find(m => m.id === form.motorId).model}`
                    : '⚙️ Motor seçili'
                  : '📦 Depoda bekliyor (motora bağlı değil)'}
              </Text>
            </TouchableOpacity>
            {motors.slice(0, 5).map((m: any) => (
              <TouchableOpacity
                key={m.id}
                style={[styles.motorOption, form.motorId === m.id && styles.motorOptionActive]}
                onPress={() => update('motorId', form.motorId === m.id ? '' : m.id)}
              >
                <Text style={[styles.motorOptionText, form.motorId === m.id && styles.motorOptionTextActive]}>
                  ⚙️ {m.brand} {m.model} — {m.serialNumber}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, mutation.isPending && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={mutation.isPending}
            activeOpacity={0.8}
          >
            <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.submitBtnInner}>
              {mutation.isPending
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.submitBtnText}>✅ Parçayı Kaydet</Text>
              }
            </LinearGradient>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function InputField({ label, last = false, ...props }: any) {
  return (
    <View style={[styles.inputWrapper, !last && styles.inputBorder]}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput style={styles.input} placeholderTextColor={Colors.textMuted} {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg },
  backText: { color: Colors.primary, fontSize: Typography.fontSize.base },
  title: { fontSize: Typography.fontSize.lg, fontWeight: '700', color: Colors.textPrimary },
  form: { padding: Spacing.lg },
  sectionLabel: { fontSize: Typography.fontSize.xs, fontWeight: '700', color: Colors.textSecondary, marginBottom: Spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  card: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.lg, overflow: 'hidden' },
  inputWrapper: { padding: Spacing.md },
  inputBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  inputLabel: { fontSize: Typography.fontSize.xs, color: Colors.textMuted, marginBottom: 4 },
  input: { fontSize: Typography.fontSize.base, color: Colors.textPrimary },
  row: { flexDirection: 'row' },
  halfField: { flex: 1, padding: Spacing.md },
  fieldBorder: { borderLeftWidth: 1, borderLeftColor: Colors.border },
  categoriesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, padding: Spacing.md },
  catBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.border },
  catBtnActive: { backgroundColor: Colors.primary + '20', borderColor: Colors.primary },
  catText: { fontSize: Typography.fontSize.xs, color: Colors.textSecondary },
  catTextActive: { color: Colors.primary, fontWeight: '600' },
  conditionRow: { flexDirection: 'row', padding: Spacing.sm, gap: Spacing.sm },
  condBtn: { flex: 1, paddingVertical: Spacing.sm, alignItems: 'center', borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border },
  condBtnActive: { backgroundColor: Colors.primary + '20', borderColor: Colors.primary },
  condText: { fontSize: Typography.fontSize.xs, color: Colors.textSecondary },
  condTextActive: { color: Colors.primary, fontWeight: '600' },
  motorSelectBtn: { padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  motorSelectBtnEmpty: {},
  motorSelectText: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm },
  motorOption: { padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  motorOptionActive: { backgroundColor: Colors.primary + '10' },
  motorOptionText: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm },
  motorOptionTextActive: { color: Colors.primary },
  submitBtn: { borderRadius: BorderRadius.lg, overflow: 'hidden', marginTop: Spacing.md },
  submitBtnInner: { padding: Spacing.md, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontSize: Typography.fontSize.base, fontWeight: '700' },
});
