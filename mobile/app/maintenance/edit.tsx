import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { maintenanceAPI } from '../../src/api/client';
import { Typography, Spacing, BorderRadius } from '../../src/constants/theme';
import { useAppTheme } from '../../src/hooks/useAppTheme';

import { DatePickerField } from '../../src/components/ui/DatePickerField';
import { SearchableSelect } from '../../src/components/ui/SearchableSelect';
import { formatPlateTR, POPULAR_BRANDS, getModelsForBrand } from '../../src/utils/vehicle';

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

const VEHICLE_TYPES = [
  { value: 'CAR', label: '🚗 Araba / Kamyon' },
  { value: 'MOTOR', label: '🏍️ Motosiklet' },
];

const CAR_BRANDS = POPULAR_BRANDS
  .filter(b => b.vehicleType === 'CAR' || b.vehicleType === 'BOTH')
  .map(b => ({ id: b.name, label: b.name, subtitle: b.category }));

const MOTOR_BRANDS = POPULAR_BRANDS
  .filter(b => b.vehicleType === 'MOTO' || b.vehicleType === 'BOTH')
  .map(b => ({ id: b.name, label: b.name, subtitle: b.category }));

const formatPhone = (val: string) => {
  const numeric = val.replace(/\D/g, '');
  let formatted = numeric;
  if (numeric.length > 0) {
    if (numeric.length <= 1) formatted = `${numeric}`;
    else if (numeric.length <= 4) formatted = `${numeric.slice(0,1)} (${numeric.slice(1)}`;
    else if (numeric.length <= 7) formatted = `${numeric.slice(0,1)} (${numeric.slice(1,4)}) ${numeric.slice(4)}`;
    else if (numeric.length <= 9) formatted = `${numeric.slice(0,1)} (${numeric.slice(1,4)}) ${numeric.slice(4,7)} ${numeric.slice(7)}`;
    else formatted = `${numeric.slice(0,1)} (${numeric.slice(1,4)}) ${numeric.slice(4,7)} ${numeric.slice(7,9)} ${numeric.slice(9,11)}`;
  }
  return formatted;
};

const formatCurrency = (val: string) => {
  let numeric = val.replace(/[^0-9,]/g, '');
  const parts = numeric.split(',');
  if (parts.length > 2) numeric = parts[0] + ',' + parts.slice(1).join('');
  let [whole, decimal] = numeric.split(',');
  whole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return decimal !== undefined ? `${whole},${decimal}` : whole;
};

