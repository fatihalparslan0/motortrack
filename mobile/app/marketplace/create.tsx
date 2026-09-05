import React, { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { listingsAPI, partsAPI } from '../../src/api/client';
import { Typography, Spacing, BorderRadius } from '../../src/constants/theme';
import { useAppTheme } from '../../src/hooks/useAppTheme';

const CONDITIONS = [
  { value: 'NEW', label: '🟢 Sıfır' },
  { value: 'USED', label: '🟡 İkinci El' },
  { value: 'REFURBISHED', label: '🔵 Yenilenmiş' },
  { value: 'DAMAGED', label: '🔴 Hasarlı' },
];

export default function CreateListingScreen() {
  const queryClient = useQueryClient();
  const { colors: theme } = useAppTheme();
  const dynamicStyles = useMemo(() => styles(theme), [theme]);

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
    <SafeAreaView style={dynamicStyles.container} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={dynamicStyles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={dynamicStyles.backText}>← İptal</Text>
          </TouchableOpacity>
          <Text style={dynamicStyles.title}>İlan Ver</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView contentContainerStyle={dynamicStyles.form} showsVerticalScrollIndicator={false}>
          <View style={dynamicStyles.infoBanner}>
            <Text style={dynamicStyles.infoText}>📢 İlanınız 30 gün aktif kalır. Diğer şirketler sizinle mesajlaşabilir.</Text>
          </View>

          <Text style={dynamicStyles.sectionLabel}>İlan Bilgileri</Text>
          <View style={dynamicStyles.card}>
            <InputField label="İlan Başlığı *" value={form.title} onChangeText={v => update('title', v)} placeholder="2020 Volvo D13 Yağ Filtresi" theme={theme} dynamicStyles={dynamicStyles} />
            <View style={dynamicStyles.inputWrapper}>
              <Text style={dynamicStyles.inputLabel}>Açıklama *</Text>
              <TextInput
                style={[dynamicStyles.input, { height: 100, textAlignVertical: 'top' }]}
                value={form.description}
                onChangeText={v => update('description', v)}
                placeholder="Parçanın detaylarını açıklayın..."
                placeholderTextColor={theme.textMuted}
                multiline
              />
            </View>
            <View style={[dynamicStyles.row, { borderTopWidth: 1, borderTopColor: theme.border }]}>
              <View style={dynamicStyles.halfField}>
                <Text style={dynamicStyles.inputLabel}>Fiyat (₺) *</Text>
                <TextInput style={dynamicStyles.input} value={form.price} onChangeText={v => update('price', v)} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={theme.textMuted} />
              </View>
              <View style={[dynamicStyles.halfField, dynamicStyles.fieldBorder]}>
                <Text style={dynamicStyles.inputLabel}>Adet</Text>
                <TextInput style={dynamicStyles.input} value={form.quantity} onChangeText={v => update('quantity', v)} keyboardType="numeric" placeholder="1" placeholderTextColor={theme.textMuted} />
              </View>
            </View>
          </View>

          <Text style={dynamicStyles.sectionLabel}>Parça Durumu</Text>
          <View style={dynamicStyles.card}>
            <View style={dynamicStyles.conditionsGrid}>
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

          {parts.length > 0 && (
            <>
              <Text style={dynamicStyles.sectionLabel}>Envanterden Parça Seç (Opsiyonel)</Text>
              <View style={dynamicStyles.card}>
                <TouchableOpacity
                  style={[dynamicStyles.partOption, !form.partId && { backgroundColor: theme.primary + '10' }]}
                  onPress={() => update('partId', '')}
                >
                  <Text style={[dynamicStyles.partOptionText, !form.partId && { color: theme.primary }]}>
                    {!form.partId ? '✅' : '○'} Envanterden seçme
                  </Text>
                </TouchableOpacity>
                {parts.slice(0, 8).map((p: any) => (
                  <TouchableOpacity
                    key={p.id}
                    style={[dynamicStyles.partOption, form.partId === p.id && { backgroundColor: theme.primary + '10' },
                      { borderTopWidth: 1, borderTopColor: theme.border }]}
                    onPress={() => {
                      update('partId', form.partId === p.id ? '' : p.id);
                      if (!form.title) update('title', p.name);
                    }}
                  >
                    <Text style={[dynamicStyles.partOptionText, form.partId === p.id && { color: theme.primary }]}>
                      {form.partId === p.id ? '✅' : '🔩'} {p.name} {p.brand ? `(${p.brand})` : ''} — {p.quantity} {p.unit}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          <TouchableOpacity
            style={[dynamicStyles.submitBtn, mutation.isPending && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={mutation.isPending}
            activeOpacity={0.8}
          >
            <LinearGradient colors={['#6366F1', '#4F46E5']} style={dynamicStyles.submitBtnInner}>
              {mutation.isPending
                ? <ActivityIndicator color="#fff" />
                : <Text style={dynamicStyles.submitBtnText}>📢 İlanı Yayınla</Text>
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
  infoBanner: { backgroundColor: theme.primary + '15', borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.lg, borderWidth: 1, borderColor: theme.primary + '30' },
  infoText: { color: theme.primaryLight, fontSize: Typography.fontSize.sm },
  sectionLabel: { fontSize: Typography.fontSize.xs, fontWeight: '700', color: theme.textSecondary, marginBottom: Spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  card: { backgroundColor: theme.surface, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: theme.border, marginBottom: Spacing.lg, overflow: 'hidden' },
  inputWrapper: { padding: Spacing.md },
  inputBorder: { borderBottomWidth: 1, borderBottomColor: theme.border },
  inputLabel: { fontSize: Typography.fontSize.xs, color: theme.textMuted, marginBottom: 4 },
  input: { fontSize: Typography.fontSize.base, color: theme.textPrimary },
  row: { flexDirection: 'row' },
  halfField: { flex: 1, padding: Spacing.md },
  fieldBorder: { borderLeftWidth: 1, borderLeftColor: theme.border },
  conditionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, padding: Spacing.md },
  condBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: theme.border },
  condBtnActive: { backgroundColor: theme.primary + '20', borderColor: theme.primary },
  condText: { fontSize: Typography.fontSize.sm, color: theme.textSecondary },
  condTextActive: { color: theme.primary, fontWeight: '600' },
  partOption: { padding: Spacing.md },
  partOptionText: { color: theme.textSecondary, fontSize: Typography.fontSize.sm },
  submitBtn: { borderRadius: BorderRadius.lg, overflow: 'hidden', marginTop: Spacing.md },
  submitBtnInner: { padding: Spacing.md, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontSize: Typography.fontSize.base, fontWeight: '700' },
});
