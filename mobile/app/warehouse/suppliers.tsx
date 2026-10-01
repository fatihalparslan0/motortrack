import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  RefreshControl,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { supplierAPI } from '../../src/api/client';
import { Typography, Spacing, BorderRadius, Shadows } from '../../src/constants/theme';
import { useAppTheme } from '../../src/hooks/useAppTheme';
import { useAuthStore, isTechnicianRole } from '../../src/store/auth.store';
import {
  Plus,
  Phone,
  Mail,
  MessageSquare,
  ArrowLeft,
  Search,
  Building2,
  User,
  MapPin,
  FileText,
  Edit2,
  Trash2,
  CreditCard,
  Calendar,
  Filter,
} from 'lucide-react-native';
import { openWhatsApp } from '../../src/utils/whatsapp';

// ─── Tedarikçi Ekleme / Düzenleme Modalı ─────────────────────────────────────
function SupplierFormModal({
  visible,
  supplier,
  onClose,
  theme,
}: {
  visible: boolean;
  supplier: any | null;
  onClose: () => void;
  theme: any;
}) {
  const queryClient = useQueryClient();
  const isEditing = !!supplier;

  const [form, setForm] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
  });

  React.useEffect(() => {
    if (supplier) {
      setForm({
        name: supplier.name || '',
        contactPerson: supplier.contactPerson || '',
        phone: supplier.phone || '',
        email: supplier.email || '',
        address: supplier.address || '',
        notes: supplier.notes || '',
      });
    } else {
      setForm({
        name: '',
        contactPerson: '',
        phone: '',
        email: '',
        address: '',
        notes: '',
      });
    }
  }, [supplier, visible]);

  const update = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const mutation = useMutation({
    mutationFn: () => {
      if (isEditing) {
        return supplierAPI.update(supplier.id, form);
      }
      return supplierAPI.create(form);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      onClose();
      Alert.alert('Başarılı', isEditing ? 'Tedarikçi bilgileri güncellendi! ✅' : 'Yeni tedarikçi kaydedildi! ✅');
    },
    onError: (err: any) =>
      Alert.alert('Hata', err?.response?.data?.error || err?.message || 'İşlem gerçekleştirilemedi.'),
  });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, backgroundColor: theme.background }}
      >
        <SafeAreaView style={{ flex: 1 }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: Spacing.lg,
              borderBottomWidth: 1,
              borderBottomColor: theme.border,
            }}
          >
            <Text style={{ fontSize: Typography.fontSize.lg, fontWeight: '800', color: theme.textPrimary }}>
              {isEditing ? '✏️ Tedarikçiyi Düzenle' : '🏭 Yeni Tedarikçi Ekle'}
            </Text>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <Text style={{ color: theme.primary, fontWeight: '700', fontSize: Typography.fontSize.sm }}>İptal</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: Spacing.lg }}>
            {[
              { key: 'name', label: 'Firma / Toptancı Adı *', placeholder: 'Örn: Bosch Otomotiv Ltd.', icon: Building2 },
              { key: 'contactPerson', label: 'Yetkili Kişi / Plasiyer', placeholder: 'Örn: Ahmet Usta / Mehmet Bey', icon: User },
              { key: 'phone', label: 'Telefon Numarası', placeholder: '0532 XXX XX XX', keyboard: 'phone-pad', icon: Phone },
              { key: 'email', label: 'E-posta Adresi', placeholder: 'siparis@tedarikci.com', keyboard: 'email-address', icon: Mail },
              { key: 'address', label: 'Adres / Sanayi Sitesi', placeholder: 'İkitelli OSB Bağcılar Güngören Sanayi...', icon: MapPin },
              { key: 'notes', label: 'Özel Notlar (İskonto, Vade vb.)', placeholder: '%25 iskonto, 30 gün vade...', icon: FileText, multiline: true },
            ].map((field) => (
              <View key={field.key} style={{ marginBottom: Spacing.md }}>
                <Text style={{ color: theme.textSecondary, fontSize: Typography.fontSize.xs, fontWeight: '700', marginBottom: 4 }}>
                  {field.label}
                </Text>
                <TextInput
                  style={{
                    backgroundColor: theme.surface,
                    borderWidth: 1,
                    borderColor: theme.border,
                    borderRadius: BorderRadius.md,
                    padding: Spacing.md,
                    color: theme.textPrimary,
                    fontSize: Typography.fontSize.sm,
                    minHeight: field.multiline ? 64 : 46,
                    textAlignVertical: field.multiline ? 'top' : 'center',
                  }}
                  value={(form as any)[field.key]}
                  onChangeText={(v) => update(field.key, v)}
                  placeholder={field.placeholder}
                  placeholderTextColor={theme.textMuted}
                  keyboardType={(field as any).keyboard || 'default'}
                  autoCapitalize={field.key === 'email' ? 'none' : 'words'}
                  multiline={field.multiline}
                />
              </View>
            ))}

            <TouchableOpacity
              style={{
                backgroundColor: theme.primary,
                borderRadius: BorderRadius.md,
                padding: Spacing.md,
                alignItems: 'center',
                marginTop: Spacing.sm,
                opacity: mutation.isPending ? 0.7 : 1,
                ...Shadows.sm,
              }}
              onPress={() => {
                if (!form.name.trim()) {
                  Alert.alert('Eksik Bilgi', 'Lütfen tedarikçi firma adını giriniz.');
                  return;
                }
                mutation.mutate();
              }}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: Typography.fontSize.base }}>
                  {isEditing ? '💾 Değişiklikleri Kaydet' : '🏭 Tedarikçiyi Kaydet'}
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Tedarikçiye Ödeme Yap Modalı ───────────────────────────────────────────
function SupplierPaymentModal({ visible, supplier, onClose, theme }: any) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('NAKIT');
  const [documentNo, setDocumentNo] = useState('');
  const [notes, setNotes] = useState('');

  React.useEffect(() => {
    if (supplier) {
      const bal = parseFloat(supplier.balance || 0);
      setAmount(bal > 0 ? String(bal) : '');
      setDocumentNo('');
      setNotes('');
      setPaymentMethod('NAKIT');
    }
  }, [supplier, visible]);

  const mutation = useMutation({
    mutationFn: () => supplierAPI.recordPayment(supplier.id, {
      amount: parseFloat(amount.replace(',', '.')),
      paymentMethod,
      documentNo: documentNo.trim() || undefined,
      notes: notes.trim() || undefined,
    }),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['supplierSummary'] });
      queryClient.invalidateQueries({ queryKey: ['supplierTransactions', supplier?.id] });
      queryClient.invalidateQueries({ queryKey: ['cashDaily'] });
      Alert.alert('✅ Başarılı', res?.message || 'Ödeme başarıyla kaydedildi.');
      onClose();
    },
    onError: (err: any) => {
      Alert.alert('Hata', err?.response?.data?.error || err?.message || 'Ödeme kaydedilemedi.');
    },
  });

  const handleSubmit = () => {
    if (!amount || parseFloat(amount.replace(',', '.')) <= 0) {
      Alert.alert('Hata', 'Lütfen geçerli bir ödeme tutarı girin.');
      return;
    }
    mutation.mutate();
  };

  const currentDebt = parseFloat(supplier?.balance || 0);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: theme.background }}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: theme.border }}>
            <Text style={{ fontSize: Typography.fontSize.lg, fontWeight: '800', color: theme.textPrimary }}>
              💳 Tedarikçiye Ödeme Yap
            </Text>
            <TouchableOpacity onPress={onClose} disabled={mutation.isPending}>
              <Text style={{ color: theme.primary, fontWeight: '600' }}>İptal</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: Spacing.lg }}>
            <View style={{ backgroundColor: theme.surface, borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1, borderColor: theme.border, marginBottom: Spacing.md }}>
              <Text style={{ color: theme.textSecondary, fontSize: Typography.fontSize.sm, fontWeight: '700' }}>{supplier?.name}</Text>
              <Text style={{ color: theme.textMuted, fontSize: Typography.fontSize.xs, marginTop: 2 }}>Mevcut Cari Borç Durumu</Text>
              <Text style={{ color: currentDebt > 0 ? '#EF4444' : theme.success, fontSize: Typography.fontSize.xl, fontWeight: '900', marginTop: 4 }}>
                ₺{currentDebt.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </Text>
            </View>

            {/* Ödeme Tutarı */}
            <Text style={{ color: theme.textMuted, fontSize: Typography.fontSize.xs, marginBottom: 4, fontWeight: '700' }}>Ödeme Tutarı (₺) *</Text>
            <TextInput
              style={{ backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: BorderRadius.md, padding: Spacing.md, color: theme.textPrimary, fontSize: Typography.fontSize.lg, fontWeight: '700', marginBottom: Spacing.md }}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={theme.textMuted}
              value={amount}
              onChangeText={setAmount}
            />

            {/* Ödeme Yöntemi */}
            <Text style={{ color: theme.textMuted, fontSize: Typography.fontSize.xs, marginBottom: 4, fontWeight: '700' }}>Ödeme Yöntemi</Text>
            <View style={{ flexDirection: 'row', gap: Spacing.xs, marginBottom: Spacing.xs }}>
              {[
                { id: 'NAKIT', label: '💵 Nakit' },
                { id: 'HAVALE', label: '🏦 Havale/EFT' },
                { id: 'KREDI_KARTI', label: '💳 Kart' },
                { id: 'CEK', label: '📄 Çek' },
              ].map(m => (
                <TouchableOpacity
                  key={m.id}
                  onPress={() => setPaymentMethod(m.id)}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    borderRadius: BorderRadius.sm,
                    borderWidth: 1,
                    borderColor: paymentMethod === m.id ? theme.primary : theme.border,
                    backgroundColor: paymentMethod === m.id ? theme.primary + '15' : theme.surface,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: paymentMethod === m.id ? theme.primary : theme.textSecondary, fontSize: Typography.fontSize.xs, fontWeight: '700' }}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Kasa Etkisi Bilgi Rozeti */}
            <View style={{ backgroundColor: paymentMethod === 'NAKIT' ? theme.danger + '12' : '#3B82F612', borderWidth: 1, borderColor: paymentMethod === 'NAKIT' ? theme.danger + '30' : '#3B82F630', borderRadius: BorderRadius.sm, padding: Spacing.sm, marginBottom: Spacing.md }}>
              <Text style={{ fontSize: Typography.fontSize.xs, color: paymentMethod === 'NAKIT' ? theme.danger : '#2563EB', fontWeight: '700' }}>
                {paymentMethod === 'NAKIT' 
                  ? '💵 Bu ödeme Atölye Kasası günlük nakit çıkışına işlenecektir.'
                  : '🏦 Bu ödeme şirket banka/hesap çıkışı olarak kayıtlara işlenecektir.'}
              </Text>
            </View>

            {/* Dekont / Makbuz No */}
            <Text style={{ color: theme.textMuted, fontSize: Typography.fontSize.xs, marginBottom: 4 }}>Dekont / Makbuz No (Opsiyonel)</Text>
            <TextInput
              style={{ backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: BorderRadius.md, padding: Spacing.md, color: theme.textPrimary, marginBottom: Spacing.md }}
              placeholder="Örn: DEK-99213"
              placeholderTextColor={theme.textMuted}
              value={documentNo}
              onChangeText={setDocumentNo}
            />

            {/* Not */}
            <Text style={{ color: theme.textMuted, fontSize: Typography.fontSize.xs, marginBottom: 4 }}>Açıklama / Not</Text>
            <TextInput
              style={{ backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: BorderRadius.md, padding: Spacing.md, color: theme.textPrimary, height: 70, textAlignVertical: 'top', marginBottom: Spacing.lg }}
              multiline
              placeholder="Örn: Cuma haftalık parçacı ödemesi yapıldı"
              placeholderTextColor={theme.textMuted}
              value={notes}
              onChangeText={setNotes}
            />

            <TouchableOpacity
              style={{ backgroundColor: theme.success, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', opacity: mutation.isPending ? 0.7 : 1 }}
              onPress={handleSubmit}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: Typography.fontSize.base }}>
                  ✅ Ödemeyi Kaydet ve Borçtan Düş
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Tedarikçi Cari Ekstresi Modalı ──────────────────────────────────────────
type DateFilterType = 'ALL' | 'TODAY' | 'LAST_10_DAYS' | 'THIS_MONTH' | 'CUSTOM';
type TxType = 'ALL' | 'ALIS' | 'ODEME' | 'IADE';

function SupplierTransactionsModal({ visible, supplier, onClose, theme }: any) {
  const [dateFilter, setDateFilter] = useState<DateFilterType>('ALL');
  const [txType, setTxType] = useState<TxType>('ALL');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Tarih aralığı ve etiket hesaplama
  const { startDate, endDate, filterLabel } = useMemo(() => {
    const now = new Date();
    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    if (dateFilter === 'TODAY') {
      const todayStr = formatDate(now);
      return { startDate: todayStr, endDate: todayStr, filterLabel: 'Bugün' };
    }
    if (dateFilter === 'LAST_10_DAYS') {
      const past = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
      return { startDate: formatDate(past), endDate: formatDate(now), filterLabel: 'Son 10 Gün' };
    }
    if (dateFilter === 'THIS_MONTH') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return { startDate: formatDate(startOfMonth), endDate: formatDate(now), filterLabel: 'Bu Ay' };
    }
    if (dateFilter === 'CUSTOM' && customStart) {
      return {
        startDate: customStart.trim(),
        endDate: customEnd.trim() || formatDate(now),
        filterLabel: `${customStart} - ${customEnd || 'Bugün'}`,
      };
    }
    return { startDate: undefined, endDate: undefined, filterLabel: 'Tüm Zamanlar' };
  }, [dateFilter, customStart, customEnd]);

  const { data, isLoading } = useQuery({
    queryKey: ['supplierTransactions', supplier?.id, startDate, endDate, txType],
    queryFn: () =>
      supplierAPI.getTransactions(supplier.id, {
        limit: 100,
        startDate,
        endDate,
        type: txType !== 'ALL' ? txType : undefined,
      }),
    enabled: visible && !!supplier?.id,
  });

  const transactions: any[] = (data as any)?.data?.data || (data as any)?.data || [];
  const periodSummary = (data as any)?.data?.periodSummary || (data as any)?.periodSummary || {
    totalAlis: 0,
    totalOdeme: 0,
    totalIade: 0,
    netChange: 0,
    currentBalance: parseFloat(supplier?.balance || 0),
  };

  const handleShareWhatsApp = () => {
    if (!supplier?.phone) {
      Alert.alert('Telefon Yok', 'Tedarikçinin telefon numarası kayıtlı değil.');
      return;
    }

    const text =
      `*Cari Hesap Ekstresi & Mutabakat*\n` +
      `🏢 Tedarikçi: *${supplier.name}*\n` +
      `📅 Dönem: ${filterLabel}\n` +
      `────────────────\n` +
      `📦 Dönem Alışları: ₺${Number(periodSummary.totalAlis || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}\n` +
      `💳 Yapılan Ödemeler: ₺${Number(periodSummary.totalOdeme || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}\n` +
      (periodSummary.totalIade > 0 ? `↩️ İadeler: ₺${Number(periodSummary.totalIade).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}\n` : '') +
      `────────────────\n` +
      `🔴 *Güncel Borç Bakiyemiz: ₺${Number(supplier.balance || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}*\n\n` +
      `Hesap hareketlerinizi kontrol ederek teyit etmenizi rica eder, hayırlı işler dileriz.`;

    openWhatsApp(supplier.phone, text);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: theme.border }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: Typography.fontSize.lg, fontWeight: '800', color: theme.textPrimary }}>
              📜 Cari Hesap Ekstresi
            </Text>
            <Text style={{ fontSize: Typography.fontSize.xs, color: theme.textSecondary }}>{supplier?.name}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
            {supplier?.phone && (
              <TouchableOpacity
                onPress={handleShareWhatsApp}
                style={{
                  backgroundColor: '#25D366',
                  borderRadius: BorderRadius.md,
                  paddingHorizontal: Spacing.sm + 2,
                  paddingVertical: 6,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <MessageSquare size={13} color="#fff" />
                <Text style={{ color: '#fff', fontSize: Typography.fontSize.xs, fontWeight: '700' }}>Mutabakat Gönder</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <Text style={{ color: theme.primary, fontWeight: '700' }}>Kapat</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Filtreler ve Dönem Özeti */}
        <View style={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.xs }}>
          {/* Hızlı Tarih Aralıkları */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {[
              { id: 'ALL', label: 'Tümü' },
              { id: 'TODAY', label: 'Bugün' },
              { id: 'LAST_10_DAYS', label: 'Son 10 Gün' },
              { id: 'THIS_MONTH', label: 'Bu Ay' },
              { id: 'CUSTOM', label: '📅 Özel Tarih' },
            ].map((tab) => {
              const isSel = dateFilter === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  onPress={() => setDateFilter(tab.id as DateFilterType)}
                  style={{
                    paddingHorizontal: Spacing.md,
                    paddingVertical: 6,
                    borderRadius: BorderRadius.full,
                    backgroundColor: isSel ? theme.primary : theme.surface,
                    borderWidth: 1,
                    borderColor: isSel ? theme.primary : theme.border,
                  }}
                >
                  <Text style={{ color: isSel ? '#fff' : theme.textSecondary, fontSize: Typography.fontSize.xs, fontWeight: '700' }}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Özel Tarih Seçim Alanı */}
          {dateFilter === 'CUSTOM' && (
            <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm }}>
              <TextInput
                style={{
                  flex: 1,
                  backgroundColor: theme.surface,
                  borderWidth: 1,
                  borderColor: theme.border,
                  borderRadius: BorderRadius.md,
                  paddingHorizontal: Spacing.sm,
                  paddingVertical: 6,
                  fontSize: Typography.fontSize.xs,
                  color: theme.textPrimary,
                }}
                placeholder="Başlangıç (YYYY-AA-GG)"
                placeholderTextColor={theme.textMuted}
                value={customStart}
                onChangeText={setCustomStart}
              />
              <TextInput
                style={{
                  flex: 1,
                  backgroundColor: theme.surface,
                  borderWidth: 1,
                  borderColor: theme.border,
                  borderRadius: BorderRadius.md,
                  paddingHorizontal: Spacing.sm,
                  paddingVertical: 6,
                  fontSize: Typography.fontSize.xs,
                  color: theme.textPrimary,
                }}
                placeholder="Bitiş (YYYY-AA-GG)"
                placeholderTextColor={theme.textMuted}
                value={customEnd}
                onChangeText={setCustomEnd}
              />
            </View>
          )}

          {/* Hareket Türü Filtresi */}
          <View style={{ flexDirection: 'row', gap: 6, marginTop: Spacing.sm }}>
            {[
              { id: 'ALL', label: 'Tümü' },
              { id: 'ALIS', label: '📦 Alışlar' },
              { id: 'ODEME', label: '💳 Ödemeler' },
              { id: 'IADE', label: '↩️ İadeler' },
            ].map((tab) => {
              const isSel = txType === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  onPress={() => setTxType(tab.id as TxType)}
                  style={{
                    flex: 1,
                    paddingVertical: 5,
                    alignItems: 'center',
                    borderRadius: BorderRadius.sm,
                    backgroundColor: isSel ? theme.primary + '20' : theme.surface,
                    borderWidth: 1,
                    borderColor: isSel ? theme.primary : theme.border,
                  }}
                >
                  <Text style={{ color: isSel ? theme.primary : theme.textMuted, fontSize: 11, fontWeight: '700' }}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Dönem Özet Kartı */}
          <View
            style={{
              backgroundColor: theme.surface,
              borderRadius: BorderRadius.md,
              borderWidth: 1,
              borderColor: theme.border,
              padding: Spacing.sm + 2,
              marginTop: Spacing.sm,
              flexDirection: 'row',
              justifyContent: 'space-between',
              ...Shadows.sm,
            }}
          >
            <View>
              <Text style={{ fontSize: 10, color: theme.textMuted, fontWeight: '600' }}>Dönem Alış</Text>
              <Text style={{ fontSize: Typography.fontSize.sm, fontWeight: '800', color: '#DC2626', marginTop: 1 }}>
                +₺{Number(periodSummary.totalAlis || 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
              </Text>
            </View>
            <View>
              <Text style={{ fontSize: 10, color: theme.textMuted, fontWeight: '600' }}>Dönem Ödeme</Text>
              <Text style={{ fontSize: Typography.fontSize.sm, fontWeight: '800', color: theme.success, marginTop: 1 }}>
                -₺{Number(periodSummary.totalOdeme || 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 10, color: theme.textMuted, fontWeight: '600' }}>Toplam Güncel Borç</Text>
              <Text style={{ fontSize: Typography.fontSize.sm, fontWeight: '900', color: Number(supplier?.balance || 0) > 0 ? '#DC2626' : theme.success, marginTop: 1 }}>
                ₺{Number(supplier?.balance || 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
              </Text>
            </View>
          </View>
        </View>

        {isLoading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator color={theme.primary} size="large" />
          </View>
        ) : (
          <FlatList
            data={transactions}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: Spacing.lg, paddingTop: Spacing.xs }}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', marginTop: 30, paddingHorizontal: Spacing.lg }}>
                <Text style={{ fontSize: 32, marginBottom: 8 }}>📜</Text>
                <Text style={{ color: theme.textPrimary, fontWeight: '700', fontSize: Typography.fontSize.sm }}>
                  Hareket Bulunamadı
                </Text>
                <Text style={{ color: theme.textMuted, textAlign: 'center', fontSize: Typography.fontSize.xs, marginTop: 4 }}>
                  {filterLabel} döneminde seçilen kriterlere uygun cari işlem kaydı bulunmuyor.
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const isPurchase = item.type === 'ALIS';
              const isPayment = item.type === 'ODEME';
              const badgeColor = isPurchase ? '#EF4444' : isPayment ? '#10B981' : '#3B82F6';
              const typeText = isPurchase ? '📦 Malzeme Alımı' : isPayment ? '💳 Ödeme Yapıldı' : '↩️ Parça İadesi';

              return (
                <View
                  style={{
                    backgroundColor: theme.surface,
                    borderWidth: 1,
                    borderColor: theme.border,
                    borderRadius: BorderRadius.md,
                    padding: Spacing.md,
                    marginBottom: Spacing.sm,
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ color: badgeColor, fontWeight: '800', fontSize: Typography.fontSize.sm }}>
                        {typeText}
                      </Text>
                      {item.paymentMethod && (
                        <View style={{ backgroundColor: theme.background, paddingHorizontal: 6, paddingVertical: 2, borderRadius: BorderRadius.sm }}>
                          <Text style={{ color: theme.textMuted, fontSize: Typography.fontSize.xs }}>{item.paymentMethod}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={{ color: badgeColor, fontSize: Typography.fontSize.base, fontWeight: '900' }}>
                      {isPurchase ? '+' : '-'}₺{parseFloat(item.amount).toLocaleString('tr-TR')}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                    <Text style={{ color: theme.textMuted, fontSize: Typography.fontSize.xs }}>
                      {new Date(item.createdAt).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    {item.documentNo && (
                      <Text style={{ color: theme.textSecondary, fontSize: Typography.fontSize.xs, fontWeight: '600' }}>
                        No: {item.documentNo}
                      </Text>
                    )}
                  </View>

                  {item.notes && (
                    <Text style={{ color: theme.textSecondary, fontSize: Typography.fontSize.xs, marginTop: 4, fontStyle: 'italic' }}>
                      {item.notes}
                    </Text>
                  )}
                </View>
              );
            }}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

// ─── Tedarikçiler Ekranı ────────────────────────────────────────────────────
export default function SuppliersScreen() {
  const { colors: theme } = useAppTheme();
  const { user } = useAuthStore();
  const isTechnician = isTechnicianRole(user?.role);
  const queryClient = useQueryClient();

  if (isTechnician) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl }}>
        <Text style={{ fontSize: 56, marginBottom: Spacing.md }}>🔒</Text>
        <Text style={{ fontSize: Typography.fontSize.xl, fontWeight: '800', color: theme.textPrimary, marginBottom: Spacing.xs, textAlign: 'center' }}>
          Yetkisiz Erişim
        </Text>
        <Text style={{ color: theme.textSecondary, textAlign: 'center', marginBottom: Spacing.xl, fontSize: Typography.fontSize.sm, lineHeight: 20 }}>
          Parçacı borçları, cari hesaplar ve tedarikçi finansal yönetimi sadece Atölye Yöneticisi ve Admin yetkisine açıktır.
        </Text>
        <TouchableOpacity
          style={{
            backgroundColor: theme.primary,
            paddingHorizontal: Spacing.xl,
            paddingVertical: Spacing.md,
            borderRadius: BorderRadius.md,
          }}
          onPress={() => router.back()}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: Typography.fontSize.sm }}>Geri Dön</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const [search, setSearch] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<any | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [paymentSupplier, setPaymentSupplier] = useState<any | null>(null);
  const [transactionsSupplier, setTransactionsSupplier] = useState<any | null>(null);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['suppliers', search],
    queryFn: () => supplierAPI.getAll({ search: search.trim() || undefined }),
    placeholderData: (prev: any) => prev,
  });

  const { data: summaryData } = useQuery({
    queryKey: ['supplierSummary'],
    queryFn: () => supplierAPI.getSummary(),
  });
  const summary = (summaryData as any)?.data;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => supplierAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      Alert.alert('Başarılı', 'Tedarikçi başarıyla silindi.');
    },
    onError: (err: any) =>
      Alert.alert('Hata', err?.response?.data?.error || err?.message || 'Tedarikçi silinemedi.'),
  });

  const suppliers: any[] = (data as any)?.data || [];

  const handleCall = (phone: string | null | undefined) => {
    if (!phone) {
      Alert.alert('Telefon Yok', 'Bu tedarikçiye ait telefon numarası kayıtlı değil.');
      return;
    }
    Linking.openURL(`tel:${phone.replace(/\s+/g, '')}`);
  };

  const handleWhatsApp = (item: any) => {
    if (!item.phone) {
      Alert.alert('Telefon Yok', 'Bu tedarikçiye ait telefon numarası kayıtlı değil.');
      return;
    }
    const msg = `Selamlar ${item.contactPerson || item.name}, hayırlı işler! Kolay gelsin.`;
    openWhatsApp(item.phone, msg);
  };

  const handleEdit = (supplier: any) => {
    setSelectedSupplier(supplier);
    setShowModal(true);
  };

  const handleAddNew = () => {
    setSelectedSupplier(null);
    setShowModal(true);
  };

  const handleDelete = (item: any) => {
    Alert.alert('Tedarikçiyi Sil', `"${item.name}" tedarikçisini silmek istediğinize emin misiniz?`, [
      { text: 'İptal', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: () => deleteMutation.mutate(item.id) },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top']}>
      {/* Header */}
      <LinearGradient
        colors={[theme.primary + 'EE', theme.primaryDark || '#1E40AF'] as [string, string]}
        style={{
          padding: Spacing.lg,
          paddingTop: Spacing.md,
          borderBottomLeftRadius: BorderRadius.xl,
          borderBottomRightRadius: BorderRadius.xl,
          marginBottom: Spacing.sm,
          ...Shadows.md,
        }}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <ArrowLeft size={18} color="rgba(255,255,255,0.9)" />
            <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: Typography.fontSize.sm, fontWeight: '600' }}>Geri</Text>
          </View>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ fontSize: Typography.fontSize.xl, fontWeight: '900', color: '#fff' }}>
              🏭 Tedarikçiler
            </Text>
            <Text style={{ fontSize: Typography.fontSize.xs, color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>
              Yedek Parça Toptancıları & Plasiyer Rehberi ({suppliers.length})
            </Text>
          </View>

          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: 'rgba(255,255,255,0.25)',
              borderRadius: BorderRadius.md,
              paddingHorizontal: Spacing.md,
              paddingVertical: Spacing.sm,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.35)',
            }}
            onPress={handleAddNew}
          >
            <Plus size={16} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: Typography.fontSize.sm }}>Yeni Ekle</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Cari Borç Özeti Banner */}
      {summary && Number(summary.totalDebt || 0) > 0 && (
        <View style={{ paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm }}>
          <View
            style={{
              backgroundColor: '#FEF2F2',
              borderColor: '#FECACA',
              borderWidth: 1,
              borderRadius: BorderRadius.lg,
              padding: Spacing.md,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              ...Shadows.sm,
            }}
          >
            <View>
              <Text style={{ fontSize: Typography.fontSize.xs, color: '#991B1B', fontWeight: '700', textTransform: 'uppercase' }}>
                Parçacı Toplam Borç Bakiyesi
              </Text>
              <Text style={{ fontSize: Typography.fontSize.xl, fontWeight: '900', color: '#DC2626', marginTop: 2 }}>
                ₺{Number(summary.totalDebt).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
              <Text style={{ fontSize: 11, color: '#B91C1C', marginTop: 2 }}>
                {summary.supplierCountWithDebt || 0} tedarikçiye açık hesap borç bulunuyor
              </Text>
            </View>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: '#FEE2E2',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 22 }}>🧾</Text>
            </View>
          </View>
        </View>
      )}

      {/* Search Input */}
      <View style={{ paddingHorizontal: Spacing.lg, paddingVertical: Spacing.xs }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.surface,
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: BorderRadius.md,
            paddingHorizontal: Spacing.md,
            height: 44,
            gap: Spacing.sm,
          }}
        >
          <Search size={18} color={theme.textMuted} />
          <TextInput
            style={{ flex: 1, color: theme.textPrimary, fontSize: Typography.fontSize.sm }}
            placeholder="Tedarikçi adı, yetkili veya telefon ara..."
            placeholderTextColor={theme.textMuted}
            value={search}
            onChangeText={setSearch}
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {/* List */}
      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={{ color: theme.textSecondary, marginTop: Spacing.sm, fontSize: Typography.fontSize.sm }}>
            Tedarikçiler yükleniyor...
          </Text>
        </View>
      ) : (
        <FlatList
          data={suppliers}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 60, gap: Spacing.md }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.primary} />
          }
          renderItem={({ item }) => (
            <View
              style={{
                backgroundColor: theme.surface,
                borderRadius: BorderRadius.lg,
                borderWidth: 1,
                borderColor: theme.border,
                padding: Spacing.md,
                ...Shadows.sm,
              }}
            >
              {/* Header: Name & Record Count */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: Typography.fontSize.base, fontWeight: '800', color: theme.textPrimary }}>
                    {item.name}
                  </Text>
                  {item.contactPerson && (
                    <Text style={{ color: theme.textSecondary, fontSize: Typography.fontSize.sm, marginTop: 2, fontWeight: '600' }}>
                      👤 Yetkili: {item.contactPerson}
                    </Text>
                  )}
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={{ backgroundColor: theme.primary + '15', paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.full }}>
                    <Text style={{ color: theme.primary, fontSize: Typography.fontSize.xs, fontWeight: '700' }}>
                      {item._count?.purchaseRecords || 0} alım
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={{ padding: 4 }}
                    onPress={() => handleEdit(item)}
                  >
                    <Edit2 size={16} color={theme.textMuted} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{ padding: 4 }}
                    onPress={() => handleDelete(item)}
                  >
                    <Trash2 size={16} color={theme.danger} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Cari Bakiye Durumu & Butonlar */}
              <View
                style={{
                  marginTop: Spacing.sm,
                  backgroundColor: Number(item.balance || 0) > 0 ? '#FEF2F2' : theme.background,
                  borderRadius: BorderRadius.md,
                  borderWidth: 1,
                  borderColor: Number(item.balance || 0) > 0 ? '#FECACA' : theme.border,
                  padding: Spacing.sm,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 10, color: Number(item.balance || 0) > 0 ? '#991B1B' : theme.textMuted, fontWeight: '700', textTransform: 'uppercase' }}>
                    Cari Borç Durumu
                  </Text>
                  <Text
                    style={{
                      fontSize: Typography.fontSize.sm,
                      fontWeight: '800',
                      color: Number(item.balance || 0) > 0 ? '#DC2626' : theme.textSecondary,
                      marginTop: 1,
                    }}
                  >
                    {Number(item.balance || 0) > 0
                      ? `₺${Number(item.balance).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} Borç`
                      : Number(item.balance || 0) < 0
                      ? `₺${Math.abs(Number(item.balance)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} Alacak`
                      : 'Borç Yok (0 ₺)'}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <TouchableOpacity
                    style={{
                      backgroundColor: theme.primary,
                      borderRadius: BorderRadius.sm,
                      paddingHorizontal: Spacing.sm + 2,
                      paddingVertical: 6,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                    }}
                    onPress={() => setPaymentSupplier(item)}
                  >
                    <CreditCard size={13} color="#fff" />
                    <Text style={{ color: '#fff', fontSize: Typography.fontSize.xs, fontWeight: '700' }}>Öde</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      backgroundColor: theme.surface,
                      borderWidth: 1,
                      borderColor: theme.border,
                      borderRadius: BorderRadius.sm,
                      paddingHorizontal: Spacing.sm + 2,
                      paddingVertical: 6,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                    }}
                    onPress={() => setTransactionsSupplier(item)}
                  >
                    <FileText size={13} color={theme.textPrimary} />
                    <Text style={{ color: theme.textPrimary, fontSize: Typography.fontSize.xs, fontWeight: '700' }}>Ekstre</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Contact Info */}
              <View style={{ marginTop: Spacing.sm, gap: 4 }}>
                {item.phone && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Phone size={13} color={theme.textMuted} />
                    <Text style={{ color: theme.textSecondary, fontSize: Typography.fontSize.xs }}>{item.phone}</Text>
                  </View>
                )}

                {item.email && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Mail size={13} color={theme.textMuted} />
                    <Text style={{ color: theme.textSecondary, fontSize: Typography.fontSize.xs }} numberOfLines={1}>
                      {item.email}
                    </Text>
                  </View>
                )}

                {item.address && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <MapPin size={13} color={theme.textMuted} />
                    <Text style={{ color: theme.textSecondary, fontSize: Typography.fontSize.xs }} numberOfLines={1}>
                      {item.address}
                    </Text>
                  </View>
                )}

                {item.notes && (
                  <View style={{ backgroundColor: theme.background, borderRadius: BorderRadius.sm, padding: Spacing.xs + 2, marginTop: 4 }}>
                    <Text style={{ color: theme.textMuted, fontSize: Typography.fontSize.xs, fontStyle: 'italic' }}>
                      📝 {item.notes}
                    </Text>
                  </View>
                )}
              </View>

              {/* Action Buttons Row */}
              <View
                style={{
                  flexDirection: 'row',
                  gap: Spacing.xs,
                  marginTop: Spacing.md,
                  paddingTop: Spacing.sm,
                  borderTopWidth: 1,
                  borderTopColor: theme.border,
                }}
              >
                {item.phone && (
                  <>
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        backgroundColor: '#25D366',
                        borderRadius: BorderRadius.md,
                        paddingVertical: 8,
                      }}
                      onPress={() => handleWhatsApp(item)}
                      activeOpacity={0.8}
                    >
                      <MessageSquare size={14} color="#fff" />
                      <Text style={{ color: '#fff', fontSize: Typography.fontSize.xs, fontWeight: '800' }}>WhatsApp</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        backgroundColor: theme.primary,
                        borderRadius: BorderRadius.md,
                        paddingVertical: 8,
                      }}
                      onPress={() => handleCall(item.phone)}
                      activeOpacity={0.8}
                    >
                      <Phone size={14} color="#fff" />
                      <Text style={{ color: '#fff', fontSize: Typography.fontSize.xs, fontWeight: '800' }}>Ara</Text>
                    </TouchableOpacity>
                  </>
                )}

                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    borderWidth: 1,
                    borderColor: theme.border,
                    borderRadius: BorderRadius.md,
                    paddingHorizontal: Spacing.md,
                    paddingVertical: 8,
                  }}
                  onPress={() => handleEdit(item)}
                >
                  <Edit2 size={13} color={theme.textPrimary} />
                  <Text style={{ color: theme.textPrimary, fontSize: Typography.fontSize.xs, fontWeight: '700' }}>Düzenle</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 60, paddingHorizontal: Spacing.xl }}>
              <Text style={{ fontSize: 56, marginBottom: Spacing.md }}>🏭</Text>
              <Text style={{ fontSize: Typography.fontSize.lg, fontWeight: '800', color: theme.textPrimary, marginBottom: Spacing.xs, textAlign: 'center' }}>
                Tedarikçi Bulunamadı
              </Text>
              <Text style={{ color: theme.textMuted, marginBottom: Spacing.lg, textAlign: 'center', fontSize: Typography.fontSize.sm }}>
                {search ? 'Aramanıza uygun tedarikçi bulunamadı.' : 'Sık çalıştığınız parçacıları ve toptancıları buraya ekleyin.'}
              </Text>
              <TouchableOpacity
                style={{
                  backgroundColor: theme.primary,
                  paddingHorizontal: Spacing.xl,
                  paddingVertical: Spacing.md,
                  borderRadius: BorderRadius.md,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  ...Shadows.sm,
                }}
                onPress={handleAddNew}
              >
                <Plus size={16} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: Typography.fontSize.sm }}>Yeni Tedarikçi Ekle</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Modals */}
      <SupplierFormModal
        visible={showModal}
        supplier={selectedSupplier}
        onClose={() => {
          setShowModal(false);
          setSelectedSupplier(null);
        }}
        theme={theme}
      />

      <SupplierPaymentModal
        visible={!!paymentSupplier}
        supplier={paymentSupplier}
        onClose={() => setPaymentSupplier(null)}
        theme={theme}
      />

      <SupplierTransactionsModal
        visible={!!transactionsSupplier}
        supplier={transactionsSupplier}
        onClose={() => setTransactionsSupplier(null)}
        theme={theme}
      />
    </SafeAreaView>
  );
}
