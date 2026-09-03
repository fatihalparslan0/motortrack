import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { listingsAPI, partsAPI } from '../../../src/api/client';
import { Colors, Typography, Spacing, BorderRadius } from '../../../src/constants/theme';

const CONDITIONS = [
  { value: 'NEW', label: '🟢 Sıfır' },
  { value: 'USED', label: '🟡 İkinci El' },
  { value: 'REFURBISHED', label: '🔵 Yenilenmiş' },
  { value: 'DAMAGED', label: '🔴 Hasarlı' },
];

export default function CreateListingScreen() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    title: '', description: '', price: '',
    quantity: '1', condition: 'USED', partId: '',
  });
  const update = (field: string, value: string) => setForm(p => ({ ...p, [field]: value }));

  const { data: partsData } = useQuery({
    queryKey: ['parts'],
    queryFn: () => partsAPI.getAll({ limit: 100 }),
  });
  const parts: any[] = (partsData as any)?.data || [];

  const mutation = useMutation({
    mutationFn: () => listingsAPI.create({
      ...form,
      price: parseFloat(form.price),
      quantity: parseInt(form.quantity) || 1,
      partId: form.partId || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myListings'] });
      Alert.alert('İlan Yayınlandı!', 'İlanınız 30 gün süreyle aktif kalacak.', [
        { text: 'Tamam', onPress: () => router.back() },
      ]);
    },
    onError: (err: any) => {
      Alert.alert('Hata', err?.message || 'İlan oluşturulurken hata oluştu.');
    },
  });

  const handleSubmit = () => {
    if (!form.title) { Alert.alert('Hata', 'İlan başlığı zorunludur.'); return; }
    if (!form.description) { Alert.alert('Hata', 'Açıklama zorunludur.'); return; }
    if (!form.price || parseFloat(form.price) <= 0) { Alert.alert('Hata', 'Geçerli bir fiyat girin.'); return; }
    mutation.mutate();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>← İptal</Text>
          </TouchableOpacity>
          <Text style={styles.title}>İlan Ver</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView contentContainerStyle={styles.form} showsVerticalScrollIndicator={false}>
          <View style={styles.infoBanner}>
            <Text style={styles.infoText}>📢 İlanınız 30 gün aktif kalır. Diğer şirketler sizinle mesajlaşabilir.</Text>
          </View>

          <Text style={styles.sectionLabel}>İlan Bilgileri</Text>
          <View style={styles.card}>
            <InputField label="İlan Başlığı *" value={form.title} onChangeText={v => update('title', v)} placeholder="2020 Volvo D13 Yağ Filtresi" />
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Açıklama *</Text>
              <TextInput
                style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                value={form.description}
                onChangeText={v => update('description', v)}
                placeholder="Parçanın detaylarını açıklayın..."
                placeholderTextColor={Colors.textMuted}
                multiline
              />
            </View>
            <View style={[styles.row, { borderTopWidth: 1, borderTopColor: Colors.border }]}>
              <View style={styles.halfField}>
                <Text style={styles.inputLabel}>Fiyat (₺) *</Text>
                <TextInput style={styles.input} value={form.price} onChangeText={v => update('price', v)} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={Colors.textMuted} />
              </View>
              <View style={[styles.halfField, styles.fieldBorder]}>
                <Text style={styles.inputLabel}>Adet</Text>
                <TextInput style={styles.input} value={form.quantity} onChangeText={v => update('quantity', v)} keyboardType="numeric" placeholder="1" placeholderTextColor={Colors.textMuted} />
              </View>
            </View>
          </View>

          <Text style={styles.sectionLabel}>Parça Durumu</Text>
          <View style={styles.card}>
            <View style={styles.conditionsGrid}>
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

          {parts.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Envanterden Parça Seç (Opsiyonel)</Text>
              <View style={styles.card}>
                <TouchableOpacity
                  style={[styles.partOption, !form.partId && { backgroundColor: Colors.primary + '10' }]}
                  onPress={() => update('partId', '')}
                >
                  <Text style={[styles.partOptionText, !form.partId && { color: Colors.primary }]}>
                    {!form.partId ? '✅' : '○'} Envanterden seçme
                  </Text>
                </TouchableOpacity>
                {parts.slice(0, 8).map((p: any) => (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.partOption, form.partId === p.id && { backgroundColor: Colors.primary + '10' },
                      { borderTopWidth: 1, borderTopColor: Colors.border }]}
                    onPress={() => {
                      update('partId', form.partId === p.id ? '' : p.id);
                      if (!form.title) update('title', p.name);
                    }}
                  >
                    <Text style={[styles.partOptionText, form.partId === p.id && { color: Colors.primary }]}>
                      {form.partId === p.id ? '✅' : '🔩'} {p.name} {p.brand ? `(${p.brand})` : ''} — {p.quantity} {p.unit}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          <TouchableOpacity
            style={[styles.submitBtn, mutation.isPending && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={mutation.isPending}
            activeOpacity={0.8}
          >
            <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.submitBtnInner}>
              {mutation.isPending
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.submitBtnText}>📢 İlanı Yayınla</Text>
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
  infoBanner: { backgroundColor: Colors.primary + '15', borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.primary + '30' },
  infoText: { color: Colors.primaryLight, fontSize: Typography.fontSize.sm },
  sectionLabel: { fontSize: Typography.fontSize.xs, fontWeight: '700', color: Colors.textSecondary, marginBottom: Spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  card: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.lg, overflow: 'hidden' },
  inputWrapper: { padding: Spacing.md },
  inputBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  inputLabel: { fontSize: Typography.fontSize.xs, color: Colors.textMuted, marginBottom: 4 },
  input: { fontSize: Typography.fontSize.base, color: Colors.textPrimary },
  row: { flexDirection: 'row' },
  halfField: { flex: 1, padding: Spacing.md },
  fieldBorder: { borderLeftWidth: 1, borderLeftColor: Colors.border },
  conditionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, padding: Spacing.md },
  condBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.border },
  condBtnActive: { backgroundColor: Colors.primary + '20', borderColor: Colors.primary },
  condText: { fontSize: Typography.fontSize.sm, color: Colors.textSecondary },
  condTextActive: { color: Colors.primary, fontWeight: '600' },
  partOption: { padding: Spacing.md },
  partOptionText: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm },
  submitBtn: { borderRadius: BorderRadius.lg, overflow: 'hidden', marginTop: Spacing.md },
  submitBtnInner: { padding: Spacing.md, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontSize: Typography.fontSize.base, fontWeight: '700' },
});
