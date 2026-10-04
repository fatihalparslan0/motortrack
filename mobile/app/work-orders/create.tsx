import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
  Modal, FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { workOrderAPI, companiesAPI } from '../../src/api/client';
import { Typography, Spacing, BorderRadius } from '../../src/constants/theme';
import { useAppTheme } from '../../src/hooks/useAppTheme';
import { useAuthStore } from '../../src/store/auth.store';
import { User, Check, Sparkles, CheckCircle2, Search, ChevronRight, ChevronDown, Save } from 'lucide-react-native';
import {
  parseVehicleInfo,
  formatPlateTR,
  getCustomVehicles,
  saveCustomVehicleBrand,
  saveCustomVehicleModel,
  getMergedBrands,
  getModelsForBrand,
  VehicleBrandData,
  VehicleCategoryType,
} from '../../src/utils/vehicle';

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
  const { colors: theme, isDark } = useAppTheme();
  const dynamicStyles = useMemo(() => styles(theme, isDark), [theme, isDark]);

  const params = useLocalSearchParams<{
    plate?: string;
    customerName?: string;
    customerPhone?: string;
    vehicleBrand?: string;
    vehicleModel?: string;
    vehicleInfo?: string;
    title?: string;
    notes?: string;
    prefilled?: string;
  }>();

  const { user } = useAuthStore();
  const isManagerOrAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const { data: usersResponse } = useQuery({
    queryKey: ['companyUsers'],
    queryFn: () => companiesAPI.getUsers(),
    enabled: isManagerOrAdmin,
  });

  const staffList = useMemo(() => {
    const list = (usersResponse as any)?.data || [];
    return Array.isArray(list) ? list.filter((u: any) => u.isActive) : [];
  }, [usersResponse]);

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Marka & Model Modal State'leri
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [showModelModal, setShowModelModal] = useState(false);

  // Kalıcı Kayıtlı Özel Marka ve Modeller (AsyncStorage)
  const [customVehicles, setCustomVehicles] = useState<VehicleBrandData[]>([]);

  useEffect(() => {
    getCustomVehicles().then(data => {
      setCustomVehicles(data);
    });
  }, []);

  // Gelen parametreleri ve araç hafızasını ayrıştırıp varsayılan değerleri oluştur
  const initialForm = useMemo(() => {
    let brand = params.vehicleBrand || '';
    let model = params.vehicleModel || '';
    let plate = params.plate ? formatPlateTR(params.plate) : '';

    if (params.vehicleInfo) {
      const parsed = parseVehicleInfo(params.vehicleInfo, plate);
      if (!brand) brand = parsed.brand;
      if (!model) model = parsed.model;
      if (!plate) plate = formatPlateTR(parsed.plate);
    }

    const customerPhone = params.customerPhone ? formatPhone(params.customerPhone) : '';
    const customerName = params.customerName || '';

    let defaultTitle = params.title || '';
    if (!defaultTitle) {
      if (brand && model) {
        defaultTitle = `${brand} ${model} Bakım / Onarım`;
      } else if (brand) {
        defaultTitle = `${brand} Bakım / Onarım`;
      } else if (plate) {
        defaultTitle = `${plate} Servis Bakımı`;
      }
    }

    return {
      title: defaultTitle,
      description: '',
      customerName,
      customerPhone,
      vehicleBrand: brand,
      vehicleModel: model,
      plate,
      laborCost: '',
      notes: params.notes || '',
    };
  }, [params.plate, params.customerName, params.customerPhone, params.vehicleBrand, params.vehicleModel, params.vehicleInfo, params.title, params.notes]);

  const [form, setForm] = useState(initialForm);

  // Sayfa önceden açık kaldıysa parametreler değiştiğinde formu tazele
  useEffect(() => {
    if (params.plate || params.customerName || params.vehicleInfo) {
      setForm(initialForm);
    }
  }, [initialForm]);

  const update = (field: string, value: string) => setForm(p => ({ ...p, [field]: value }));

  // Tüm markalar (standart + kullanıcı tarafından kaydedilenler)
  const allMergedBrands = useMemo(() => {
    return getMergedBrands(customVehicles);
  }, [customVehicles]);

  // Seçili veya yazılan markaya ait modeller
  const availableModels = useMemo(() => {
    return getModelsForBrand(form.vehicleBrand, customVehicles);
  }, [form.vehicleBrand, customVehicles]);

  const currentBrandObj = useMemo(() => {
    if (!form.vehicleBrand) return null;
    return allMergedBrands.find(b => b.name.toLowerCase() === form.vehicleBrand.toLowerCase());
  }, [form.vehicleBrand, allMergedBrands]);

  const handleSelectBrand = (brand: string) => {
    update('vehicleBrand', brand);
    const models = getModelsForBrand(brand, customVehicles);
    // Model şu anki markada yoksa temizle
    if (models.length > 0 && form.vehicleModel && !models.includes(form.vehicleModel)) {
      update('vehicleModel', '');
    }
    // Başlığı otomatik güncelle
    if (!form.title || form.title.includes('Bakım') || form.title.includes('Servis')) {
      const platePart = form.plate ? ` (${form.plate})` : '';
      update('title', `${brand} Bakım / Onarım${platePart}`.trim());
    }
  };

  const handleSelectModel = (model: string) => {
    update('vehicleModel', model);
    if (!form.title || form.title.includes('Bakım') || form.title.includes('Servis')) {
      const brandPart = form.vehicleBrand ? `${form.vehicleBrand} ` : '';
      const platePart = form.plate ? ` (${form.plate})` : '';
      update('title', `${brandPart}${model} Bakım / Onarım${platePart}`.trim());
    }
  };

  const handleAddAndSelectBrand = async (brandName: string, vehicleType: VehicleCategoryType) => {
    const updated = await saveCustomVehicleBrand(brandName, vehicleType);
    setCustomVehicles(updated);
    handleSelectBrand(brandName);
    Alert.alert('✅ Marka Kaydedildi', `"${brandName}" markası sisteme kaydedildi ve sonraki tüm seçimlerinizde hazır olarak sunulacaktır.`);
  };

  const handleAddAndSelectModel = async (brandName: string, modelName: string) => {
    const targetBrand = brandName.trim() || 'Genel';
    const updated = await saveCustomVehicleModel(targetBrand, modelName);
    setCustomVehicles(updated);
    if (!form.vehicleBrand && targetBrand !== 'Genel') {
      handleSelectBrand(targetBrand);
    }
    handleSelectModel(modelName);
    Alert.alert('✅ Model Kaydedildi', `"${modelName}" modeli ${targetBrand} markası altına kaydedildi ve sonraki seçimler için hafızaya alındı.`);
  };

  const handlePlateChange = (val: string) => {
    const formatted = formatPlateTR(val);
    update('plate', formatted);
  };

  // Canlı plaka sorgulama (Kullanıcı manuel plaka girerken hafızada kayıt varsa öner)
  const cleanPlateForLookup = form.plate.trim().replace(/\s+/g, '').toUpperCase();
  const isPlateLongEnough = cleanPlateForLookup.length >= 5;

  const { data: plateLookupData } = useQuery({
    queryKey: ['plate-lookup', cleanPlateForLookup],
    queryFn: () => workOrderAPI.getPlateHistory(cleanPlateForLookup),
    enabled: isPlateLongEnough && params.prefilled !== 'true' && (!form.customerName || !form.vehicleBrand),
    staleTime: 30000,
  });

  const plateRecord = (plateLookupData as any)?.data;
  const isPlateFound = plateRecord?.found;

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
        userId: selectedUserId || undefined,
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
          {/* Plaka Hafızası Banner */}
          {Boolean(params.prefilled === 'true' || (params.plate && (params.customerName || params.vehicleInfo))) && (
            <View style={dynamicStyles.prefilledBanner}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                  <Sparkles size={16} color={isDark ? '#34D399' : '#059669'} />
                  <Text style={dynamicStyles.prefilledBannerTitle}>
                    Plaka Hafızasından Dolduruldu
                  </Text>
                </View>
                <View style={dynamicStyles.prefilledPlateBadge}>
                  <Text style={dynamicStyles.prefilledPlateBadgeText}>
                    {form.plate || params.plate}
                  </Text>
                </View>
              </View>
              <Text style={dynamicStyles.prefilledBannerSub}>
                Müşteri ve araç bilgileri servis geçmişinden otomatik olarak getirildi. Dilediğiniz alanları değiştirebilirsiniz.
              </Text>
            </View>
          )}

          {/* Başlık */}
          <Text style={dynamicStyles.sectionLabel}>İş Emri Bilgileri</Text>
          <View style={dynamicStyles.card}>
            <InputField label="Başlık *" value={form.title} onChangeText={v => update('title', v)} placeholder="Örn: Balata değişimi + yağ bakımı" theme={theme} dynamicStyles={dynamicStyles} />
            <InputField label="Açıklama" value={form.description} onChangeText={v => update('description', v)} placeholder="Yapılacak işler..." multiline theme={theme} dynamicStyles={dynamicStyles} last />
          </View>

          {/* Sorumlu Personel Atama (Yönetici / Müdür İçin) */}
          {isManagerOrAdmin && (
            <>
              <Text style={dynamicStyles.sectionLabel}>Sorumlu Personel / Teknisyen Atama</Text>
              <View style={[dynamicStyles.card, { padding: Spacing.sm }]}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                  <TouchableOpacity
                    style={[
                      dynamicStyles.staffChip,
                      selectedUserId === null && dynamicStyles.staffChipActive,
                    ]}
                    onPress={() => setSelectedUserId(null)}
                    activeOpacity={0.7}
                  >
                    <View style={[dynamicStyles.staffDot, selectedUserId === null && dynamicStyles.staffDotActive]} />
                    <Text style={[dynamicStyles.staffChipText, selectedUserId === null && dynamicStyles.staffChipTextActive]}>
                      🏢 Atölye Havuzu (Açıkta Beklet)
                    </Text>
                  </TouchableOpacity>

                  {staffList.map((staff: any) => {
                    const isSelected = selectedUserId === staff.id;
                    const roleLabel = staff.role === 'TECHNICIAN' ? 'Teknisyen' : staff.role === 'MANAGER' ? 'Müdür' : 'Yönetici';
                    return (
                      <TouchableOpacity
                        key={staff.id}
                        style={[
                          dynamicStyles.staffChip,
                          isSelected && dynamicStyles.staffChipActive,
                        ]}
                        onPress={() => setSelectedUserId(staff.id)}
                        activeOpacity={0.7}
                      >
                        <View style={[dynamicStyles.staffDot, isSelected && dynamicStyles.staffDotActive]} />
                        <Text style={[dynamicStyles.staffChipText, isSelected && dynamicStyles.staffChipTextActive]}>
                          👤 {staff.fullName} ({roleLabel})
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </>
          )}

          {/* Müşteri */}
          <Text style={dynamicStyles.sectionLabel}>Müşteri Bilgileri</Text>
          <View style={dynamicStyles.card}>
            <InputField label="Ad Soyad" value={form.customerName} onChangeText={v => update('customerName', v)} placeholder="Ahmet Yılmaz" theme={theme} dynamicStyles={dynamicStyles} />
            <InputField label="Telefon" value={form.customerPhone} onChangeText={v => update('customerPhone', formatPhone(v))} placeholder="0 (5XX) XXX XX XX" keyboardType="phone-pad" theme={theme} dynamicStyles={dynamicStyles} last />
          </View>

          {/* Araç Bilgileri (Marka, Model, Plaka) */}
          <Text style={dynamicStyles.sectionLabel}>Araç Bilgileri (Otomobil & Motosiklet)</Text>
          <View style={dynamicStyles.card}>
            {/* Marka Seçimi - Tıklayınca Liste Açılır */}
            <View style={{ padding: Spacing.md }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={dynamicStyles.inputLabel}>Marka</Text>
                <TouchableOpacity onPress={() => setShowBrandModal(true)}>
                  <Text style={{ fontSize: 11, color: theme.primary, fontWeight: '700' }}>
                    📋 Listeden Seç ▾
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Tıklanabilir Marka Seçim Kutusu */}
              <TouchableOpacity
                style={dynamicStyles.selectBox}
                onPress={() => setShowBrandModal(true)}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  {form.vehicleBrand ? (
                    <View>
                      <Text style={dynamicStyles.selectBoxValue}>{form.vehicleBrand}</Text>
                      {Boolean(currentBrandObj?.category) && (
                        <Text style={dynamicStyles.selectBoxSub}>{currentBrandObj?.category}</Text>
                      )}
                    </View>
                  ) : (
                    <Text style={dynamicStyles.selectBoxPlaceholder}>
                      🚗 🏍️ Marka seçmek için dokunun...
                    </Text>
                  )}
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {Boolean(form.vehicleBrand) && (
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        handleSelectBrand('');
                      }}
                      style={{ padding: 4 }}
                    >
                      <Text style={{ color: theme.textMuted, fontSize: 16, fontWeight: '700' }}>✕</Text>
                    </TouchableOpacity>
                  )}
                  <ChevronDown size={18} color={theme.primary} />
                </View>
              </TouchableOpacity>

              {/* Hızlı Popüler Marka Hapları (Araba & Motor) */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingTop: 10 }}>
                {['Fiat', 'Renault', 'Volkswagen', 'Ford', 'Toyota', 'Honda', 'Yamaha', 'Peugeot', 'BMW', 'Mercedes-Benz', 'Kawasaki', 'KTM', 'CFMOTO', 'Bajaj', 'Dacia'].map(b => {
                  const isSelected = form.vehicleBrand?.toLowerCase() === b.toLowerCase();
                  return (
                    <TouchableOpacity
                      key={b}
                      onPress={() => handleSelectBrand(b)}
                      style={[
                        dynamicStyles.quickChip,
                        isSelected && dynamicStyles.quickChipActive,
                      ]}
                    >
                      <Text style={[dynamicStyles.quickChipText, isSelected && dynamicStyles.quickChipTextActive]}>
                        {b}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Model Seçimi - Tıklayınca Liste Açılır */}
            <View style={{ borderTopWidth: 1, borderTopColor: theme.border, padding: Spacing.md }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={dynamicStyles.inputLabel}>Model</Text>
                <TouchableOpacity onPress={() => setShowModelModal(true)}>
                  <Text style={{ fontSize: 11, color: theme.primary, fontWeight: '700' }}>
                    {availableModels.length > 0 ? `📋 ${availableModels.length} Model Listede ▾` : '📋 Listeden Seç ▾'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Tıklanabilir Model Seçim Kutusu */}
              <TouchableOpacity
                style={dynamicStyles.selectBox}
                onPress={() => setShowModelModal(true)}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  {form.vehicleModel ? (
                    <Text style={dynamicStyles.selectBoxValue}>{form.vehicleModel}</Text>
                  ) : (
                    <Text style={dynamicStyles.selectBoxPlaceholder}>
                      {form.vehicleBrand ? `🔧 ${form.vehicleBrand} modeli seçmek için dokunun...` : '🔧 Model seçmek veya eklemek için dokunun...'}
                    </Text>
                  )}
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {Boolean(form.vehicleModel) && (
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        handleSelectModel('');
                      }}
                      style={{ padding: 4 }}
                    >
                      <Text style={{ color: theme.textMuted, fontSize: 16, fontWeight: '700' }}>✕</Text>
                    </TouchableOpacity>
                  )}
                  <ChevronDown size={18} color={theme.primary} />
                </View>
              </TouchableOpacity>

              {/* Seçili markaya ait hızlı model hapları */}
              {availableModels.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingTop: 10 }}>
                  {availableModels.slice(0, 10).map(m => {
                    const isSelected = form.vehicleModel?.toLowerCase() === m.toLowerCase();
                    return (
                      <TouchableOpacity
                        key={m}
                        onPress={() => handleSelectModel(m)}
                        style={[
                          dynamicStyles.quickChip,
                          isSelected && dynamicStyles.quickChipActive,
                        ]}
                      >
                        <Text style={[dynamicStyles.quickChipText, isSelected && dynamicStyles.quickChipTextActive]}>
                          {m}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </View>

            {/* Plaka (TR Standartlarında Görünüm ve Otomatik Formatlama) */}
            <View style={{ borderTopWidth: 1, borderTopColor: theme.border, padding: Spacing.md }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={dynamicStyles.inputLabel}>Plaka (TR Standartı)</Text>
                <Text style={{ fontSize: 10, color: theme.textMuted }}>Örn: 34 ABC 123</Text>
              </View>

              {/* Türk Plaka Çerçevesi */}
              <View style={dynamicStyles.plateContainer}>
                {/* Mavi TR Şeridi */}
                <View style={dynamicStyles.plateTrBadge}>
                  <Text style={dynamicStyles.plateTrText}>TR</Text>
                  <Text style={{ fontSize: 9 }}>🇹🇷</Text>
                </View>

                {/* Büyük Harf Standart Input */}
                <TextInput
                  style={dynamicStyles.plateInput}
                  value={form.plate}
                  onChangeText={handlePlateChange}
                  placeholder="34 ABC 123"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="characters"
                  maxLength={11}
                  returnKeyType="done"
                />

                {form.plate.length > 0 && (
                  <TouchableOpacity onPress={() => update('plate', '')} style={{ paddingHorizontal: 12 }}>
                    <Text style={{ color: '#94A3B8', fontSize: 16 }}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          {/* Manuel Plaka Yazarken Hafıza Eşleşmesi Önerisi */}
          {isPlateFound && (
            <View style={dynamicStyles.plateFoundBox}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Sparkles size={14} color={isDark ? '#FBBF24' : '#D97706'} />
                  <Text style={dynamicStyles.plateFoundTitle}>
                    Plaka Hafızasında Kayıt Bulundu!
                  </Text>
                </View>
                <Text style={dynamicStyles.plateFoundText}>
                  👤 {plateRecord.customerName || 'Müşteri'}
                  {plateRecord.vehicleInfo ? ` • 🚗 ${plateRecord.vehicleInfo}` : ''}
                </Text>
              </View>
              <TouchableOpacity
                style={dynamicStyles.plateFoundBtn}
                onPress={() => {
                  const parsed = parseVehicleInfo(plateRecord.vehicleInfo, form.plate);
                  setForm(prev => ({
                    ...prev,
                    customerName: plateRecord.customerName || prev.customerName,
                    customerPhone: plateRecord.customerPhone ? formatPhone(plateRecord.customerPhone) : prev.customerPhone,
                    vehicleBrand: parsed.brand || prev.vehicleBrand,
                    vehicleModel: parsed.model || prev.vehicleModel,
                    title: prev.title || (parsed.brand ? `${parsed.brand} ${parsed.model} Bakımı`.trim() : prev.title),
                  }));
                }}
              >
                <Text style={dynamicStyles.plateFoundBtnText}>Bilgileri Getir</Text>
              </TouchableOpacity>
            </View>
          )}

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

      {/* Marka Seçim Modalı (Aramalı, Filtreli & Kalıcı Kaydetmeli) */}
      <BrandPickerModal
        visible={showBrandModal}
        onClose={() => setShowBrandModal(false)}
        onSelect={handleSelectBrand}
        onAddAndSaveBrand={handleAddAndSelectBrand}
        currentValue={form.vehicleBrand}
        brands={allMergedBrands}
        theme={theme}
        isDark={isDark}
      />

      {/* Model Seçim Modalı (Aramalı & Kalıcı Kaydetmeli) */}
      <ModelPickerModal
        visible={showModelModal}
        onClose={() => setShowModelModal(false)}
        onSelect={handleSelectModel}
        onAddAndSaveModel={handleAddAndSelectModel}
        brandName={form.vehicleBrand}
        models={availableModels}
        currentValue={form.vehicleModel}
        theme={theme}
        isDark={isDark}
      />
    </SafeAreaView>
  );
}

// ─── Marka Seçim Modalı (Aramalı, Filtreli & Kalıcı Kaydetmeli) ───────────────
function BrandPickerModal({
  visible,
  onClose,
  onSelect,
  onAddAndSaveBrand,
  currentValue,
  brands,
  theme,
  isDark,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (brand: string) => void;
  onAddAndSaveBrand: (brand: string, type: VehicleCategoryType) => void;
  currentValue: string;
  brands: VehicleBrandData[];
  theme: any;
  isDark: boolean;
}) {
  const [search, setSearch] = useState('');
  const [selectedTab, setSelectedTab] = useState<'ALL' | 'CAR' | 'MOTO'>('ALL');
  const [newBrandType, setNewBrandType] = useState<VehicleCategoryType>('CAR');

  // Arama ve tab filtreleme
  const filtered = useMemo(() => {
    let list = brands;
    if (selectedTab === 'CAR') {
      list = list.filter(b => b.vehicleType === 'CAR' || b.vehicleType === 'BOTH');
    } else if (selectedTab === 'MOTO') {
      list = list.filter(b => b.vehicleType === 'MOTO' || b.vehicleType === 'BOTH');
    }

    if (!search.trim()) return list;
    const q = search.trim().toLowerCase();
    return list.filter(b =>
      b.name.toLowerCase().includes(q) ||
      (b.category && b.category.toLowerCase().includes(q))
    );
  }, [brands, selectedTab, search]);

  const cleanSearch = search.trim();
  const isExactMatch = brands.some(b => b.name.toLowerCase() === cleanSearch.toLowerCase());

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: theme.border }}>
          <View>
            <Text style={{ fontSize: Typography.fontSize.lg, fontWeight: '800', color: theme.textPrimary }}>
              🚗 🏍️ Marka Seçin
            </Text>
            <Text style={{ fontSize: Typography.fontSize.xs, color: theme.textMuted }}>
              Tıklayarak seçin veya yeni marka ekleyip kaydedin
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
            <Text style={{ color: theme.primary, fontWeight: '700', fontSize: Typography.fontSize.base }}>Kapat</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Filtreleri: Tümü, Otomobil, Motosiklet */}
        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md }}>
          <TouchableOpacity
            style={[
              { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: BorderRadius.md, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border },
              selectedTab === 'ALL' && { backgroundColor: theme.primary, borderColor: theme.primary }
            ]}
            onPress={() => setSelectedTab('ALL')}
          >
            <Text style={{ fontSize: Typography.fontSize.xs, fontWeight: '700', color: selectedTab === 'ALL' ? '#FFFFFF' : theme.textSecondary }}>
              🚗 + 🏍️ Tümü ({brands.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: BorderRadius.md, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border },
              selectedTab === 'CAR' && { backgroundColor: theme.primary, borderColor: theme.primary }
            ]}
            onPress={() => {
              setSelectedTab('CAR');
              setNewBrandType('CAR');
            }}
          >
            <Text style={{ fontSize: Typography.fontSize.xs, fontWeight: '700', color: selectedTab === 'CAR' ? '#FFFFFF' : theme.textSecondary }}>
              🚗 Otomobil
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: BorderRadius.md, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border },
              selectedTab === 'MOTO' && { backgroundColor: theme.primary, borderColor: theme.primary }
            ]}
            onPress={() => {
              setSelectedTab('MOTO');
              setNewBrandType('MOTO');
            }}
          >
            <Text style={{ fontSize: Typography.fontSize.xs, fontWeight: '700', color: selectedTab === 'MOTO' ? '#FFFFFF' : theme.textSecondary }}>
              🏍️ Motosiklet
            </Text>
          </TouchableOpacity>
        </View>

        {/* Arama Çubuğu */}
        <View style={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.surface,
            borderRadius: BorderRadius.md,
            borderWidth: 1,
            borderColor: theme.border,
            paddingHorizontal: Spacing.md,
            height: 44,
            gap: 8,
          }}>
            <Search size={18} color={theme.textMuted} />
            <TextInput
              style={{ flex: 1, color: theme.textPrimary, fontSize: Typography.fontSize.base }}
              placeholder="Marka ara... (Fiat, Renault, Honda, Yamaha...)"
              placeholderTextColor={theme.textMuted}
              value={search}
              onChangeText={setSearch}
              autoCapitalize="words"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Text style={{ color: theme.textMuted, fontSize: 16 }}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Manuel Ekleme ve Kalıcı Kaydetme Kartı (Kullanıcı yeni marka yazdığında) */}
        {cleanSearch.length > 0 && !isExactMatch && (
          <View style={{
            marginHorizontal: Spacing.lg,
            marginBottom: Spacing.sm,
            backgroundColor: isDark ? 'rgba(79, 70, 229, 0.18)' : '#EEF2FF',
            borderWidth: 1.5,
            borderColor: theme.primary,
            borderRadius: BorderRadius.lg,
            padding: Spacing.md,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Sparkles size={16} color={theme.primary} />
              <Text style={{ color: theme.primary, fontWeight: '800', fontSize: Typography.fontSize.sm }}>
                Listede Olmayan Markayı Sisteme Kaydet
              </Text>
            </View>
            <Text style={{ color: theme.textSecondary, fontSize: Typography.fontSize.xs, marginBottom: 10 }}>
              "{cleanSearch}" markasını sisteme kaydedip seçin. Sonraki tüm seçimlerinizde hazır olarak gelecektir.
            </Text>

            {/* Tür Seçimi */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 6,
                  alignItems: 'center',
                  borderRadius: BorderRadius.sm,
                  backgroundColor: newBrandType === 'CAR' ? theme.primary : theme.surface,
                  borderWidth: 1,
                  borderColor: newBrandType === 'CAR' ? theme.primary : theme.border,
                }}
                onPress={() => setNewBrandType('CAR')}
              >
                <Text style={{ fontSize: 11, fontWeight: '700', color: newBrandType === 'CAR' ? '#fff' : theme.textSecondary }}>
                  🚗 Otomobil
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 6,
                  alignItems: 'center',
                  borderRadius: BorderRadius.sm,
                  backgroundColor: newBrandType === 'MOTO' ? theme.primary : theme.surface,
                  borderWidth: 1,
                  borderColor: newBrandType === 'MOTO' ? theme.primary : theme.border,
                }}
                onPress={() => setNewBrandType('MOTO')}
              >
                <Text style={{ fontSize: 11, fontWeight: '700', color: newBrandType === 'MOTO' ? '#fff' : theme.textSecondary }}>
                  🏍️ Motosiklet
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={{
                backgroundColor: theme.primary,
                paddingVertical: 10,
                borderRadius: BorderRadius.md,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 6,
              }}
              onPress={() => {
                onAddAndSaveBrand(cleanSearch, newBrandType);
                onClose();
                setSearch('');
              }}
            >
              <Save size={16} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: Typography.fontSize.sm }}>
                💾 "{cleanSearch}" Markasını Kaydet ve Seç
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Marka Listesi */}
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: 40 }}
          renderItem={({ item }) => {
            const isSelected = currentValue.toLowerCase() === item.name.toLowerCase();
            const icon = item.vehicleType === 'MOTO' ? '🏍️' : item.vehicleType === 'CAR' ? '🚗' : '🚗🏍️';
            return (
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 14,
                  borderBottomWidth: 1,
                  borderBottomColor: theme.border,
                  backgroundColor: isSelected ? theme.primary + '12' : 'transparent',
                  paddingHorizontal: isSelected ? Spacing.sm : 0,
                  borderRadius: isSelected ? BorderRadius.sm : 0,
                }}
                onPress={() => {
                  onSelect(item.name);
                  onClose();
                  setSearch('');
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={{ fontSize: 18 }}>{icon}</Text>
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: Typography.fontSize.base, fontWeight: isSelected ? '800' : '600', color: isSelected ? theme.primary : theme.textPrimary }}>
                        {item.name}
                      </Text>
                      {item.isCustom && (
                        <View style={{ backgroundColor: theme.primary + '20', borderRadius: BorderRadius.full, paddingHorizontal: 6, paddingVertical: 1 }}>
                          <Text style={{ fontSize: 9, color: theme.primary, fontWeight: '800' }}>
                            💾 KAYITLI
                          </Text>
                        </View>
                      )}
                    </View>
                    {item.category && (
                      <Text style={{ fontSize: 11, color: theme.textMuted, marginTop: 1 }}>
                        {item.category}
                      </Text>
                    )}
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {item.models.length > 0 && (
                    <Text style={{ fontSize: Typography.fontSize.xs, color: theme.textMuted }}>
                      {item.models.length} model
                    </Text>
                  )}
                  {isSelected && <Check size={18} color={theme.primary} />}
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={{ padding: Spacing.xl, alignItems: 'center' }}>
              <Text style={{ color: theme.textMuted, textAlign: 'center', marginBottom: 12 }}>
                Aramanızla eşleşen marka bulunamadı.
              </Text>
              {cleanSearch.length > 0 && (
                <TouchableOpacity
                  style={{
                    backgroundColor: theme.primary,
                    paddingHorizontal: Spacing.lg,
                    paddingVertical: 10,
                    borderRadius: BorderRadius.md,
                  }}
                  onPress={() => {
                    onAddAndSaveBrand(cleanSearch, newBrandType);
                    onClose();
                    setSearch('');
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: Typography.fontSize.sm }}>
                    💾 "{cleanSearch}" Markasını Kaydet ve Seç
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      </SafeAreaView>
    </Modal>
  );
}

// ─── Model Seçim Modalı (Aramalı & Kalıcı Kaydetmeli) ────────────────────────
function ModelPickerModal({
  visible,
  onClose,
  onSelect,
  onAddAndSaveModel,
  brandName,
  models,
  currentValue,
  theme,
  isDark,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (model: string) => void;
  onAddAndSaveModel: (brandName: string, model: string) => void;
  brandName: string;
  models: string[];
  currentValue: string;
  theme: any;
  isDark: boolean;
}) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return models;
    const q = search.trim().toLowerCase();
    return models.filter(m => m.toLowerCase().includes(q));
  }, [models, search]);

  const cleanSearch = search.trim();
  const isExactMatch = models.some(m => m.toLowerCase() === cleanSearch.toLowerCase());

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: theme.border }}>
          <View>
            <Text style={{ fontSize: Typography.fontSize.lg, fontWeight: '800', color: theme.textPrimary }}>
              🔧 {brandName ? `${brandName} Modeli Seçin` : 'Model Seçin'}
            </Text>
            <Text style={{ fontSize: Typography.fontSize.xs, color: theme.textMuted }}>
              Tıklayarak seçin veya yeni model ekleyip kaydedin
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
            <Text style={{ color: theme.primary, fontWeight: '700', fontSize: Typography.fontSize.base }}>Kapat</Text>
          </TouchableOpacity>
        </View>

        <View style={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.surface,
            borderRadius: BorderRadius.md,
            borderWidth: 1,
            borderColor: theme.border,
            paddingHorizontal: Spacing.md,
            height: 44,
            gap: 8,
          }}>
            <Search size={18} color={theme.textMuted} />
            <TextInput
              style={{ flex: 1, color: theme.textPrimary, fontSize: Typography.fontSize.base }}
              placeholder={brandName ? `"${brandName}" için model ara...` : "Model ara..."}
              placeholderTextColor={theme.textMuted}
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Text style={{ color: theme.textMuted, fontSize: 16 }}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Manuel Ekleme & Kalıcı Kaydetme Kartı */}
        {cleanSearch.length > 0 && !isExactMatch && (
          <View style={{
            marginHorizontal: Spacing.lg,
            marginBottom: Spacing.sm,
            backgroundColor: isDark ? 'rgba(79, 70, 229, 0.18)' : '#EEF2FF',
            borderWidth: 1.5,
            borderColor: theme.primary,
            borderRadius: BorderRadius.lg,
            padding: Spacing.md,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Sparkles size={16} color={theme.primary} />
              <Text style={{ color: theme.primary, fontWeight: '800', fontSize: Typography.fontSize.sm }}>
                Modeli Sisteme Kaydet
              </Text>
            </View>
            <Text style={{ color: theme.textSecondary, fontSize: Typography.fontSize.xs, marginBottom: 10 }}>
              "{cleanSearch}" modeli {brandName ? `"${brandName}" markasının` : 'aracın'} altına kalıcı olarak kaydedilecek ve sonraki seçimlerde hazır olacaktır.
            </Text>

            <TouchableOpacity
              style={{
                backgroundColor: theme.primary,
                paddingVertical: 10,
                borderRadius: BorderRadius.md,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 6,
              }}
              onPress={() => {
                onAddAndSaveModel(brandName, cleanSearch);
                onClose();
                setSearch('');
              }}
            >
              <Save size={16} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: Typography.fontSize.sm }}>
                💾 "{cleanSearch}" Modelini Kaydet ve Seç
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <FlatList
          data={filtered}
          keyExtractor={(item, index) => `${item}-${index}`}
          contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: 40 }}
          renderItem={({ item }) => {
            const isSelected = currentValue.toLowerCase() === item.toLowerCase();
            return (
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 14,
                  borderBottomWidth: 1,
                  borderBottomColor: theme.border,
                  backgroundColor: isSelected ? theme.primary + '12' : 'transparent',
                  paddingHorizontal: isSelected ? Spacing.sm : 0,
                  borderRadius: isSelected ? BorderRadius.sm : 0,
                }}
                onPress={() => {
                  onSelect(item);
                  onClose();
                  setSearch('');
                }}
              >
                <Text style={{ fontSize: Typography.fontSize.base, fontWeight: isSelected ? '800' : '600', color: isSelected ? theme.primary : theme.textPrimary }}>
                  {item}
                </Text>
                {isSelected && <Check size={18} color={theme.primary} />}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={{ padding: Spacing.xl, alignItems: 'center' }}>
              <Text style={{ color: theme.textMuted, textAlign: 'center', marginBottom: 12 }}>
                {models.length === 0
                  ? (brandName ? `"${brandName}" markasına ait kayıtlı model henüz yok.` : 'Kayıtlı model bulunamadı.')
                  : 'Aramanızla eşleşen model bulunamadı.'}
              </Text>
              {cleanSearch.length > 0 && (
                <TouchableOpacity
                  style={{
                    backgroundColor: theme.primary,
                    paddingHorizontal: Spacing.lg,
                    paddingVertical: 10,
                    borderRadius: BorderRadius.md,
                  }}
                  onPress={() => {
                    onAddAndSaveModel(brandName, cleanSearch);
                    onClose();
                    setSearch('');
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: Typography.fontSize.sm }}>
                    💾 "{cleanSearch}" Modelini Kaydet ve Seç
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      </SafeAreaView>
    </Modal>
  );
}

interface InputFieldProps extends React.ComponentProps<typeof TextInput> {
  label: string;
  last?: boolean;
  multiline?: boolean;
  theme: any;
  dynamicStyles: any;
}

function InputField({ label, last = false, multiline = false, theme, dynamicStyles, ...props }: InputFieldProps) {
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

const styles = (theme: any, isDark: boolean) => StyleSheet.create({
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
  staffChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: theme.background,
    borderWidth: 1,
    borderColor: theme.border,
  },
  staffChipActive: {
    backgroundColor: theme.primary + '18',
    borderColor: theme.primary,
  },
  staffDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.textMuted,
    marginRight: 6,
  },
  staffDotActive: {
    backgroundColor: theme.primary,
  },
  staffChipText: {
    fontSize: Typography.fontSize.sm,
    color: theme.textSecondary,
    fontWeight: '500',
  },
  staffChipTextActive: {
    color: theme.primary,
    fontWeight: '700',
  },
  selectBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: isDark ? theme.surfaceElevated : '#F8FAFC',
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: isDark ? theme.border : '#E2E8F0',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    minHeight: 52,
  },
  selectBoxValue: {
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
    color: theme.textPrimary,
  },
  selectBoxPlaceholder: {
    fontSize: Typography.fontSize.base,
    color: theme.textMuted,
    fontWeight: '500',
  },
  selectBoxSub: {
    fontSize: 11,
    color: theme.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },
  quickChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    backgroundColor: isDark ? theme.surfaceElevated : '#F1F5F9',
    borderWidth: 1,
    borderColor: isDark ? theme.border : '#E2E8F0',
  },
  quickChipActive: {
    backgroundColor: theme.primary + '20',
    borderColor: theme.primary,
  },
  quickChipText: {
    fontSize: Typography.fontSize.xs,
    color: theme.textSecondary,
    fontWeight: '600',
  },
  quickChipTextActive: {
    color: theme.primary,
    fontWeight: '700',
  },
  plateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: '#0F172A',
    overflow: 'hidden',
    height: 48,
    marginTop: 4,
  },
  plateTrBadge: {
    width: 38,
    height: '100%',
    backgroundColor: '#003399',
    justifyContent: 'center',
    alignItems: 'center',
  },
  plateTrText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  plateInput: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    fontSize: Typography.fontSize.base,
    fontWeight: '900',
    letterSpacing: 2,
    color: '#0F172A',
  },
  prefilledBanner: {
    backgroundColor: isDark ? 'rgba(6, 78, 59, 0.35)' : '#ECFDF5',
    borderWidth: 1.5,
    borderColor: isDark ? '#059669' : '#A7F3D0',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  prefilledBannerTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '800',
    color: isDark ? '#34D399' : '#065F46',
  },
  prefilledBannerSub: {
    fontSize: Typography.fontSize.xs,
    color: isDark ? '#A7F3D0' : '#047857',
    marginTop: 2,
    lineHeight: 16,
  },
  prefilledPlateBadge: {
    backgroundColor: isDark ? '#059669' : '#065F46',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  prefilledPlateBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  plateFoundBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? 'rgba(120, 53, 15, 0.35)' : '#FEF3C7',
    borderWidth: 1,
    borderColor: isDark ? '#D97706' : '#FCD34D',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginTop: -Spacing.sm,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  plateFoundTitle: {
    fontSize: Typography.fontSize.xs,
    fontWeight: '700',
    color: isDark ? '#FBBF24' : '#92400E',
  },
  plateFoundText: {
    fontSize: 11,
    color: isDark ? '#FDE68A' : '#B45309',
    marginTop: 2,
  },
  plateFoundBtn: {
    backgroundColor: '#D97706',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
  },
  plateFoundBtnText: {
    color: '#fff',
    fontSize: Typography.fontSize.xs,
    fontWeight: '700',
  },
});
