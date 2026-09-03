import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { motorsAPI } from '../../../src/api/client';
import { Colors, Typography, Spacing, BorderRadius } from '../../../src/constants/theme';

const MOTOR_TYPES = [
  { value: 'AUTOMOTIVE', label: '🚗 Otomotiv' },
  { value: 'INDUSTRIAL', label: '🏭 Endüstriyel' },
  { value: 'MOTORCYCLE', label: '🏍️ Motosiklet' },
  { value: 'MARINE', label: '⛵ Deniz' },
  { value: 'AGRICULTURAL', label: '🚜 Tarım' },
  { value: 'OTHER', label: '⚙️ Diğer' },
];

const STATUSES = [
  { value: 'ACTIVE', label: '✅ Aktif' },
  { value: 'MAINTENANCE', label: '🔧 Bakımda' },
  { value: 'RETIRED', label: '📦 Emekli' },
];

export default function CreateMotorScreen() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    serialNumber: '',
    brand: '',
    model: '',
    motorType: 'AUTOMOTIVE',
    manufactureYear: '',
    location: '',
    notes: '',
    status: 'ACTIVE',
  });

  const update = (field: string, value: string) => setForm(p => ({ ...p, [field]: value }));

  const mutation = useMutation({
    mutationFn: () => motorsAPI.create(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['motors'] });
      queryClient.invalidateQueries({ queryKey: ['motorStats'] });
      Alert.alert('Başarılı', 'Motor başarıyla eklendi!', [
        { text: 'Tamam', onPress: () => router.back() },
      ]);
    },
    onError: (err: any) => {
      Alert.alert('Hata', err?.message || 'Motor eklenirken hata oluştu.');
    },
  });

  const handleSubmit = () => {
    if (!form.serialNumber || !form.brand || !form.model) {
      Alert.alert('Hata', 'Seri numarası, marka ve model zorunludur.');
      return;
    }
    mutation.mutate();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>← İptal</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Motor Ekle</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView contentContainerStyle={styles.form} showsVerticalScrollIndicator={false}>
          {/* Temel Bilgiler */}
          <Text style={styles.sectionLabel}>Temel Bilgiler</Text>
          <View style={styles.card}>
            <InputField label="Seri Numarası *" value={form.serialNumber} onChangeText={v => update('serialNumber', v)} placeholder="MTR-2024-001" />
            <InputField label="Marka *" value={form.brand} onChangeText={v => update('brand', v)} placeholder="Volvo, Mercedes, Bosch..." />
            <InputField label="Model *" value={form.model} onChangeText={v => update('model', v)} placeholder="D13, OM471..." />
            <InputField label="Üretim Yılı" value={form.manufactureYear} onChangeText={v => update('manufactureYear', v)} placeholder="2020" keyboardType="numeric" />
            <InputField label="Konum" value={form.location} onChangeText={v => update('location', v)} placeholder="A-1 Depo, Servis..." last />
          </View>

          {/* Motor Türü */}
          <Text style={styles.sectionLabel}>Motor Türü</Text>
          <View style={styles.card}>
            <View style={styles.optionsGrid}>
              {MOTOR_TYPES.map(t => (
                <TouchableOpacity
                  key={t.value}
                  style={[styles.optionBtn, form.motorType === t.value && styles.optionBtnActive]}
                  onPress={() => update('motorType', t.value)}
                >
                  <Text style={[styles.optionText, form.motorType === t.value && styles.optionTextActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Durum */}
          <Text style={styles.sectionLabel}>Durum</Text>
          <View style={styles.card}>
            <View style={styles.optionsRow}>
              {STATUSES.map(s => (
                <TouchableOpacity
                  key={s.value}
                  style={[styles.statusBtn, form.status === s.value && styles.statusBtnActive]}
                  onPress={() => update('status', s.value)}
                >
                  <Text style={[styles.statusText, form.status === s.value && styles.statusTextActive]}>
                    {s.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Notlar */}
          <Text style={styles.sectionLabel}>Notlar (Opsiyonel)</Text>
          <View style={styles.card}>
            <TextInput
              style={styles.textArea}
              placeholder="Motor hakkında ek bilgiler..."
              placeholderTextColor={Colors.textMuted}
              value={form.notes}
              onChangeText={v => update('notes', v)}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Kaydet */}
          <TouchableOpacity
            style={[styles.submitBtn, mutation.isPending && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={mutation.isPending}
            activeOpacity={0.8}
          >
            <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.submitBtnInner}>
              {mutation.isPending
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.submitBtnText}>✅ Motoru Kaydet</Text>
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
      <TextInput
        style={styles.input}
        placeholderTextColor={Colors.textMuted}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg },
  backText: { color: Colors.primary, fontSize: Typography.fontSize.base },
  title: { fontSize: Typography.fontSize.lg, fontWeight: '700', color: Colors.textPrimary },
  form: { padding: Spacing.lg },
  sectionLabel: { fontSize: Typography.fontSize.sm, fontWeight: '700', color: Colors.textSecondary, marginBottom: Spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  card: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.lg, overflow: 'hidden' },
  inputWrapper: { padding: Spacing.md },
  inputBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  inputLabel: { fontSize: Typography.fontSize.xs, color: Colors.textMuted, marginBottom: 4 },
  input: { fontSize: Typography.fontSize.base, color: Colors.textPrimary },
  textArea: { fontSize: Typography.fontSize.base, color: Colors.textPrimary, padding: Spacing.md, minHeight: 100 },
  optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, padding: Spacing.md },
  optionBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceElevated },
  optionBtnActive: { backgroundColor: Colors.primary + '20', borderColor: Colors.primary },
  optionText: { fontSize: Typography.fontSize.sm, color: Colors.textSecondary },
  optionTextActive: { color: Colors.primary, fontWeight: '600' },
  optionsRow: { flexDirection: 'row', padding: Spacing.sm, gap: Spacing.sm },
  statusBtn: { flex: 1, paddingVertical: Spacing.sm, alignItems: 'center', borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border },
  statusBtnActive: { backgroundColor: Colors.primary + '20', borderColor: Colors.primary },
  statusText: { fontSize: Typography.fontSize.xs, color: Colors.textSecondary },
  statusTextActive: { color: Colors.primary, fontWeight: '600' },
  submitBtn: { borderRadius: BorderRadius.lg, overflow: 'hidden', marginTop: Spacing.md },
  submitBtnInner: { padding: Spacing.md, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontSize: Typography.fontSize.base, fontWeight: '700' },
});
