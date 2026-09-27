import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { workOrderAPI, partsAPI, uploadAPI } from '../../src/api/client';
import { Typography, Spacing, BorderRadius, Shadows } from '../../src/constants/theme';
import { useAppTheme } from '../../src/hooks/useAppTheme';
import {
  Plus,
  Trash2,
  ChevronRight,
  MessageSquare,
  DollarSign,
  Camera,
  Image as ImageIcon,
  Check,
  X,
  CreditCard,
  AlertCircle,
  Eye,
} from 'lucide-react-native';
import {
  openWhatsApp,
  generateWorkOrderMessage,
  generateDebtReminderMessage,
} from '../../src/utils/whatsapp';

const STATUS_COLORS: Record<string, string> = {
  ACIK: '#3B82F6',
  DEVAM_EDIYOR: '#F59E0B',
  TAMAMLANDI: '#10B981',
  IPTAL: '#EF4444',
};

const STATUS_LABELS: Record<string, string> = {
  ACIK: 'Açık',
  DEVAM_EDIYOR: 'Devam Ediyor',
  TAMAMLANDI: 'Tamamlandı',
  IPTAL: 'İptal',
};

const ITEM_STATUS_COLORS: Record<string, string> = {
  BEKLIYOR: '#94A3B8',
  REZERVE: '#F59E0B',
  KULLANILDI: '#10B981',
  IPTAL: '#EF4444',
};

const ITEM_STATUS_LABELS: Record<string, string> = {
  BEKLIYOR: 'Bekliyor',
  REZERVE: 'Rezerve',
  KULLANILDI: 'Kullanıldı',
  IPTAL: 'İptal',
};

function resolveImageUrl(url: string | undefined): string {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('data:')) return url;
  const baseUrl = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api').replace(/\/api\/?$/, '');
  return `${baseUrl}${url}`;
}

