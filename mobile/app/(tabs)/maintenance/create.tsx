import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { maintenanceAPI, motorsAPI } from '../../../src/api/client';
import { Colors, Typography, Spacing, BorderRadius } from '../../../src/constants/theme';

const TYPES = [
  { value: 'PREVENTIVE', label: '🛡️ Önleyici' },
  { value: 'CORRECTIVE', label: '🔧 Düzeltici' },
  { value: 'INSPECTION', label: '🔍 Muayene' },
  { value: 'EMERGENCY', label: '🚨 Acil' },
  { value: 'OTHER', label: '📝 Diğer' },
];

const STATUSES = [
  { value: 'COMPLETED', label: '✅ Tamamlandı' },
  { value: 'IN_PROGRESS', label: '⏳ Devam Ediyor' },
  { value: 'PLANNED', label: '📅 Planlandı' },
];

export default function CreateMaintenanceScreen() {
  const queryClient = useQueryClient();
  const { motorId: preselectedMotorId } = useLocalSearchParams<{ motorId?: string }>();

  const [form, setForm] = useState({
    motorId: preselectedMotorId || '',
    title: '', description: '',
    maintenanceType: 'PREVENTIVE', status: 'COMPLETED',
    cost: '', performedAt: new Date().toISOString().split('T')[0],
    nextMaintenanceDate: '',
  });

  const update = (field: string, value: string) => setForm(p => ({ ...p, [field]: value }));

  const { data: motorsData } = useQuery({
    queryKey: ['motors'],
    queryFn: () => motorsAPI.getAll({ limit: 100 }),
  });
  const motors: any[] = (motorsData as any)?.data || [];

  const mutation = useMutation({
    mutationFn: () => maintenanceAPI.create({
      ...form,
      cost: form.cost ? parseFloat(form.cost) : undefined,
      performedAt: form.performedAt ? new Date(form.performedAt).toISOString() : undefined,
      nextMaintenanceDate: form.nextMaintenanceDate ? new Date(form.nextMaintenanceDate).toISOString() : undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      queryClient.invalidateQueries({ queryKey: ['upcomingMaintenance'] });
      Alert.alert('Başarılı', 'Bakım kaydı oluşturuldu!', [
        { text: 'Tamam', onPress: () => router.back() },
      ]);
    },
    onError: (err: any) => {
      Alert.alert('Hata', err?.message || 'Bakım kaydı eklenirken hata oluştu.');
    },
  });

  const handleSubmit = () => {
    if (!form.motorId) { Alert.alert('Hata', 'Lütfen bir motor seçin.'); return; }
    if (!form.title) { Alert.alert('Hata', 'Başlık zorunludur.'); return; }
    mutation.mutate();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>← İptal</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Bakım Ekle</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView contentContainerStyle={styles.form} showsVerticalScrollIndicator={false}>
          {/* Motor Seç */}
          <Text style={styles.sectionLabel}>Motor *</Text>
          <View style={styles.card}>
            {motors.length === 0 ? (
              <Text style={{ color: Colors.textMuted, padding: Spacing.md }}>Kayıtlı motor bulunamadı.</Text>
            ) : (
              motors.slice(0, 6).map((m: any) => (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.motorOption, form.motorId === m.id && styles.motorOptionActive,
                    motors.indexOf(m) > 0 && { borderTopWidth: 1, borderTopColor: Colors.border }]}
                  onPress={() => update('motorId', m.id)}
                >
                  <Text style={[styles.motorOptionText, form.motorId === m.id && styles.motorOptionTextActive]}>
                    {form.motorId === m.id ? '✅' : '⚙️'} {m.brand} {m.model} — {m.serialNumber}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </View>

          {/* Bakım Detayları */}
          <Text style={styles.sectionLabel}>Bakım Detayları</Text>
          <View style={styles.card}>
            <InputField label="Başlık *" value={form.title} onChangeText={v => update('title', v)} placeholder="Yağ değişimi, V kayışı değişimi..." />
            <InputField label="Açıklama" value={form.description} onChangeText={v => update('description', v)} placeholder="Yapılan işlemler..." multiline />
            <View style={styles.row}>
              <View style={styles.halfField}>
                <Text style={styles.inputLabel}>Maliyet (₺)</Text>
                <TextInput style={styles.input} value={form.cost} onChangeText={v => update('cost', v)} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={Colors.textMuted} />
              </View>
              <View style={[styles.halfField, styles.fieldBorder]}>
                <Text style={styles.inputLabel}>Tarih</Text>
                <TextInput style={styles.input} value={form.performedAt} onChangeText={v => update('performedAt', v)} placeholder="2024-01-15" placeholderTextColor={Colors.textMuted} />
              </View>
            </View>
            <View style={[{ borderTopWidth: 1, borderTopColor: Colors.border }, styles.inputWrapper]}>
              <Text style={styles.inputLabel}>Sonraki Bakım Tarihi</Text>
              <TextInput style={styles.input} value={form.nextMaintenanceDate} onChangeText={v => update('nextMaintenanceDate', v)} placeholder="2024-07-15" placeholderTextColor={Colors.textMuted} />
            </View>
          </View>

          {/* Bakım Türü */}
          <Text style={styles.sectionLabel}>Bakım Türü</Text>
          <View style={styles.card}>
            <View style={styles.typesGrid}>
              {TYPES.map(t => (
                <TouchableOpacity
                  key={t.value}
                  style={[styles.typeBtn, form.maintenanceType === t.value && styles.typeBtnActive]}
                  onPress={() => update('maintenanceType', t.value)}
                >
                  <Text style={[styles.typeText, form.maintenanceType === t.value && styles.typeTextActive]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Durum */}
          <Text style={styles.sectionLabel}>Durum</Text>
          <View style={styles.card}>
            <View style={styles.statusRow}>
              {STATUSES.map(s => (
                <TouchableOpacity
                  key={s.value}
                  style={[styles.statusBtn, form.status === s.value && styles.statusBtnActive]}
                  onPress={() => update('status', s.value)}
                >
                  <Text style={[styles.statusText, form.status === s.value && styles.statusTextActive]}>{s.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
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
                : <Text style={styles.submitBtnText}>✅ Bakımı Kaydet</Text>
              }
            </LinearGradient>
          </TouchableOpacity>
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function InputField({ label, last = false, multiline = false, ...props }: any) {
  return (
    <View style={[styles.inputWrapper, !last && styles.inputBorder]}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && { height: 80, textAlignVertical: 'top' }]}
        placeholderTextColor={Colors.textMuted}
        multiline={multiline}
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
  sectionLabel: { fontSize: Typography.fontSize.xs, fontWeight: '700', color: Colors.textSecondary, marginBottom: Spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  card: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.lg, overflow: 'hidden' },
  motorOption: { padding: Spacing.md },
  motorOptionActive: { backgroundColor: Colors.primary + '15' },
  motorOptionText: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm },
  motorOptionTextActive: { color: Colors.primary, fontWeight: '600' },
  inputWrapper: { padding: Spacing.md },
  inputBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  inputLabel: { fontSize: Typography.fontSize.xs, color: Colors.textMuted, marginBottom: 4 },
  input: { fontSize: Typography.fontSize.base, color: Colors.textPrimary },
  row: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: Colors.border },
  halfField: { flex: 1, padding: Spacing.md },
  fieldBorder: { borderLeftWidth: 1, borderLeftColor: Colors.border },
  typesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, padding: Spacing.md },
  typeBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.border },
  typeBtnActive: { backgroundColor: Colors.primary + '20', borderColor: Colors.primary },
  typeText: { fontSize: Typography.fontSize.xs, color: Colors.textSecondary },
  typeTextActive: { color: Colors.primary, fontWeight: '600' },
  statusRow: { flexDirection: 'row', padding: Spacing.sm, gap: Spacing.sm },
  statusBtn: { flex: 1, paddingVertical: Spacing.sm, alignItems: 'center', borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border },
  statusBtnActive: { backgroundColor: Colors.primary + '20', borderColor: Colors.primary },
  statusText: { fontSize: Typography.fontSize.xs, color: Colors.textSecondary },
  statusTextActive: { color: Colors.primary, fontWeight: '600' },
  submitBtn: { borderRadius: BorderRadius.lg, overflow: 'hidden', marginTop: Spacing.md },
  submitBtnInner: { padding: Spacing.md, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontSize: Typography.fontSize.base, fontWeight: '700' },
});
