import React, { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { workOrderAPI } from '../../src/api/client';
import { Typography, Spacing, BorderRadius } from '../../src/constants/theme';
import { useAppTheme } from '../../src/hooks/useAppTheme';

const formatCurrency = (val: string) => {
  let numeric = val.replace(/[^0-9,]/g, '');
  const parts = numeric.split(',');
  if (parts.length > 2) numeric = parts[0] + ',' + parts.slice(1).join('');
  let [whole, decimal] = numeric.split(',');
  whole = (whole || '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return decimal !== undefined ? `${whole},${decimal}` : whole;
};

const formatPhone = (val: string) => {
  const numeric = val.replace(/\D/g, '');
  let formatted = numeric;
  if (numeric.length <= 1) formatted = numeric;
  else if (numeric.length <= 4) formatted = `${numeric.slice(0, 1)} (${numeric.slice(1)}`;
  else if (numeric.length <= 7) formatted = `${numeric.slice(0, 1)} (${numeric.slice(1, 4)}) ${numeric.slice(4)}`;
  else if (numeric.length <= 9) formatted = `${numeric.slice(0, 1)} (${numeric.slice(1, 4)}) ${numeric.slice(4, 7)} ${numeric.slice(7)}`;
  else formatted = `${numeric.slice(0, 1)} (${numeric.slice(1, 4)}) ${numeric.slice(4, 7)} ${numeric.slice(7, 9)} ${numeric.slice(9, 11)}`;
  return formatted;
};

export default function CreateWorkOrderScreen() {
  const queryClient = useQueryClient();
  const { colors: theme } = useAppTheme();
  const dynamicStyles = useMemo(() => styles(theme), [theme]);

  const [form, setForm] = useState({
    title: '',
    description: '',
    customerName: '',
    customerPhone: '',
    vehicleBrand: '',
    vehicleModel: '',
    plate: '',
    laborCost: '',
    notes: '',
  });

  const update = (field: string, value: string) => setForm(p => ({ ...p, [field]: value }));

  const mutation = useMutation({
    mutationFn: () => {
      const vehicleInfo = [form.vehicleBrand, form.vehicleModel, form.plate ? `Plaka: ${form.plate}` : '']
        .filter(Boolean).join(' ');
      const parsedLabor = form.laborCost
        ? parseFloat(form.laborCost.replace(/\./g, '').replace(',', '.'))
        : undefined;

      return workOrderAPI.create({
        title: form.title,
        description: form.description || undefined,
        customerName: form.customerName || undefined,
        customerPhone: form.customerPhone || undefined,
        vehicleInfo: vehicleInfo || undefined,
        laborCost: parsedLabor,
        notes: form.notes || undefined,
      });
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['workOrderStats'] });
      const orderId = res?.data?.id;
      Alert.alert('✅ Başarılı', 'İş emri oluşturuldu!', [
        { text: 'Detaya Git', onPress: () => router.replace(`/work-orders/${orderId}` as any) },
        { text: 'Geri Dön', onPress: () => router.back() },
      ]);
    },
    onError: (err: any) => Alert.alert('Hata', err?.message || 'İş emri oluşturulamadı.'),
  });

  const handleSubmit = () => {
    if (!form.title.trim()) { Alert.alert('Hata', 'Başlık zorunludur.'); return; }
    mutation.mutate();
  };

  return (
    <SafeAreaView style={dynamicStyles.container} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={dynamicStyles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={dynamicStyles.backText}>← İptal</Text>
          </TouchableOpacity>
          <Text style={dynamicStyles.title}>Yeni İş Emri</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView contentContainerStyle={dynamicStyles.form} showsVerticalScrollIndicator={false}>
          {/* Başlık */}
          <Text style={dynamicStyles.sectionLabel}>İş Emri Bilgileri</Text>
          <View style={dynamicStyles.card}>
            <InputField label="Başlık *" value={form.title} onChangeText={v => update('title', v)} placeholder="Örn: Balata değişimi + yağ bakımı" theme={theme} dynamicStyles={dynamicStyles} />
            <InputField label="Açıklama" value={form.description} onChangeText={v => update('description', v)} placeholder="Yapılacak işler..." multiline theme={theme} dynamicStyles={dynamicStyles} last />
          </View>

          {/* Müşteri */}
          <Text style={dynamicStyles.sectionLabel}>Müşteri Bilgileri</Text>
          <View style={dynamicStyles.card}>
            <InputField label="Ad Soyad" value={form.customerName} onChangeText={v => update('customerName', v)} placeholder="Ahmet Yılmaz" theme={theme} dynamicStyles={dynamicStyles} />
            <InputField label="Telefon" value={form.customerPhone} onChangeText={v => update('customerPhone', formatPhone(v))} placeholder="0 (5XX) XXX XX XX" keyboardType="phone-pad" theme={theme} dynamicStyles={dynamicStyles} last />
          </View>

          {/* Araç */}
          <Text style={dynamicStyles.sectionLabel}>Araç Bilgileri</Text>
          <View style={dynamicStyles.card}>
            <View style={dynamicStyles.row}>
              <View style={dynamicStyles.halfField}>
                <InputField label="Marka" value={form.vehicleBrand} onChangeText={v => update('vehicleBrand', v)} placeholder="Honda" theme={theme} dynamicStyles={dynamicStyles} last />
              </View>
              <View style={[dynamicStyles.halfField, dynamicStyles.fieldBorder]}>
                <InputField label="Model" value={form.vehicleModel} onChangeText={v => update('vehicleModel', v)} placeholder="PCX 125" theme={theme} dynamicStyles={dynamicStyles} last />
              </View>
            </View>
            <View style={{ borderTopWidth: 1, borderTopColor: theme.border }}>
              <InputField label="Plaka" value={form.plate} onChangeText={v => update('plate', v.toUpperCase())} placeholder="34 ABC 123" autoCapitalize="characters" theme={theme} dynamicStyles={dynamicStyles} last />
            </View>
          </View>

          {/* İşçilik */}
          <Text style={dynamicStyles.sectionLabel}>Maliyet</Text>
          <View style={dynamicStyles.card}>
            <InputField label="İşçilik Ücreti (₺)" value={form.laborCost} onChangeText={v => update('laborCost', formatCurrency(v))} placeholder="1.200,00" keyboardType="decimal-pad" theme={theme} dynamicStyles={dynamicStyles} />
            <InputField label="Not" value={form.notes} onChangeText={v => update('notes', v)} placeholder="Opsiyonel notlar..." multiline theme={theme} dynamicStyles={dynamicStyles} last />
          </View>

          <TouchableOpacity
            style={[dynamicStyles.submitBtn, mutation.isPending && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={mutation.isPending}
            activeOpacity={0.8}
          >
            <LinearGradient colors={[theme.primary, theme.primaryDark || '#4F46E5']} style={dynamicStyles.submitBtnInner}>
              {mutation.isPending
                ? <ActivityIndicator color="#fff" />
                : <Text style={dynamicStyles.submitBtnText}>✅ İş Emri Oluştur</Text>
              }
            </LinearGradient>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function InputField({ label, last = false, multiline = false, theme, dynamicStyles, ...props }: any) {
  return (
    <View style={[dynamicStyles.inputWrapper, !last && dynamicStyles.inputBorder]}>
      <Text style={dynamicStyles.inputLabel}>{label}</Text>
      <TextInput
        style={[dynamicStyles.input, multiline && { height: 80, textAlignVertical: 'top' }]}
        placeholderTextColor={theme.textMuted}
        multiline={multiline}
        {...props}
      />
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
  submitBtn: { borderRadius: BorderRadius.lg, overflow: 'hidden', marginTop: Spacing.md },
  submitBtnInner: { padding: Spacing.md, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontSize: Typography.fontSize.base, fontWeight: '700' },
});