// ─── Parça Ekle Modal ─────────────────────────────────────────────────────────
function AddPartModal({ visible, orderId, onClose, theme }: any) {
  const queryClient = useQueryClient();
  const [partSearch, setPartSearch] = useState('');
  const [selectedPart, setSelectedPart] = useState<any>(null);
  const [quantity, setQuantity] = useState('1');
  const [unitPrice, setUnitPrice] = useState('');

  const { data: partsData } = useQuery({
    queryKey: ['parts-search-wo', partSearch],
    queryFn: () => partsAPI.getAll({ search: partSearch, limit: 10 }),
    enabled: partSearch.length >= 2,
  });

  const parts: any[] = (partsData as any)?.data || [];

  const mutation = useMutation({
    mutationFn: () =>
      workOrderAPI.addItem(orderId, {
        partId: selectedPart.id,
        quantity: parseInt(quantity),
        unitPrice: unitPrice ? parseFloat(unitPrice) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-order', orderId] });
      setSelectedPart(null);
      setPartSearch('');
      setQuantity('1');
      setUnitPrice('');
      onClose();
    },
    onError: (err: any) => Alert.alert('Hata', err?.message || 'Parça eklenemedi.'),
  });

  const handleAdd = () => {
    if (!selectedPart) {
      Alert.alert('Hata', 'Lütfen bir parça seçin.');
      return;
    }
    if (parseInt(quantity) <= 0) {
      Alert.alert('Hata', 'Miktar en az 1 olmalı.');
      return;
    }
    mutation.mutate();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: theme.background }}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: theme.border }}>
            <Text style={{ fontSize: Typography.fontSize.lg, fontWeight: '700', color: theme.textPrimary }}>🔩 Parça Ekle</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ color: theme.primary, fontWeight: '600' }}>İptal</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: Spacing.lg }}>
            {selectedPart ? (
              <TouchableOpacity
                onPress={() => setSelectedPart(null)}
                style={{ backgroundColor: theme.primary + '15', borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1, borderColor: theme.primary, marginBottom: Spacing.md, flexDirection: 'row', justifyContent: 'space-between' }}
              >
                <View>
                  <Text style={{ color: theme.primary, fontWeight: '700', fontSize: Typography.fontSize.base }}>{selectedPart.name}</Text>
                  <Text style={{ color: theme.textMuted, fontSize: Typography.fontSize.xs }}>
                    Mevcut: {selectedPart.quantity - (selectedPart.reservedQuantity || 0)} {selectedPart.unit} kullanılabilir
                  </Text>
                  {selectedPart.sellingPrice && (
                    <Text style={{ color: theme.success, fontSize: Typography.fontSize.xs }}>
                      Satış: ₺{parseFloat(selectedPart.sellingPrice).toLocaleString('tr-TR')}
                    </Text>
                  )}
                </View>
                <Text style={{ color: theme.textMuted }}>✕</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TextInput
                  style={{ backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: BorderRadius.md, padding: Spacing.md, color: theme.textPrimary, marginBottom: Spacing.sm }}
                  placeholder="Parça ara... (en az 2 karakter)"
                  placeholderTextColor={theme.textMuted}
                  value={partSearch}
                  onChangeText={setPartSearch}
                  autoFocus
                />
                {parts.map((p: any) => (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => {
                      setSelectedPart(p);
                      setUnitPrice(p.sellingPrice ? String(parseFloat(p.sellingPrice)) : '');
                    }}
                    style={{ backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.sm }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: theme.textPrimary, fontWeight: '600', flex: 1 }}>{p.name}</Text>
                      <Text style={{ color: p.quantity - (p.reservedQuantity || 0) > 0 ? theme.success : theme.danger, fontSize: Typography.fontSize.sm }}>
                        {p.quantity - (p.reservedQuantity || 0)} {p.unit}
                      </Text>
                    </View>
                    {p.sellingPrice && (
                      <Text style={{ color: theme.textMuted, fontSize: Typography.fontSize.xs }}>
                        Satış fiyatı: ₺{parseFloat(p.sellingPrice).toLocaleString('tr-TR')}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
              </>
            )}

            <View style={{ flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.textMuted, fontSize: Typography.fontSize.xs, marginBottom: 4 }}>Miktar *</Text>
                <TextInput
                  style={{ backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: BorderRadius.md, padding: Spacing.md, color: theme.textPrimary }}
                  keyboardType="numeric"
                  placeholder="1"
                  placeholderTextColor={theme.textMuted}
                  value={quantity}
                  onChangeText={setQuantity}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.textMuted, fontSize: Typography.fontSize.xs, marginBottom: 4 }}>Satış Fiyatı (₺)</Text>
                <TextInput
                  style={{ backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: BorderRadius.md, padding: Spacing.md, color: theme.textPrimary }}
                  keyboardType="decimal-pad"
                  placeholder="Otomatik"
                  placeholderTextColor={theme.textMuted}
                  value={unitPrice}
                  onChangeText={setUnitPrice}
                />
              </View>
            </View>

            <TouchableOpacity
              style={{ backgroundColor: theme.primary, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', opacity: mutation.isPending ? 0.7 : 1 }}
              onPress={handleAdd}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700', fontSize: Typography.fontSize.base }}>🔩 Parçayı Ekle</Text>}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Ödeme & Tahsilat Güncelle Modal ──────────────────────────────────────────
function PaymentUpdateModal({ visible, order, onClose, theme }: any) {
  const queryClient = useQueryClient();
  const [payAmount, setPayAmount] = useState(String(order?.paidAmount || 0));
  const [payStatus, setPayStatus] = useState(order?.paymentStatus || 'BEKLIYOR');
  const [payMethod, setPayMethod] = useState(order?.paymentMethod || 'NAKIT');
  const [payNotes, setPayNotes] = useState(order?.paymentNotes || '');

  React.useEffect(() => {
    if (order) {
      setPayAmount(String(order.paidAmount || 0));
      setPayStatus(order.paymentStatus || 'BEKLIYOR');
      setPayMethod(order.paymentMethod || 'NAKIT');
      setPayNotes(order.paymentNotes || '');
    }
  }, [order]);

  const mutation = useMutation({
    mutationFn: (data: any) => workOrderAPI.updatePayment(order.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-order', order.id] });
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['receivables'] });
      onClose();
      Alert.alert('Başarılı', 'Ödeme ve veresiye durumu güncellendi! ✅');
    },
    onError: (err: any) => Alert.alert('Hata', err?.response?.data?.error || err?.message || 'Ödeme güncellenemedi.'),
  });

  const handleSave = () => {
    const numericPaid = parseFloat(payAmount);
    if (isNaN(numericPaid) || numericPaid < 0) {
      Alert.alert('Hata', 'Lütfen geçerli bir tutar giriniz.');
      return;
    }
    mutation.mutate({
      paidAmount: numericPaid,
      paymentStatus: payStatus,
      paymentMethod: payMethod,
      paymentNotes: payNotes.trim() || undefined,
    });
  };

  const total = parseFloat(order?.totalAmount || 0);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: theme.background, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, maxHeight: '90%' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: theme.border }}>
            <View>
              <Text style={{ fontSize: Typography.fontSize.lg, fontWeight: '800', color: theme.textPrimary }}>💳 Ödeme & Tahsilat Girişi</Text>
              <Text style={{ fontSize: Typography.fontSize.xs, color: theme.textMuted, marginTop: 2 }}>{order?.customerName} — {order?.vehicleInfo}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <Text style={{ fontSize: 18, color: theme.textMuted }}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: Spacing.lg }}>
            {/* Top Balance Summary */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', backgroundColor: theme.surface, borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1, borderColor: theme.border, marginBottom: Spacing.md }}>
              <View>
                <Text style={{ fontSize: Typography.fontSize.xs, color: theme.textMuted }}>Toplam Servis Tutarı</Text>
                <Text style={{ fontSize: Typography.fontSize.lg, fontWeight: '800', color: theme.textPrimary, marginTop: 2 }}>
                  ₺{total.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: Typography.fontSize.xs, color: theme.textMuted }}>Kalan Bakiye</Text>
                <Text style={{ fontSize: Typography.fontSize.lg, fontWeight: '800', color: theme.danger, marginTop: 2 }}>
                  ₺{Math.max(0, total - (parseFloat(payAmount) || 0)).toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
                </Text>
              </View>
            </View>

            {/* Paid Amount */}
            <Text style={{ fontSize: Typography.fontSize.xs, fontWeight: '700', color: theme.textPrimary, marginBottom: 6 }}>Tahsil Edilen Tutar (₺) *</Text>
            <TextInput
              style={{ backgroundColor: theme.surface, borderRadius: BorderRadius.md, borderWidth: 2, borderColor: theme.success, padding: Spacing.md, fontSize: Typography.fontSize.xl, fontWeight: '800', color: theme.textPrimary, textAlign: 'center' }}
              keyboardType="decimal-pad"
              value={payAmount}
              onChangeText={setPayAmount}
            />

            {/* Quick shortcuts */}
            <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: 6, marginBottom: Spacing.md }}>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: BorderRadius.sm, paddingVertical: 6, alignItems: 'center' }}
                onPress={() => {
                  setPayAmount(String(total));
                  setPayStatus('ODENDI');
                }}
              >
                <Text style={{ fontSize: Typography.fontSize.xs, fontWeight: '700', color: theme.success }}>Tamamını Öde (₺{total})</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: BorderRadius.sm, paddingVertical: 6, alignItems: 'center' }}
                onPress={() => {
                  setPayAmount('0');
                  setPayStatus('VERESIYE');
                  setPayMethod('VERESIYE');
                }}
              >
                <Text style={{ fontSize: Typography.fontSize.xs, fontWeight: '700', color: theme.danger }}>Veresiye / Açık Hesap</Text>
              </TouchableOpacity>
            </View>

            {/* Status Selector */}
            <Text style={{ fontSize: Typography.fontSize.xs, fontWeight: '700', color: theme.textPrimary, marginBottom: 6 }}>Ödeme Durumu</Text>
            <View style={{ flexDirection: 'row', gap: Spacing.xs, marginBottom: Spacing.md }}>
              {[
                { id: 'ODENDI', label: '✅ Ödendi', color: theme.success },
                { id: 'KISMI', label: '🟡 Kısmi', color: '#F59E0B' },
                { id: 'VERESIYE', label: '🔴 Veresiye', color: theme.danger },
                { id: 'BEKLIYOR', label: '⏳ Bekliyor', color: theme.textMuted },
              ].map((s) => (
                <TouchableOpacity
                  key={s.id}
                  style={{
                    flex: 1,
                    backgroundColor: payStatus === s.id ? s.color + '20' : theme.surface,
                    borderWidth: 1,
                    borderColor: payStatus === s.id ? s.color : theme.border,
                    borderRadius: BorderRadius.md,
                    paddingVertical: Spacing.sm,
                    alignItems: 'center',
                  }}
                  onPress={() => setPayStatus(s.id)}
                >
                  <Text style={{ fontSize: Typography.fontSize.xs, fontWeight: payStatus === s.id ? '800' : '600', color: payStatus === s.id ? s.color : theme.textSecondary }}>
                    {s.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Payment Method */}
            <Text style={{ fontSize: Typography.fontSize.xs, fontWeight: '700', color: theme.textPrimary, marginBottom: 6 }}>Ödeme Yöntemi</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginBottom: Spacing.md }}>
              {[
                { id: 'NAKIT', label: '💵 Nakit' },
                { id: 'KREDI_KARTI', label: '💳 Kredi Kartı' },
                { id: 'HAVALE', label: '🏦 Havale/EFT' },
                { id: 'VERESIYE', label: '🔴 Açık Hesap' },
              ].map((m) => (
                <TouchableOpacity
                  key={m.id}
                  style={{
                    flex: 1,
                    minWidth: '45%',
                    backgroundColor: payMethod === m.id ? theme.primary + '15' : theme.surface,
                    borderWidth: 1,
                    borderColor: payMethod === m.id ? theme.primary : theme.border,
                    borderRadius: BorderRadius.md,
                    paddingVertical: Spacing.sm,
                    alignItems: 'center',
                  }}
                  onPress={() => setPayMethod(m.id)}
                >
                  <Text style={{ fontSize: Typography.fontSize.xs, fontWeight: payMethod === m.id ? '800' : '600', color: payMethod === m.id ? theme.primary : theme.textSecondary }}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Payment Notes */}
            <Text style={{ fontSize: Typography.fontSize.xs, fontWeight: '700', color: theme.textPrimary, marginBottom: 6 }}>Ödeme / Vade Notu</Text>
            <TextInput
              style={{ backgroundColor: theme.surface, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: theme.border, padding: Spacing.md, color: theme.textPrimary, fontSize: Typography.fontSize.sm, minHeight: 60, textAlignVertical: 'top', marginBottom: Spacing.lg }}
              placeholder="Örn: 2.000 TL nakit alındı, kalan cuma günü ödenecek..."
              placeholderTextColor={theme.textMuted}
              value={payNotes}
              onChangeText={setPayNotes}
              multiline
            />

            {/* Save Button */}
            <TouchableOpacity
              style={{ backgroundColor: theme.success, borderRadius: BorderRadius.md, paddingVertical: Spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, ...Shadows.sm, opacity: mutation.isPending ? 0.7 : 1 }}
              onPress={handleSave}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Check size={18} color="#fff" />
                  <Text style={{ color: '#fff', fontSize: Typography.fontSize.base, fontWeight: '800' }}>Ödeme Bilgilerini Kaydet</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Fotoğraf Galerisi & Öncesi/Sonrası (Step 4) ──────────────────────────────
function PhotoSection({ order, theme }: { order: any; theme: any }) {
  const queryClient = useQueryClient();
  const [photoType, setPhotoType] = useState<'before' | 'after'>('before');
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const beforeList: string[] = order.beforeImages || [];
  const afterList: string[] = order.afterImages || [];
  const currentImages = photoType === 'before' ? beforeList : afterList;

  const addPhotoMutation = useMutation({
    mutationFn: (data: { type: 'before' | 'after'; imageUrl: string }) =>
      workOrderAPI.addPhoto(order.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-order', order.id] });
      setUploading(false);
    },
    onError: (err: any) => {
      setUploading(false);
      Alert.alert('Hata', err?.response?.data?.error || err?.message || 'Fotoğraf eklenemedi.');
    },
  });

  const removePhotoMutation = useMutation({
    mutationFn: (data: { type: 'before' | 'after'; imageUrl: string }) =>
      workOrderAPI.removePhoto(order.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-order', order.id] });
    },
    onError: (err: any) => {
      Alert.alert('Hata', 'Fotoğraf silinemedi.');
    },
  });

  const handlePickImage = async (fromCamera: boolean) => {
    try {
      if (fromCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('İzin Gerekli', 'Kamera kullanımı için izin vermeniz gerekmektedir.');
          return;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('İzin Gerekli', 'Galeriye erişim için izin vermeniz gerekmektedir.');
          return;
        }
      }

      const pickerFn = fromCamera ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
      const result = await pickerFn({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.6,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setUploading(true);

        if (asset.base64) {
          try {
            const uploadRes = await uploadAPI.uploadBase64({
              base64: `data:image/jpeg;base64,${asset.base64}`,
              filename: `wo-${order.id}-${photoType}.jpg`,
            });
            const url = (uploadRes as any)?.data?.url || asset.uri;
            addPhotoMutation.mutate({ type: photoType, imageUrl: url });
          } catch (uploadErr) {
            // Fallback to asset.uri directly
            addPhotoMutation.mutate({ type: photoType, imageUrl: asset.uri });
          }
        } else {
          addPhotoMutation.mutate({ type: photoType, imageUrl: asset.uri });
        }
      }
    } catch (e: any) {
      setUploading(false);
      Alert.alert('Hata', 'Görsel yüklenirken bir problem oluştu.');
    }
  };

  const handleConfirmDelete = (imageUrl: string) => {
    Alert.alert('Fotoğrafı Sil', 'Bu fotoğraf servis kaydından silinsin mi?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => removePhotoMutation.mutate({ type: photoType, imageUrl }),
      },
    ]);
  };

  return (
    <View style={{ marginTop: Spacing.lg }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm }}>
        <View>
          <Text style={{ fontSize: Typography.fontSize.base, fontWeight: '700', color: theme.textPrimary }}>
            📸 Parça & Ekspertiz Fotoğrafları
          </Text>
          <Text style={{ fontSize: Typography.fontSize.xs, color: theme.textMuted }}>
            Eski/bozuk parça ile takılan yeni parçanın kanıtı
          </Text>
        </View>
        <Text style={{ fontSize: Typography.fontSize.xs, fontWeight: '700', color: theme.primary }}>
          {beforeList.length + afterList.length} Fotoğraf
        </Text>
      </View>

      {/* Segmented control */}
      <View style={{ flexDirection: 'row', backgroundColor: theme.surface, borderRadius: BorderRadius.md, padding: 3, borderWidth: 1, borderColor: theme.border, marginBottom: Spacing.md }}>
        <TouchableOpacity
          style={{
            flex: 1,
            paddingVertical: 7,
            borderRadius: BorderRadius.sm,
            alignItems: 'center',
            backgroundColor: photoType === 'before' ? '#EF4444' : 'transparent',
          }}
          onPress={() => setPhotoType('before')}
        >
          <Text style={{ fontSize: Typography.fontSize.xs, fontWeight: '700', color: photoType === 'before' ? '#fff' : theme.textSecondary }}>
            🔴 Bozuk / Eski ({beforeList.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            flex: 1,
            paddingVertical: 7,
            borderRadius: BorderRadius.sm,
            alignItems: 'center',
            backgroundColor: photoType === 'after' ? '#10B981' : 'transparent',
          }}
          onPress={() => setPhotoType('after')}
        >
          <Text style={{ fontSize: Typography.fontSize.xs, fontWeight: '700', color: photoType === 'after' ? '#fff' : theme.textSecondary }}>
            🟢 Yeni / Takılan ({afterList.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Photo Grid */}
      {currentImages.length === 0 ? (
        <View style={{ backgroundColor: theme.surface, borderRadius: BorderRadius.lg, borderWidth: 1.5, borderStyle: 'dashed', borderColor: theme.border, padding: Spacing.lg, alignItems: 'center' }}>
          <Text style={{ fontSize: 32, marginBottom: 6 }}>
            {photoType === 'before' ? '🔧' : '✨'}
          </Text>
          <Text style={{ fontSize: Typography.fontSize.sm, fontWeight: '700', color: theme.textPrimary, textAlign: 'center' }}>
            {photoType === 'before'
              ? 'Henüz Eski/Bozuk Parça Fotoğrafı Yok'
              : 'Henüz Yeni Takılan Parça Fotoğrafı Yok'}
          </Text>
          <Text style={{ fontSize: Typography.fontSize.xs, color: theme.textMuted, textAlign: 'center', marginTop: 4, paddingHorizontal: Spacing.md }}>
            Müşteriye parçanın gerçekten değiştiğini göstermek için fotoğraf ekleyin.
          </Text>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
          {currentImages.map((imgUrl, idx) => (
            <View
              key={idx}
              style={{
                width: (Dimensions.get('window').width - Spacing.lg * 2 - Spacing.sm) / 2,
                height: 120,
                borderRadius: BorderRadius.md,
                overflow: 'hidden',
                position: 'relative',
                backgroundColor: theme.surface,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <TouchableOpacity
                style={{ flex: 1 }}
                onPress={() => setPreviewImage(resolveImageUrl(imgUrl))}
                activeOpacity={0.9}
              >
                <Image
                  source={{ uri: resolveImageUrl(imgUrl) }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  position: 'absolute',
                  top: 6,
                  right: 6,
                  backgroundColor: 'rgba(0,0,0,0.65)',
                  width: 26,
                  height: 26,
                  borderRadius: 13,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onPress={() => handleConfirmDelete(imgUrl)}
              >
                <Trash2 size={13} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Upload action buttons */}
      <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm }}>
        <TouchableOpacity
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            backgroundColor: theme.primary,
            borderRadius: BorderRadius.md,
            paddingVertical: 10,
            opacity: uploading ? 0.6 : 1,
          }}
          onPress={() => handlePickImage(true)}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Camera size={16} color="#fff" />
              <Text style={{ color: '#fff', fontSize: Typography.fontSize.xs, fontWeight: '700' }}>
                Fotoğraf Çek
              </Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            backgroundColor: theme.surface,
            borderRadius: BorderRadius.md,
            borderWidth: 1,
            borderColor: theme.border,
            paddingVertical: 10,
            opacity: uploading ? 0.6 : 1,
          }}
          onPress={() => handlePickImage(false)}
          disabled={uploading}
        >
          <ImageIcon size={16} color={theme.textPrimary} />
          <Text style={{ color: theme.textPrimary, fontSize: Typography.fontSize.xs, fontWeight: '700' }}>
            Galeriden Seç
          </Text>
        </TouchableOpacity>
      </View>

      {/* Full Screen Image Preview Modal */}
      <Modal visible={!!previewImage} transparent animationType="fade" onRequestClose={() => setPreviewImage(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' }}>
          <TouchableOpacity
            style={{ position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 8 }}
            onPress={() => setPreviewImage(null)}
          >
            <Text style={{ color: '#fff', fontSize: 26, fontWeight: '900' }}>✕</Text>
          </TouchableOpacity>
          {previewImage && (
            <Image
              source={{ uri: previewImage }}
              style={{ width: Dimensions.get('window').width * 0.95, height: Dimensions.get('window').height * 0.7 }}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

// ─── İş Emri Detay Ana Ekranı ───────────────────────────────────────────────
export default function WorkOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { colors: theme } = useAppTheme();
  const dynamicStyles = useMemo(() => styles(theme), [theme]);

  const [showAddPart, setShowAddPart] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['work-order', id],
    queryFn: () => workOrderAPI.getById(id),
  });

  const statusMutation = useMutation({
    mutationFn: (newStatus: string) => workOrderAPI.update(id, { status: newStatus }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['work-order', id] }),
    onError: (err: any) => Alert.alert('Hata', err?.message || 'Durum güncellenemedi.'),
  });

  const itemStatusMutation = useMutation({
    mutationFn: ({ itemId, status }: { itemId: string; status: string }) =>
      workOrderAPI.updateItemStatus(id, itemId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-order', id] });
      queryClient.invalidateQueries({ queryKey: ['warehouseStats'] });
      queryClient.invalidateQueries({ queryKey: ['parts'] });
    },
    onError: (err: any) => Alert.alert('Hata', err?.message || 'Durum güncellenemedi.'),
  });

  const removeItemMutation = useMutation({
    mutationFn: (itemId: string) => workOrderAPI.removeItem(id, itemId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['work-order', id] }),
    onError: (err: any) => Alert.alert('Hata', err?.message || 'Parça çıkarılamadı.'),
  });

  const order: any = (data as any)?.data;

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
        <Text style={{ color: theme.textSecondary }}>İş emri bulunamadı.</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: theme.primary, marginTop: 16 }}>Geri Dön</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusColor = STATUS_COLORS[order.status] || '#94A3B8';

  const total = parseFloat(order.totalAmount || 0);
  const paid = parseFloat(order.paidAmount || 0);
  const remaining = Math.max(0, total - paid);

  const paymentStatusMap = {
    ODENDI: { label: '✅ ÖDENDİ', color: theme.success, bg: theme.success + '20' },
    KISMI: { label: `🟡 KISMİ (Kalan: ₺${remaining.toLocaleString('tr-TR')})`, color: '#F59E0B', bg: '#F59E0B20' },
    VERESIYE: { label: `🔴 VERESİYE / AÇIK HESAP`, color: theme.danger, bg: theme.danger + '20' },
    BEKLIYOR: { label: '⏳ ÖDEME BEKLİYOR', color: theme.textMuted, bg: theme.border },
  }[order.paymentStatus as string] || { label: '⏳ ÖDEME BEKLİYOR', color: theme.textMuted, bg: theme.border };

  const handleItemStatusChange = (item: any) => {
    const nextStatus: Record<string, string> = {
      BEKLIYOR: 'REZERVE',
      REZERVE: 'KULLANILDI',
    };
    const next = nextStatus[item.status];
    if (!next) return;

    Alert.alert(
      'Durum Değiştir',
      `"${item.part.name}" için durum: ${ITEM_STATUS_LABELS[item.status]} → ${ITEM_STATUS_LABELS[next]}`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Onayla',
          onPress: () => itemStatusMutation.mutate({ itemId: item.id, status: next }),
        },
      ]
    );
  };

  const handleSendWhatsApp = () => {
    if (!order.customerPhone) {
      Alert.alert(
        'Telefon Eksik',
        'Bu iş emrinde müşteri telefon numarası kayıtlı değil. Lütfen müşteri bilgilerini güncelleyiniz.'
      );
      return;
    }

    Alert.alert(
      '💬 WhatsApp İle Gönder',
      `"${order.customerName || 'Müşteri'}" (${order.customerPhone}) için hangi mesajı göndermek istersiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: '📋 Servis Fişi / Hesap Özeti',
          onPress: () => {
            const msg = generateWorkOrderMessage(order);
            openWhatsApp(order.customerPhone, msg);
          },
        },
        ...(remaining > 0
          ? [
              {
                text: '🔴 Borç / Açık Hesap Hatırlatması',
                onPress: () => {
                  const msg = generateDebtReminderMessage(order);
                  openWhatsApp(order.customerPhone, msg);
                },
              },
            ]
          : []),
        {
          text: '✅ "Aracınız Hazır" Mesajı',
          onPress: () => {
            const formattedTotal = total.toLocaleString('tr-TR', { minimumFractionDigits: 2 });
            const msg = `Selamlar ${order.customerName || 'Sayın Müşterimiz'},\n\n${order.vehicleInfo ? `*${order.vehicleInfo}*` : 'Aracınız'} için servis ve bakım işlemleri tamamlandı, aracınız teslimata hazırdır! 🚗✨\n\n💰 Toplam Tutar: ₺${formattedTotal}\n\nDilediğiniz zaman teslim alabilirsiniz. Hayırlı günler dileriz!`;
            openWhatsApp(order.customerPhone, msg);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={dynamicStyles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient colors={[statusColor + 'CC', statusColor + '99'] as [string, string]} style={dynamicStyles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ color: 'rgba(255,255,255,0.8)', marginBottom: 8 }}>← Geri</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: Typography.fontSize.xl, fontWeight: '800', color: '#fff' }} numberOfLines={2}>
                {order.title}
              </Text>
              {order.customerName && <Text style={{ color: 'rgba(255,255,255,0.9)', marginTop: 4, fontWeight: '600' }}>👤 {order.customerName}</Text>}
              {order.vehicleInfo && <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: Typography.fontSize.sm }}>🚗 {order.vehicleInfo}</Text>}
            </View>
            <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: BorderRadius.full, marginLeft: Spacing.sm }}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: Typography.fontSize.sm }}>{STATUS_LABELS[order.status]}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Maliyet ve Ödeme Özeti */}
        <View style={[dynamicStyles.section, { marginTop: 0 }]}>
          <View style={dynamicStyles.costCard}>
            {[
              { label: 'Parça Satışı', value: order.partsSaleTotal, color: theme.textPrimary },
              { label: 'Parça Maliyeti', value: order.partsCostTotal, color: theme.textMuted },
              { label: 'Parça Kârı', value: order.partsProfit, color: order.partsProfit >= 0 ? theme.success : theme.danger },
              { label: 'İşçilik', value: order.laborCost, color: theme.primary },
              { label: 'TOPLAM', value: order.totalAmount, color: theme.accent, bold: true },
            ].filter((i) => i.value > 0).map((item, i) => (
              <View key={i} style={[dynamicStyles.costRow, i > 0 && { borderTopWidth: 1, borderTopColor: theme.border }]}>
                <Text style={[dynamicStyles.costLabel, item.bold && { fontWeight: '800', color: theme.textPrimary }]}>{item.label}</Text>
                <Text style={[dynamicStyles.costValue, { color: item.color }, item.bold && { fontSize: Typography.fontSize.lg, fontWeight: '800' }]}>
                  ₺{item.value.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
                </Text>
              </View>
            ))}
          </View>

          {/* 📒 Ödeme & Veresiye Takip Kartı */}
          <View style={dynamicStyles.paymentCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm }}>
              <Text style={{ fontSize: Typography.fontSize.sm, fontWeight: '800', color: theme.textPrimary }}>
                💳 Ödeme & Açık Hesap
              </Text>
              <View style={[dynamicStyles.paymentBadge, { backgroundColor: paymentStatusMap.bg }]}>
                <Text style={[dynamicStyles.paymentBadgeText, { color: paymentStatusMap.color }]}>
                  {paymentStatusMap.label}
                </Text>
              </View>
            </View>

            {/* Numbers row */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', backgroundColor: theme.background, borderRadius: BorderRadius.md, padding: Spacing.sm + 2, borderWidth: 1, borderColor: theme.border }}>
              <View>
                <Text style={{ fontSize: 10, color: theme.textMuted }}>Toplam Tutar</Text>
                <Text style={{ fontSize: Typography.fontSize.sm, fontWeight: '700', color: theme.textPrimary }}>
                  ₺{total.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                </Text>
              </View>
              <View>
                <Text style={{ fontSize: 10, color: theme.textMuted }}>Tahsil Edilen</Text>
                <Text style={{ fontSize: Typography.fontSize.sm, fontWeight: '700', color: theme.success }}>
                  ₺{paid.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 10, color: theme.textMuted }}>Kalan Borç</Text>
                <Text style={{ fontSize: Typography.fontSize.sm, fontWeight: '800', color: remaining > 0 ? theme.danger : theme.success }}>
                  ₺{remaining.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                </Text>
              </View>
            </View>

            {/* Notes & method */}
            {(order.paymentMethod || order.paymentNotes) && (
              <View style={{ marginTop: Spacing.xs }}>
                {order.paymentMethod && (
                  <Text style={{ fontSize: Typography.fontSize.xs, color: theme.textMuted }}>
                    Ödeme Şekli: <Text style={{ fontWeight: '700', color: theme.textPrimary }}>{order.paymentMethod}</Text>
                  </Text>
                )}
                {order.paymentNotes && (
                  <Text style={{ fontSize: Typography.fontSize.xs, color: theme.textSecondary, fontStyle: 'italic', marginTop: 2 }}>
                    📝 {order.paymentNotes}
                  </Text>
                )}
              </View>
            )}

            {/* Action buttons */}
            <View style={{ flexDirection: 'row', gap: Spacing.xs, marginTop: Spacing.sm }}>
              <TouchableOpacity
                style={[dynamicStyles.paymentActionBtn, { backgroundColor: theme.primary }]}
                onPress={() => setShowPaymentModal(true)}
              >
                <CreditCard size={14} color="#fff" />
                <Text style={dynamicStyles.paymentActionBtnText}>Ödeme / Tahsilat Al</Text>
              </TouchableOpacity>

              {remaining > 0 && order.customerPhone && (
                <TouchableOpacity
                  style={[dynamicStyles.paymentActionBtn, { backgroundColor: '#25D366' }]}
                  onPress={() => {
                    const msg = generateDebtReminderMessage(order);
                    openWhatsApp(order.customerPhone, msg);
                  }}
                >
                  <MessageSquare size={14} color="#fff" />
                  <Text style={dynamicStyles.paymentActionBtnText}>Borç Hatırlat</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* WhatsApp Fiş Gönder Butonu */}
          <TouchableOpacity
            style={{
              backgroundColor: '#25D366',
              borderRadius: BorderRadius.lg,
              padding: Spacing.md,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: Spacing.sm,
              marginTop: Spacing.sm,
              ...Shadows.sm,
            }}
            onPress={handleSendWhatsApp}
            activeOpacity={0.85}
          >
            <MessageSquare size={18} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: Typography.fontSize.sm }}>
              💬 Müşteriye WhatsApp Fişi / Bilgi Gönder
            </Text>
          </TouchableOpacity>
        </View>

        {/* Durum Değişimi */}
        {order.status !== 'TAMAMLANDI' && order.status !== 'IPTAL' && (
          <View style={dynamicStyles.section}>
            <Text style={dynamicStyles.sectionTitle}>Durum Değiştir</Text>
            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              {[
                { value: 'DEVAM_EDIYOR', label: '▶️ Başlat', color: '#F59E0B' },
                { value: 'TAMAMLANDI', label: '✅ Tamamla', color: '#10B981' },
                { value: 'IPTAL', label: '❌ İptal', color: '#EF4444' },
              ].filter((s) => s.value !== order.status).map((s) => (
                <TouchableOpacity
                  key={s.value}
                  style={{ flex: 1, padding: Spacing.sm, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: s.color, backgroundColor: s.color + '15', alignItems: 'center' }}
                  onPress={() => {
                    Alert.alert('Durum Değiştir', `İş emri "${s.label}" olarak işaretlensin mi?`, [
                      { text: 'İptal', style: 'cancel' },
                      { text: 'Onayla', onPress: () => statusMutation.mutate(s.value) },
                    ]);
                  }}
                >
                  <Text style={{ color: s.color, fontWeight: '700', fontSize: Typography.fontSize.sm }}>{s.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Parçalar */}
        <View style={dynamicStyles.section}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md }}>
            <Text style={dynamicStyles.sectionTitle}>🔩 Kullanılan Parçalar</Text>
            {order.status !== 'TAMAMLANDI' && order.status !== 'IPTAL' && (
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.primary + '15', borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: 8, borderWidth: 1, borderColor: theme.primary }}
                onPress={() => setShowAddPart(true)}
              >
                <Plus size={14} color={theme.primary} />
                <Text style={{ color: theme.primary, fontWeight: '700', fontSize: Typography.fontSize.sm }}>PARÇA EKLE</Text>
              </TouchableOpacity>
            )}
          </View>

          {order.items?.length === 0 ? (
            <TouchableOpacity
              style={{ backgroundColor: theme.surface, borderWidth: 2, borderStyle: 'dashed', borderColor: theme.border, borderRadius: BorderRadius.lg, padding: Spacing.xl, alignItems: 'center' }}
              onPress={() => setShowAddPart(true)}
            >
              <Text style={{ fontSize: 40, marginBottom: 8 }}>🔩</Text>
              <Text style={{ color: theme.textSecondary, fontWeight: '600' }}>Parça eklemek için dokun</Text>
            </TouchableOpacity>
          ) : (
            <View style={dynamicStyles.card}>
              {order.items.map((item: any, i: number) => {
                const itemColor = ITEM_STATUS_COLORS[item.status] || '#94A3B8';
                const canProgress = item.status === 'BEKLIYOR' || item.status === 'REZERVE';
                return (
                  <View key={item.id} style={[dynamicStyles.partItem, i < order.items.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={dynamicStyles.partName}>{item.part.name}</Text>
                      <Text style={dynamicStyles.partQty}>
                        {item.quantity} {item.part.unit} × ₺{parseFloat(item.unitPrice).toLocaleString('tr-TR')}
                        {' = '}<Text style={{ color: theme.success }}>₺{(item.quantity * parseFloat(item.unitPrice)).toLocaleString('tr-TR', { maximumFractionDigits: 2 })}</Text>
                      </Text>
                      {item.status !== 'BEKLIYOR' && (
                        <Text style={{ fontSize: Typography.fontSize.xs, color: theme.textMuted }}>
                          Stok: {item.part.quantity} | Rezerve: {item.part.reservedQuantity || 0}
                        </Text>
                      )}
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 6 }}>
                      <View style={[dynamicStyles.itemStatusBadge, { backgroundColor: itemColor + '20' }]}>
                        <Text style={[dynamicStyles.itemStatusText, { color: itemColor }]}>
                          {ITEM_STATUS_LABELS[item.status]}
                        </Text>
                      </View>
                      {canProgress && order.status !== 'IPTAL' && (
                        <TouchableOpacity
                          style={{ backgroundColor: theme.primary + '15', borderRadius: BorderRadius.sm, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: theme.primary }}
                          onPress={() => handleItemStatusChange(item)}
                          disabled={itemStatusMutation.isPending}
                        >
                          <Text style={{ color: theme.primary, fontSize: Typography.fontSize.xs, fontWeight: '700' }}>
                            {item.status === 'BEKLIYOR' ? '→ Rezerve' : '→ Kullanıldı'}
                          </Text>
                        </TouchableOpacity>
                      )}
                      {item.status !== 'KULLANILDI' && order.status !== 'TAMAMLANDI' && (
                        <TouchableOpacity
                          onPress={() => {
                            Alert.alert('Parçayı Çıkar', `"${item.part.name}" iş emrinden çıkarılsın mı?`, [
                              { text: 'İptal', style: 'cancel' },
                              { text: 'Çıkar', style: 'destructive', onPress: () => removeItemMutation.mutate(item.id) },
                            ]);
                          }}
                        >
                          <Trash2 size={16} color={theme.danger} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* 📸 Fotoğraflı Eski / Yeni Parça & Ekspertiz (Step 4) */}
        <View style={dynamicStyles.section}>
          <PhotoSection order={order} theme={theme} />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <AddPartModal visible={showAddPart} orderId={id} onClose={() => setShowAddPart(false)} theme={theme} />
      <PaymentUpdateModal visible={showPaymentModal} order={order} onClose={() => setShowPaymentModal(false)} theme={theme} />
    </SafeAreaView>
  );
}

const styles = (theme: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    header: { padding: Spacing.lg, paddingTop: Spacing.md, ...Shadows.sm },
    section: { padding: Spacing.lg, paddingBottom: 0 },
    sectionTitle: { fontSize: Typography.fontSize.base, fontWeight: '700', color: theme.textPrimary, marginBottom: Spacing.md },

    costCard: {
      backgroundColor: theme.surface,
      borderRadius: BorderRadius.lg,
      borderWidth: 1,
      borderColor: theme.border,
      overflow: 'hidden',
      ...Shadows.sm,
    },
    costRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md },
    costLabel: { fontSize: Typography.fontSize.sm, color: theme.textSecondary },
    costValue: { fontSize: Typography.fontSize.sm, fontWeight: '700' },

    paymentCard: {
      backgroundColor: theme.surface,
      borderRadius: BorderRadius.lg,
      borderWidth: 1,
      borderColor: theme.border,
      padding: Spacing.md,
      marginTop: Spacing.sm,
      ...Shadows.sm,
    },
    paymentBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: BorderRadius.full,
    },
    paymentBadgeText: {
      fontSize: 10,
      fontWeight: '800',
    },
    paymentActionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      borderRadius: BorderRadius.md,
      paddingVertical: 8,
    },
    paymentActionBtnText: {
      color: '#fff',
      fontSize: Typography.fontSize.xs,
      fontWeight: '700',
    },

    card: {
      backgroundColor: theme.surface,
      borderRadius: BorderRadius.lg,
      borderWidth: 1,
      borderColor: theme.border,
      overflow: 'hidden',
      ...Shadows.sm,
    },
    partItem: { flexDirection: 'row', alignItems: 'flex-start', padding: Spacing.md, gap: Spacing.sm },
    partName: { fontSize: Typography.fontSize.sm, fontWeight: '600', color: theme.textPrimary, marginBottom: 2 },
    partQty: { fontSize: Typography.fontSize.xs, color: theme.textSecondary },
    itemStatusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.full },
    itemStatusText: { fontSize: 11, fontWeight: '700' },
  });