export default function EditMaintenanceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: recordData, isLoading } = useQuery({
    queryKey: ['maintenance', id],
    queryFn: () => maintenanceAPI.getById(id),
  });

  const record: any = (recordData as any)?.data;

  const [form, setForm] = useState({
    title: '', description: '',
    customerName: '', customerPhone: '', 
    vehicleType: 'CAR', plate: '', brand: '', model: '',
    maintenanceType: 'PREVENTIVE', status: 'COMPLETED',
    cost: '', performedAt: new Date().toISOString().split('T')[0],
    nextMaintenanceDate: '',
  });

  useEffect(() => {
    if (record) {
      // Parse customer info
      const customerParts = (record.customerInfo || '').split(' - ');
      const cName = customerParts[0] || '';
      const cPhone = customerParts[1] || '';

      // Parse vehicle info
      const info = record.vehicleInfo || '';
      let vType = 'CAR';
      if (info.startsWith('[Motor]')) vType = 'MOTOR';
      
      let remainder = info.replace('[Araba] ', '').replace('[Motor] ', '');
      let vPlate = '';
      const plateSplit = remainder.split(' - Plaka: ');
      if (plateSplit.length === 2) {
        vPlate = plateSplit[1];
        remainder = plateSplit[0];
      }
      const words = remainder.split(' ');
      let vBrand = words[0] || '';
      let vModel = words.slice(1).join(' ') || '';

      let costStr = '';
      if (record.cost) {
        let whole = record.cost.toString().split('.')[0];
        let dec = record.cost.toString().split('.')[1];
        whole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
        costStr = dec ? `${whole},${dec}` : whole;
      }

      setForm({
        title: record.title || '',
        description: record.description || '',
        customerName: cName,
        customerPhone: cPhone,
        vehicleType: vType,
        plate: vPlate,
        brand: vBrand,
        model: vModel,
        maintenanceType: record.maintenanceType || 'PREVENTIVE',
        status: record.status || 'COMPLETED',
        cost: costStr,
        performedAt: record.performedAt ? new Date(record.performedAt).toISOString().split('T')[0] : '',
        nextMaintenanceDate: record.nextMaintenanceDate ? new Date(record.nextMaintenanceDate).toISOString().split('T')[0] : '',
      });
    }
  }, [record]);

  const update = (field: string, value: string) => setForm(p => ({ ...p, [field]: value }));

  const brandOptions = form.vehicleType === 'CAR' ? CAR_BRANDS : MOTOR_BRANDS;
  const modelOptions = useMemo(() => {
    if (!form.brand) return [];
    return getModelsForBrand(form.brand).map(m => ({ id: m, label: m }));
  }, [form.brand]);

  const mutation = useMutation({
    mutationFn: () => {
      let compiledVehicleInfo = '';
      if (form.brand || form.model || form.plate) {
        const typeStr = form.vehicleType === 'CAR' ? 'Araba' : 'Motor';
        compiledVehicleInfo = `[${typeStr}] ${form.brand} ${form.model} - Plaka: ${form.plate}`;
      }
      
      let compiledCustomerInfo = '';
      if (form.customerName || form.customerPhone) {
        compiledCustomerInfo = `${form.customerName} - ${form.customerPhone}`;
      }
      
      const parsedCost = form.cost ? parseFloat(form.cost.replace(/\./g, '').replace(',', '.')) : undefined;

      return maintenanceAPI.update(id as string, {
        title: form.title,
        description: form.description,
        customerInfo: compiledCustomerInfo,
        vehicleInfo: compiledVehicleInfo,
        maintenanceType: form.maintenanceType,
        status: form.status,
        cost: parsedCost,
        performedAt: form.performedAt ? new Date(form.performedAt).toISOString() : null,
        nextMaintenanceDate: form.nextMaintenanceDate ? new Date(form.nextMaintenanceDate).toISOString() : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      queryClient.invalidateQueries({ queryKey: ['upcomingMaintenance'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance', id] });
      Alert.alert('Başarılı', 'Bakım kaydı güncellendi!', [
        { text: 'Tamam', onPress: () => router.back() },
      ]);
    },
    onError: (err: any) => {
      Alert.alert('Hata', err?.message || 'Bakım kaydı güncellenirken hata oluştu.');
    },
  });

  const { colors: theme } = useAppTheme();
  const dynamicStyles = useMemo(() => styles(theme), [theme]);

  const handleSubmit = () => {
    if (!form.title) {
      Alert.alert('Hata', 'Lütfen tamir başlığını giriniz.');
      return;
    }
    
    if (form.performedAt && form.nextMaintenanceDate) {
      const performed = new Date(form.performedAt);
      const next = new Date(form.nextMaintenanceDate);
      if (performed > next) {
        Alert.alert('Tarih Hatası', 'Teslim edilecek tarih, alınan tarihten daha önce olamaz (veya alınan tarih teslimden sonra olamaz). Lütfen tarihleri kontrol edin.');
        return;
      }
    }
    
    mutation.mutate();
  };

  if (isLoading) {
    return (
      <View style={[dynamicStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
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
          <Text style={dynamicStyles.title}>Tamir Ekle</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView contentContainerStyle={dynamicStyles.form} showsVerticalScrollIndicator={false}>
          
          {/* Müşteri */}
          <Text style={dynamicStyles.sectionLabel}>Müşteri Bilgileri</Text>
          <View style={dynamicStyles.card}>
            <InputField 
              label="Ad Soyad *" 
              value={form.customerName} 
              onChangeText={(v: string) => update('customerName', v)} 
              placeholder="Örn: Ahmet Yılmaz" 
              theme={theme} 
              dynamicStyles={dynamicStyles} 
            />
            <InputField 
              label="Telefon Numarası" 
              value={form.customerPhone} 
              onChangeText={(v: string) => update('customerPhone', formatPhone(v))} 
              placeholder="0 (5XX) XXX XX XX" 
              keyboardType="phone-pad"
              theme={theme} 
              dynamicStyles={dynamicStyles} 
              last
            />
          </View>
          
          {/* Araç */}
          <Text style={dynamicStyles.sectionLabel}>Araç Bilgileri</Text>
          <View style={dynamicStyles.card}>
            <View style={dynamicStyles.typeToggleRow}>
              {VEHICLE_TYPES.map(vt => (
                <TouchableOpacity
                  key={vt.value}
                  style={[dynamicStyles.typeToggleBtn, form.vehicleType === vt.value && dynamicStyles.typeToggleBtnActive]}
                  onPress={() => {
                    update('vehicleType', vt.value);
                    update('brand', '');
                    update('model', '');
                  }}
                >
                  <Text style={[dynamicStyles.typeToggleText, form.vehicleType === vt.value && dynamicStyles.typeToggleTextActive]}>
                    {vt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={dynamicStyles.row}>
              <View style={dynamicStyles.halfField}>
                <SearchableSelect
                  label="Marka"
                  value={form.brand}
                  options={brandOptions}
                  onChange={v => {
                    update('brand', v);
                    update('model', ''); // Reset model when brand changes
                  }}
                  placeholder="Seçiniz..."
                  allowCustomEntry
                />
              </View>
              <View style={[dynamicStyles.halfField, dynamicStyles.fieldBorder]}>
                <SearchableSelect
                  label="Model"
                  value={form.model}
                  options={modelOptions}
                  onChange={v => update('model', v)}
                  placeholder="Seçiniz..."
                  allowCustomEntry
                />
              </View>
            </View>
            <View style={[{ borderTopWidth: 1, borderTopColor: theme.border }, dynamicStyles.inputWrapper]}>
              <Text style={dynamicStyles.inputLabel}>Plaka (TR Standartı)</Text>
              <TextInput 
                style={dynamicStyles.input} 
                value={form.plate} 
                onChangeText={v => update('plate', formatPlateTR(v))} 
                placeholder="34 ABC 123" 
                placeholderTextColor={theme.textMuted} 
                autoCapitalize="characters"
                maxLength={11}
              />
            </View>
          </View>

          {/* Bakım Detayları */}
          <Text style={dynamicStyles.sectionLabel}>Tamir Detayları</Text>
          <View style={dynamicStyles.card}>
            <InputField label="Başlık *" value={form.title} onChangeText={(v: string) => update('title', v)} placeholder="Örn: Balata değişimi..." theme={theme} dynamicStyles={dynamicStyles} />
            <InputField label="Açıklama" value={form.description} onChangeText={(v: string) => update('description', v)} placeholder="Yapılan işlemler..." multiline theme={theme} dynamicStyles={dynamicStyles} />
            
            <View style={dynamicStyles.row}>
              <View style={dynamicStyles.halfField}>
                <Text style={dynamicStyles.inputLabel}>Maliyet (₺)</Text>
                <TextInput 
                  style={[dynamicStyles.input, { paddingHorizontal: Spacing.md, paddingBottom: Spacing.md }]} 
                  value={form.cost} 
                  onChangeText={v => update('cost', formatCurrency(v))} 
                  keyboardType="decimal-pad" 
                  placeholder="1.200,50" 
                  placeholderTextColor={theme.textMuted}
                />
            </View>
          </View>
          </View>

          <Text style={dynamicStyles.sectionLabel}>Zaman Planlaması</Text>
          <View style={dynamicStyles.card}>
            <DatePickerField
              label="Alınan Tarih"
              value={form.performedAt}
              onChange={(val: string) => update('performedAt', val)}
            />
            <View style={{ borderTopWidth: 1, borderTopColor: theme.border }}>
              <DatePickerField
                label="Teslim Edilecek Tarih"
                value={form.nextMaintenanceDate}
                onChange={(val: string) => update('nextMaintenanceDate', val)}
                last
              />
            </View>
          </View>

          {/* Bakım Türü */}
          <Text style={dynamicStyles.sectionLabel}>Tamir Türü</Text>
          <View style={dynamicStyles.card}>
            <View style={dynamicStyles.typesGrid}>
              {TYPES.map(t => (
                <TouchableOpacity
                  key={t.value}
                  style={[dynamicStyles.typeBtn, form.maintenanceType === t.value && dynamicStyles.typeBtnActive]}
                  onPress={() => update('maintenanceType', t.value)}
                >
                  <Text style={[dynamicStyles.typeText, form.maintenanceType === t.value && dynamicStyles.typeTextActive]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Durum */}
          <Text style={dynamicStyles.sectionLabel}>Durum</Text>
          <View style={dynamicStyles.card}>
            <View style={dynamicStyles.statusRow}>
              {STATUSES.map(s => (
                <TouchableOpacity
                  key={s.value}
                  style={[dynamicStyles.statusBtn, form.status === s.value && dynamicStyles.statusBtnActive]}
                  onPress={() => update('status', s.value)}
                >
                  <Text style={[dynamicStyles.statusText, form.status === s.value && dynamicStyles.statusTextActive]}>{s.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
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
                : <Text style={dynamicStyles.submitBtnText}>💾 Güncelle</Text>
              }
            </LinearGradient>
          </TouchableOpacity>
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function InputField({ label, last = false, noPadding = false, multiline = false, theme, dynamicStyles, ...props }: any) {
  return (
    <View style={[!noPadding && dynamicStyles.inputWrapper, !last && dynamicStyles.inputBorder]}>
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
  row: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: theme.border },
  halfField: { flex: 1 },
  fieldBorder: { borderLeftWidth: 1, borderLeftColor: theme.border },
  
  typeToggleRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: theme.border },
  typeToggleBtn: { flex: 1, paddingVertical: Spacing.md, alignItems: 'center', backgroundColor: theme.surface },
  typeToggleBtnActive: { backgroundColor: theme.primary + '15' },
  typeToggleText: { fontSize: Typography.fontSize.sm, color: theme.textSecondary, fontWeight: '500' },
  typeToggleTextActive: { color: theme.primary, fontWeight: '700' },
  
  typesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, padding: Spacing.md },
  typeBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: theme.border },
  typeBtnActive: { backgroundColor: theme.primary + '20', borderColor: theme.primary },
  typeText: { fontSize: Typography.fontSize.xs, color: theme.textSecondary },
  typeTextActive: { color: theme.primary, fontWeight: '600' },
  
  statusRow: { flexDirection: 'row', padding: Spacing.sm, gap: Spacing.sm },
  statusBtn: { flex: 1, paddingVertical: Spacing.sm, alignItems: 'center', borderRadius: BorderRadius.md, borderWidth: 1, borderColor: theme.border },
  statusBtnActive: { backgroundColor: theme.primary + '20', borderColor: theme.primary },
  statusText: { fontSize: Typography.fontSize.xs, color: theme.textSecondary },
  statusTextActive: { color: theme.primary, fontWeight: '600' },
  
  submitBtn: { borderRadius: BorderRadius.lg, overflow: 'hidden', marginTop: Spacing.md },
  submitBtnInner: { padding: Spacing.md, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontSize: Typography.fontSize.base, fontWeight: '700' },
});
