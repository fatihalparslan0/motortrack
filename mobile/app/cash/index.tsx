import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { cashAPI, supplierAPI } from '../../src/api/client';
import { Typography, Spacing, BorderRadius, Shadows } from '../../src/constants/theme';
import { useAppTheme } from '../../src/hooks/useAppTheme';

function toLocalISODate(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [y, m, d] = parts.map(Number);
  const dateObj = new Date(y, m - 1, d);
  return dateObj.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}
import {
  ArrowLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  CreditCard,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Plus,
  Trash2,
  MessageSquare,
  FileText,
  Clock,
  Briefcase,
  Coffee,
  Wrench,
  Fuel,
  Receipt,
  UserCheck,
} from 'lucide-react-native';
import { openWhatsApp } from '../../src/utils/whatsapp';

const EXPENSE_CATEGORIES = [
  { id: 'TEDARIKCI', label: 'Parçacı / Tedarikçi Ödemesi', icon: '📦' },
  { id: 'YEMEK', label: 'Yemek & Çay', icon: '🍲' },
  { id: 'PERSONEL', label: 'Çırak / Usta Harçlığı', icon: '👷' },
  { id: 'MALZEME', label: 'Hırdavat & Nalburiye', icon: '🛠️' },
  { id: 'KARGO_YAKIT', label: 'Kargo & Akaryakıt', icon: '⛽' },
  { id: 'FATURA_KIRA', label: 'Dükkan / Kira / Fatura', icon: '🏢' },
  { id: 'DIGER', label: 'Diğer Masraf', icon: '📝' },
];

const INCOME_CATEGORIES = [
  { id: 'DEVIR_GIRIS', label: 'Kasa Açılış Devir Nakdi', icon: '🌅' },
  { id: 'ORTAK_EKLEME', label: 'Patron / Sermaye Ekleme', icon: '💼' },
  { id: 'HURDA_CIKMA', label: 'Hurda / Çıkma Parça Satışı', icon: '♻️' },
  { id: 'DIGER_GIRIS', label: 'Diğer Harici Giriş', icon: '➕' },
];

// ─── Masraf / Çıkış Ekleme Modalı ──────────────────────────────────────────
function AddExpenseModal({
  visible,
  date,
  onClose,
  theme,
}: {
  visible: boolean;
  date: string;
  onClose: () => void;
  theme: any;
}) {
  const queryClient = useQueryClient();
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0].id);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [documentNo, setDocumentNo] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('NAKIT');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);

  // Tedarikçileri çek
  const { data: suppliersRes } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => supplierAPI.getAll(),
    enabled: visible,
  });
  const suppliers: any[] = suppliersRes?.data || [];

  const mutation = useMutation({
    mutationFn: () =>
      cashAPI.addTransaction({
        type: 'OUT',
        category,
        amount: parseFloat(amount.replace(',', '.')),
        paymentMethod,
        description: description.trim() || undefined,
        documentNo: documentNo.trim() || undefined,
        date,
        supplierId: category === 'TEDARIKCI' ? (selectedSupplierId || undefined) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashDaily'] });
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['supplierSummary'] });
      queryClient.invalidateQueries({ queryKey: ['supplierTransactions'] });
      setAmount('');
      setDescription('');
      setDocumentNo('');
      setSelectedSupplierId(null);
      onClose();
      Alert.alert(
        '✅ Kaydedildi',
        category === 'TEDARIKCI'
          ? 'Ödeme kasadan düşüldü ve parçacının cari borcundan düşüldü.'
          : 'Masraf kasadan başarıyla düşüldü.'
      );
    },
    onError: (err: any) =>
      Alert.alert('Hata', err?.response?.data?.error || err?.message || 'Masraf kaydedilemedi.'),
  });

  const handleSubmit = () => {
    if (!amount || parseFloat(amount.replace(',', '.')) <= 0) {
      Alert.alert('Hata', 'Lütfen geçerli bir masraf tutarı girin.');
      return;
    }
    mutation.mutate();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: theme.background }}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: theme.border }}>
            <View>
              <Text style={{ fontSize: Typography.fontSize.lg, fontWeight: '800', color: theme.textPrimary }}>
                📤 Masraf / Gider Çıkışı
              </Text>
              <Text style={{ fontSize: Typography.fontSize.xs, color: theme.textSecondary, marginTop: 2 }}>
                Kasadan harcanan günlük dükkan giderlerini işleyin
              </Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ color: theme.primary, fontWeight: '700' }}>Kapat</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.md }}>
            {/* Tutar */}
            <View>
              <Text style={{ fontSize: Typography.fontSize.xs, fontWeight: '700', color: theme.textSecondary, marginBottom: 4 }}>
                MASRAF TUTARI (₺) *
              </Text>
              <TextInput
                style={{
                  backgroundColor: theme.surface,
                  borderWidth: 1.5,
                  borderColor: theme.danger + '80',
                  borderRadius: BorderRadius.md,
                  padding: Spacing.md,
                  color: theme.danger,
                  fontSize: Typography.fontSize.xl,
                  fontWeight: '800',
                }}
                keyboardType="decimal-pad"
                placeholder="0,00"
                placeholderTextColor={theme.textMuted}
                value={amount}
                onChangeText={setAmount}
                autoFocus
              />
            </View>

            {/* Kategori Seçimi */}
            <View>
              <Text style={{ fontSize: Typography.fontSize.xs, fontWeight: '700', color: theme.textSecondary, marginBottom: 6 }}>
                MASRAF KATEGORİSİ *
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {EXPENSE_CATEGORIES.map((c) => {
                  const isSel = category === c.id;
                  return (
                    <TouchableOpacity
                      key={c.id}
                      onPress={() => setCategory(c.id)}
                      style={{
                        paddingHorizontal: Spacing.md,
                        paddingVertical: 8,
                        borderRadius: BorderRadius.md,
                        borderWidth: 1.5,
                        borderColor: isSel ? theme.danger : theme.border,
                        backgroundColor: isSel ? theme.danger + '15' : theme.surface,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <Text style={{ fontSize: 16 }}>{c.icon}</Text>
                      <Text style={{ color: isSel ? theme.danger : theme.textPrimary, fontSize: Typography.fontSize.xs, fontWeight: isSel ? '800' : '600' }}>
                        {c.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Tedarikçi Seçimi (Eğer Kategori TEDARIKCI ise) */}
            {category === 'TEDARIKCI' && (
              <View style={{ backgroundColor: theme.surface, borderWidth: 1.5, borderColor: '#EF444450', borderRadius: BorderRadius.md, padding: Spacing.sm + 2 }}>
                <Text style={{ fontSize: Typography.fontSize.xs, fontWeight: '800', color: '#DC2626', marginBottom: 6 }}>
                  📦 Hangi Parçacıya Ödendi? (Cari Borçtan Düşer)
                </Text>
                {suppliers.length === 0 ? (
                  <Text style={{ fontSize: Typography.fontSize.xs, color: theme.textMuted }}>Kayıtlı tedarikçi bulunamadı.</Text>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
                    {suppliers.map((s) => {
                      const isSel = selectedSupplierId === s.id;
                      const bal = parseFloat(s.balance || 0);
                      return (
                        <TouchableOpacity
                          key={s.id}
                          onPress={() => {
                            if (isSel) {
                              setSelectedSupplierId(null);
                            } else {
                              setSelectedSupplierId(s.id);
                              if (!description || description.startsWith('Tedarikçi Ödemesi:')) {
                                setDescription(`Tedarikçi Ödemesi: ${s.name}`);
                              }
                            }
                          }}
                          style={{
                            backgroundColor: isSel ? '#EF444420' : theme.background,
                            borderWidth: 1.5,
                            borderColor: isSel ? '#EF4444' : theme.border,
                            borderRadius: BorderRadius.md,
                            paddingHorizontal: Spacing.md,
                            paddingVertical: 8,
                          }}
                        >
                          <Text style={{ fontSize: Typography.fontSize.xs, fontWeight: isSel ? '800' : '600', color: isSel ? '#EF4444' : theme.textPrimary }}>
                            {s.name}
                          </Text>
                          <Text style={{ fontSize: 10, color: bal > 0 ? '#EF4444' : theme.success, fontWeight: '700', marginTop: 2 }}>
                            Cari Borç: ₺{bal.toLocaleString('tr-TR')}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}
                {selectedSupplierId && (
                  <Text style={{ fontSize: 10, color: '#16A34A', fontWeight: '700', marginTop: 6 }}>
                    ✓ Seçilen tedarikçinin cari borcundan otomatik düşülecektir.
                  </Text>
                )}
              </View>
            )}

            {/* Açıklama */}
            <View>
              <Text style={{ fontSize: Typography.fontSize.xs, fontWeight: '700', color: theme.textSecondary, marginBottom: 4 }}>
                AÇIKLAMA / KİME VERİLDİ?
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
                }}
                placeholder={category === 'TEDARIKCI' ? "Örn: Özen Motor balata ödemesi" : "Örn: Mehmet çırak haftalık avansı, 4 pide + ayran"}
                placeholderTextColor={theme.textMuted}
                value={description}
                onChangeText={setDescription}
              />
            </View>

            {/* Ödeme Türü */}
            <View>
              <Text style={{ fontSize: Typography.fontSize.xs, fontWeight: '700', color: theme.textSecondary, marginBottom: 4 }}>
                ÖDEME KAYNAĞI
              </Text>
              <View style={{ flexDirection: 'row', gap: Spacing.xs }}>
                {[
                  { id: 'NAKIT', label: '💵 Kasa Nakdi' },
                  { id: 'HAVALE', label: '🏦 Havale/EFT' },
                  { id: 'KREDI_KARTI', label: '💳 Şirket Kartı' },
                ].map((m) => {
                  const isSel = paymentMethod === m.id;
                  return (
                    <TouchableOpacity
                      key={m.id}
                      onPress={() => setPaymentMethod(m.id)}
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        alignItems: 'center',
                        borderRadius: BorderRadius.md,
                        borderWidth: 1.5,
                        borderColor: isSel ? theme.primary : theme.border,
                        backgroundColor: isSel ? theme.primary + '15' : theme.surface,
                      }}
                    >
                      <Text style={{ color: isSel ? theme.primary : theme.textSecondary, fontSize: Typography.fontSize.xs, fontWeight: isSel ? '800' : '600' }}>
                        {m.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Fiş / Belge No */}
            <View>
              <Text style={{ fontSize: Typography.fontSize.xs, fontWeight: '700', color: theme.textSecondary, marginBottom: 4 }}>
                FİŞ / FATURA / MAKBUZ NO (OPSİYONEL)
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
                }}
                placeholder="Örn: FİŞ-0021"
                placeholderTextColor={theme.textMuted}
                value={documentNo}
                onChangeText={setDocumentNo}
              />
            </View>

            <TouchableOpacity
              style={{
                backgroundColor: theme.danger,
                borderRadius: BorderRadius.md,
                paddingVertical: Spacing.md,
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: Spacing.sm,
                ...Shadows.sm,
              }}
              onPress={handleSubmit}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontSize: Typography.fontSize.base, fontWeight: '800' }}>
                  📤 Masrafı Kasadan Düş
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Harici Giriş / Kasa Devir Modalı ────────────────────────────────────────
function AddIncomeModal({
  visible,
  date,
  onClose,
  theme,
}: {
  visible: boolean;
  date: string;
  onClose: () => void;
  theme: any;
}) {
  const queryClient = useQueryClient();
  const [category, setCategory] = useState(INCOME_CATEGORIES[0].id);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      cashAPI.addTransaction({
        type: 'IN',
        category,
        amount: parseFloat(amount.replace(',', '.')),
        paymentMethod: 'NAKIT',
        description: description.trim() || undefined,
        date,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashDaily'] });
      setAmount('');
      setDescription('');
      onClose();
      Alert.alert('✅ Kaydedildi', 'Kasa girişi başarıyla eklendi.');
    },
    onError: (err: any) =>
      Alert.alert('Hata', err?.response?.data?.error || err?.message || 'Giriş kaydedilemedi.'),
  });

  const handleSubmit = () => {
    if (!amount || parseFloat(amount.replace(',', '.')) <= 0) {
      Alert.alert('Hata', 'Lütfen geçerli bir tutar girin.');
      return;
    }
    mutation.mutate();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: theme.background }}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: theme.border }}>
            <View>
              <Text style={{ fontSize: Typography.fontSize.lg, fontWeight: '800', color: theme.textPrimary }}>
                📥 Harici Kasa / Devir Girişi
              </Text>
              <Text style={{ fontSize: Typography.fontSize.xs, color: theme.textSecondary, marginTop: 2 }}>
                Sabah açılış parası, sermaye veya hurda satışı ekleyin
              </Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ color: theme.primary, fontWeight: '700' }}>Kapat</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.md }}>
            <View>
              <Text style={{ fontSize: Typography.fontSize.xs, fontWeight: '700', color: theme.textSecondary, marginBottom: 4 }}>
                GİRİŞ TUTARI (₺) *
              </Text>
              <TextInput
                style={{
                  backgroundColor: theme.surface,
                  borderWidth: 1.5,
                  borderColor: theme.success + '80',
                  borderRadius: BorderRadius.md,
                  padding: Spacing.md,
                  color: theme.success,
                  fontSize: Typography.fontSize.xl,
                  fontWeight: '800',
                }}
                keyboardType="decimal-pad"
                placeholder="0,00"
                placeholderTextColor={theme.textMuted}
                value={amount}
                onChangeText={setAmount}
                autoFocus
              />
            </View>

            <View>
              <Text style={{ fontSize: Typography.fontSize.xs, fontWeight: '700', color: theme.textSecondary, marginBottom: 6 }}>
                GİRİŞ TÜRÜ *
              </Text>
              <View style={{ gap: 8 }}>
                {INCOME_CATEGORIES.map((c) => {
                  const isSel = category === c.id;
                  return (
                    <TouchableOpacity
                      key={c.id}
                      onPress={() => setCategory(c.id)}
                      style={{
                        padding: Spacing.md,
                        borderRadius: BorderRadius.md,
                        borderWidth: 1.5,
                        borderColor: isSel ? theme.success : theme.border,
                        backgroundColor: isSel ? theme.success + '15' : theme.surface,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 10,
                      }}
                    >
                      <Text style={{ fontSize: 20 }}>{c.icon}</Text>
                      <Text style={{ color: isSel ? theme.success : theme.textPrimary, fontSize: Typography.fontSize.sm, fontWeight: isSel ? '800' : '600' }}>
                        {c.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View>
              <Text style={{ fontSize: Typography.fontSize.xs, fontWeight: '700', color: theme.textSecondary, marginBottom: 4 }}>
                AÇIKLAMA / NOT
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
                }}
                placeholder="Örn: Sabah kasaya konulan bozukluk ve açılış parası"
                placeholderTextColor={theme.textMuted}
                value={description}
                onChangeText={setDescription}
              />
            </View>

            <TouchableOpacity
              style={{
                backgroundColor: theme.success,
                borderRadius: BorderRadius.md,
                paddingVertical: Spacing.md,
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: Spacing.sm,
                ...Shadows.sm,
              }}
              onPress={handleSubmit}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontSize: Typography.fontSize.base, fontWeight: '800' }}>
                  📥 Parayı Kasaya Ekle
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Gün Sonu Kapatma (Z-Raporu) Modalı ──────────────────────────────────────
function CloseDayModal({
  visible,
  date,
  summary,
  existingClose,
  onClose,
  theme,
}: {
  visible: boolean;
  date: string;
  summary: any;
  existingClose: any;
  onClose: () => void;
  theme: any;
}) {
  const queryClient = useQueryClient();
  const [actualCash, setActualCash] = useState(
    existingClose ? String(existingClose.actualCash) : summary ? String(summary.expectedCash) : '0'
  );
  const [takenByOwner, setTakenByOwner] = useState(
    existingClose ? String(existingClose.takenByOwner) : '0'
  );
  const [transferredToNextDay, setTransferredToNextDay] = useState(
    existingClose ? String(existingClose.transferredToNextDay) : summary ? String(summary.expectedCash) : '0'
  );
  const [notes, setNotes] = useState(existingClose?.notes || '');

  // Otomatik hesaplanan fark
  const actualVal = parseFloat(actualCash.replace(',', '.')) || 0;
  const expectedVal = parseFloat(summary?.expectedCash || 0);
  const diff = actualVal - expectedVal;

  const mutation = useMutation({
    mutationFn: () =>
      cashAPI.closeDay({
        date,
        actualCash: actualVal,
        takenByOwner: parseFloat(takenByOwner.replace(',', '.')) || 0,
        transferredToNextDay: parseFloat(transferredToNextDay.replace(',', '.')) || 0,
        notes: notes.trim() || undefined,
      }),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['cashDaily'] });
      queryClient.invalidateQueries({ queryKey: ['zReports'] });
      Alert.alert(
        '🔒 Gün Kapatıldı (Z-Raporu Alındı)',
        'Günün kasa hesabı başarıyla kapatıldı. WhatsApp ile rapor göndermek ister misiniz?',
        [
          { text: 'Kapat', style: 'cancel', onPress: onClose },
          {
            text: '💬 WhatsApp ile Paylaş',
            onPress: () => {
              handleShareZReport(res.data);
              onClose();
            },
          },
        ]
      );
    },
    onError: (err: any) =>
      Alert.alert('Hata', err?.response?.data?.error || err?.message || 'Gün kapatılamadı.'),
  });

  const handleShareZReport = (reportData?: any) => {
    const rep = reportData || existingClose || summary;
    const dateFormatted = new Date(date).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    const text =
      `📊 *GÜN SONU KASA Z-RAPORU*\n` +
      `📅 Tarih: *${dateFormatted}*\n` +
      `────────────────\n` +
      `💰 *TOPLAM CİRO: ₺${Number(summary?.totalRevenue || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}*\n` +
      `💳 POS / Kredi Kartı: ₺${Number(summary?.woPosIncome || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}\n` +
      `🏦 Havale / EFT: ₺${Number(summary?.woTransferIncome || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}\n` +
      `💵 Nakit Tahsilat: ₺${Number(summary?.woCashIncome || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}\n` +
      `────────────────\n` +
      `🌅 Açılış Devir Nakdi: ₺${Number(summary?.openingCash || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}\n` +
      `📤 Toplam Çıkan Nakit: ₺${Number(summary?.totalCashExpense || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}\n` +
      (Number(summary?.supplierCashOut || 0) > 0 ? `   ├─ 📦 Parçacı Nakit: ₺${Number(summary?.supplierCashOut || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}\n` : '') +
      (Number(summary?.manualCashOut || 0) > 0 ? `   └─ 🛠️ Dükkan Masrafı: ₺${Number(summary?.manualCashOut || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}\n` : '') +
      (Number(summary?.supplierBankOut || 0) > 0 ? `🏦 Banka/EFT Parçacı: ₺${Number(summary?.supplierBankOut || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}\n` : '') +
      `────────────────\n` +
      `📌 *Kasada Olması Gereken: ₺${Number(expectedVal).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}*\n` +
      `💵 *Sayılan Fiziki Nakit: ₺${Number(actualVal).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}*\n` +
      (diff !== 0
        ? `⚠️ *Kasa Farkı: ${diff > 0 ? '+' : ''}₺${Number(diff).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} (${diff > 0 ? 'Kasa Fazlası' : 'Kasa Eksiği'})*\n`
        : `✅ *Kasa Farkı: 0 ₺ (Kuruşu Kuruşuna Eşit)*\n`) +
      `────────────────\n` +
      `💼 Patrona Çekilen: ₺${Number(takenByOwner || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}\n` +
      `🔄 Yarına Kalan Devir: ₺${Number(transferredToNextDay || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}\n` +
      `🔧 Tamamlanan Araç Sayısı: ${summary?.completedOrdersCount || 0} adet\n` +
      (notes ? `📝 Not: ${notes}\n` : '');

    Share.share({ message: text });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: theme.background }}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: theme.border }}>
            <View>
              <Text style={{ fontSize: Typography.fontSize.lg, fontWeight: '800', color: theme.textPrimary }}>
                🔒 Günü Kapat & Z-Raporu Al
              </Text>
              <Text style={{ fontSize: Typography.fontSize.xs, color: theme.textSecondary, marginTop: 2 }}>
                {new Date(date).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ color: theme.primary, fontWeight: '700' }}>Kapat</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.md }}>
            {/* Gün Sonu Özeti Kartı */}
            <View
              style={{
                backgroundColor: theme.surface,
                borderRadius: BorderRadius.lg,
                borderWidth: 1,
                borderColor: theme.border,
                padding: Spacing.md,
                gap: 8,
                ...Shadows.sm,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: theme.textSecondary, fontSize: Typography.fontSize.sm }}>Toplam Günlük Ciro:</Text>
                <Text style={{ color: theme.textPrimary, fontWeight: '800', fontSize: Typography.fontSize.sm }}>
                  ₺{Number(summary?.totalRevenue || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: theme.textSecondary, fontSize: Typography.fontSize.sm }}>POS / Kredi Kartı:</Text>
                <Text style={{ color: '#3B82F6', fontWeight: '700', fontSize: Typography.fontSize.sm }}>
                  ₺{Number(summary?.woPosIncome || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: theme.textSecondary, fontSize: Typography.fontSize.sm }}>Kasadan Çıkan Nakit:</Text>
                <Text style={{ color: theme.danger, fontWeight: '700', fontSize: Typography.fontSize.sm }}>
                  -₺{Number(summary?.totalCashExpense || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </Text>
              </View>

              <View style={{ height: 1, backgroundColor: theme.border, marginVertical: 4 }} />

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: theme.textPrimary, fontWeight: '800', fontSize: Typography.fontSize.sm }}>
                  Kasada Olması Gereken Nakit:
                </Text>
                <Text style={{ color: theme.primary, fontWeight: '900', fontSize: Typography.fontSize.lg }}>
                  ₺{Number(expectedVal).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </Text>
              </View>
            </View>

            {/* Sayılan Fiziki Nakit Girişi */}
            <View>
              <Text style={{ fontSize: Typography.fontSize.xs, fontWeight: '700', color: theme.textSecondary, marginBottom: 4 }}>
                SAYILAN FİZİKİ NAKİT PARA (₺) *
              </Text>
              <TextInput
                style={{
                  backgroundColor: theme.surface,
                  borderWidth: 1.5,
                  borderColor: theme.primary,
                  borderRadius: BorderRadius.md,
                  padding: Spacing.md,
                  color: theme.textPrimary,
                  fontSize: Typography.fontSize.xl,
                  fontWeight: '800',
                }}
                keyboardType="decimal-pad"
                value={actualCash}
                onChangeText={setActualCash}
                placeholder="0,00"
                placeholderTextColor={theme.textMuted}
              />
            </View>

            {/* Kasa Farkı Rozeti */}
            <View
              style={{
                backgroundColor: diff === 0 ? '#ECFDF5' : diff > 0 ? '#EFF6FF' : '#FEF2F2',
                borderColor: diff === 0 ? '#A7F3D0' : diff > 0 ? '#BFDBFE' : '#FECACA',
                borderWidth: 1,
                borderRadius: BorderRadius.md,
                padding: Spacing.md,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: Typography.fontSize.sm, fontWeight: '700', color: diff === 0 ? '#065F46' : diff > 0 ? '#1E40AF' : '#991B1B' }}>
                {diff === 0
                  ? '✅ Kasa Tam Eşit (Kuruşu Kuruşuna)'
                  : diff > 0
                  ? '🔵 Kasa Fazlası Var'
                  : '⚠️ Kasa Eksiği Var (Açık)'}
              </Text>
              <Text style={{ fontSize: Typography.fontSize.base, fontWeight: '900', color: diff === 0 ? '#065F46' : diff > 0 ? '#1E40AF' : '#DC2626' }}>
                {diff > 0 ? '+' : ''}₺{Number(diff).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </Text>
            </View>

            {/* Patrona Çekilen Kâr / Nakit */}
            <View>
              <Text style={{ fontSize: Typography.fontSize.xs, fontWeight: '700', color: theme.textSecondary, marginBottom: 4 }}>
                PATRONA / SAHİBİNE ÇEKİLEN NAKİT (₺)
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
                  fontWeight: '700',
                }}
                keyboardType="decimal-pad"
                value={takenByOwner}
                onChangeText={(v) => {
                  setTakenByOwner(v);
                  const taken = parseFloat(v.replace(',', '.')) || 0;
                  setTransferredToNextDay(String(Math.max(0, actualVal - taken)));
                }}
                placeholder="0,00"
                placeholderTextColor={theme.textMuted}
              />
            </View>

            {/* Yarına Kalan Devir */}
            <View>
              <Text style={{ fontSize: Typography.fontSize.xs, fontWeight: '700', color: theme.textSecondary, marginBottom: 4 }}>
                YARINA KASADA KALAN DEVİR NAKİT (₺)
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
                  fontWeight: '700',
                }}
                keyboardType="decimal-pad"
                value={transferredToNextDay}
                onChangeText={setTransferredToNextDay}
                placeholder="0,00"
                placeholderTextColor={theme.textMuted}
              />
            </View>

            {/* Notlar */}
            <View>
              <Text style={{ fontSize: Typography.fontSize.xs, fontWeight: '700', color: theme.textSecondary, marginBottom: 4 }}>
                KAPANIŞ NOTU / AÇIKLAMA
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
                }}
                multiline
                placeholder="Kasa açığı/fazlası sebebi veya genel kapanış notu..."
                placeholderTextColor={theme.textMuted}
                value={notes}
                onChangeText={setNotes}
              />
            </View>

            <TouchableOpacity
              style={{
                backgroundColor: theme.primary,
                borderRadius: BorderRadius.md,
                paddingVertical: Spacing.md,
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: Spacing.sm,
                ...Shadows.sm,
              }}
              onPress={() => mutation.mutate()}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontSize: Typography.fontSize.base, fontWeight: '800' }}>
                  🔒 Günü Kapat & Z-Raporunu Onayla
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: '#25D366',
                borderRadius: BorderRadius.md,
                paddingVertical: Spacing.md,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 6,
              }}
              onPress={() => handleShareZReport()}
            >
              <MessageSquare size={16} color="#fff" />
              <Text style={{ color: '#fff', fontSize: Typography.fontSize.sm, fontWeight: '800' }}>
                WhatsApp ile Rapor Paylaş
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Geçmiş Z-Raporları Modalı ──────────────────────────────────────────────
function PastReportsModal({
  visible,
  onClose,
  onSelectDate,
  theme,
}: {
  visible: boolean;
  onClose: () => void;
  onSelectDate?: (dateStr: string) => void;
  theme: any;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['zReports'],
    queryFn: () => cashAPI.getZReports(),
    enabled: visible,
  });

  const reports: any[] = (data as any)?.data?.data || (data as any)?.data || [];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: theme.border }}>
          <View>
            <Text style={{ fontSize: Typography.fontSize.lg, fontWeight: '800', color: theme.textPrimary }}>
              📑 Geçmiş Gün Sonu Z-Raporları
            </Text>
            <Text style={{ fontSize: Typography.fontSize.xs, color: theme.textSecondary }}>Arşiv ve denetim kayıtları</Text>
          </View>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ color: theme.primary, fontWeight: '700' }}>Kapat</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator color={theme.primary} size="large" />
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.md }}>
            {reports.map((rep: any) => {
              const repDate = new Date(rep.date).toLocaleDateString('tr-TR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              });
              const diff = parseFloat(rep.discrepancy || 0);

              return (
                <TouchableOpacity
                  key={rep.id}
                  activeOpacity={0.75}
                  onPress={() => {
                    if (onSelectDate) {
                      const dStr = toLocalISODate(new Date(rep.date));
                      onSelectDate(dStr);
                      onClose();
                    }
                  }}
                  style={{
                    backgroundColor: theme.surface,
                    borderWidth: 1,
                    borderColor: theme.border,
                    borderRadius: BorderRadius.lg,
                    padding: Spacing.md,
                    ...Shadows.sm,
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: Typography.fontSize.base, fontWeight: '800', color: theme.textPrimary }}>
                      📅 {repDate}
                    </Text>
                    <View style={{ backgroundColor: theme.primary + '15', paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.full }}>
                      <Text style={{ color: theme.primary, fontSize: Typography.fontSize.xs, fontWeight: '700' }}>
                        {rep.workOrdersCompleted} araç bitti
                      </Text>
                    </View>
                  </View>

                  <View style={{ marginTop: Spacing.sm, gap: 4 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: theme.textMuted, fontSize: Typography.fontSize.xs }}>Toplam Ciro:</Text>
                      <Text style={{ color: theme.textPrimary, fontWeight: '700', fontSize: Typography.fontSize.xs }}>
                        ₺{parseFloat(rep.totalRevenue).toLocaleString('tr-TR')}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: theme.textMuted, fontSize: Typography.fontSize.xs }}>Fiziki Nakit:</Text>
                      <Text style={{ color: theme.success, fontWeight: '700', fontSize: Typography.fontSize.xs }}>
                        ₺{parseFloat(rep.actualCash).toLocaleString('tr-TR')}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: theme.textMuted, fontSize: Typography.fontSize.xs }}>Kasa Farkı:</Text>
                      <Text style={{ color: diff === 0 ? theme.success : diff > 0 ? '#1E40AF' : theme.danger, fontWeight: '800', fontSize: Typography.fontSize.xs }}>
                        {diff > 0 ? '+' : ''}₺{diff.toLocaleString('tr-TR')} ({diff === 0 ? 'Fark Yok' : diff > 0 ? 'Fazla' : 'Açık'})
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: theme.textMuted, fontSize: Typography.fontSize.xs }}>Devreden Nakit:</Text>
                      <Text style={{ color: theme.textSecondary, fontWeight: '700', fontSize: Typography.fontSize.xs }}>
                        ₺{parseFloat(rep.transferredToNextDay).toLocaleString('tr-TR')}
                      </Text>
                    </View>
                  </View>

                  {rep.notes && (
                    <Text style={{ color: theme.textMuted, fontSize: 11, fontStyle: 'italic', marginTop: 6 }}>
                      📝 {rep.notes}
                    </Text>
                  )}

                  <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: theme.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: theme.primary, fontSize: Typography.fontSize.xs, fontWeight: '700' }}>
                      Bu Günün Kasasını Aç →
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}

            {reports.length === 0 && (
              <View style={{ alignItems: 'center', marginTop: 40 }}>
                <Text style={{ fontSize: 36, marginBottom: 8 }}>📑</Text>
                <Text style={{ color: theme.textMuted, fontSize: Typography.fontSize.sm }}>
                  Henüz kapanmış geçmiş Z-Raporu bulunmuyor.
                </Text>
              </View>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

// ─── Tarih Seçici Modalı ──────────────────────────────────────────────────
function DateSelectorModal({
  visible,
  currentDate,
  onClose,
  onSelectDate,
  theme,
}: {
  visible: boolean;
  currentDate: string; // 'YYYY-MM-DD'
  onClose: () => void;
  onSelectDate: (dateStr: string) => void;
  theme: any;
}) {
  const [selectedDateObj, setSelectedDateObj] = useState<Date>(() => {
    const parts = (currentDate || '').split('-').map(Number);
    return parts.length === 3 ? new Date(parts[0], parts[1] - 1, parts[2]) : new Date();
  });
  const [showAndroidPicker, setShowAndroidPicker] = useState(false);

  useEffect(() => {
    if (visible && currentDate) {
      const parts = currentDate.split('-').map(Number);
      if (parts.length === 3) {
        setSelectedDateObj(new Date(parts[0], parts[1] - 1, parts[2]));
      }
      setShowAndroidPicker(false);
    }
  }, [visible, currentDate]);

  const handleApply = (target?: Date) => {
    const d = target || selectedDateObj;
    onSelectDate(toLocalISODate(d));
    onClose();
  };

  const handleQuickPreset = (preset: 'TODAY' | 'YESTERDAY' | 'TWO_DAYS_AGO' | 'THIS_WEEK' | 'THIS_MONTH') => {
    const now = new Date();
    if (preset === 'TODAY') {
      handleApply(now);
    } else if (preset === 'YESTERDAY') {
      now.setDate(now.getDate() - 1);
      handleApply(now);
    } else if (preset === 'TWO_DAYS_AGO') {
      now.setDate(now.getDate() - 2);
      handleApply(now);
    } else if (preset === 'THIS_WEEK') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      now.setDate(diff);
      handleApply(now);
    } else if (preset === 'THIS_MONTH') {
      now.setDate(1);
      handleApply(now);
    }
  };

  const onNativeChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowAndroidPicker(false);
      if (event.type === 'set' && date) {
        handleApply(date);
      }
    } else if (date) {
      setSelectedDateObj(date);
    }
  };

  const formattedSelected = selectedDateObj.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    weekday: 'long',
  });

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
        <View
          style={{
            backgroundColor: theme.surface,
            borderTopLeftRadius: BorderRadius.xl,
            borderTopRightRadius: BorderRadius.xl,
            padding: Spacing.lg,
            maxHeight: '92%',
            ...Shadows.lg,
          }}
        >
          {/* Modal Başlığı */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md }}>
            <View>
              <Text style={{ fontSize: Typography.fontSize.lg, fontWeight: '800', color: theme.textPrimary }}>
                📅 Kasa Tarihini Seçin
              </Text>
              <Text style={{ fontSize: Typography.fontSize.xs, color: theme.textSecondary, marginTop: 2 }}>
                İstediğiniz günün kasa, POS ve masraf dökümüne geçin
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: BorderRadius.full,
                backgroundColor: theme.background,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: theme.textSecondary, fontWeight: '700', fontSize: 16 }}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.md, paddingBottom: 20 }}>
            {/* Hızlı Atlama Çipleri */}
            <View>
              <Text style={{ fontSize: Typography.fontSize.xs, fontWeight: '700', color: theme.textMuted, marginBottom: 8, textTransform: 'uppercase' }}>
                Hızlı Atlama
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {[
                  { id: 'TODAY', label: '⭐ Bugün' },
                  { id: 'YESTERDAY', label: '◀ Dün' },
                  { id: 'TWO_DAYS_AGO', label: '◀◀ 2 Gün Önce' },
                  { id: 'THIS_WEEK', label: '📌 Bu Hafta Başı' },
                  { id: 'THIS_MONTH', label: '🗓️ Bu Ay Başı' },
                ].map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => handleQuickPreset(p.id as any)}
                    style={{
                      backgroundColor: theme.background,
                      borderColor: theme.border,
                      borderWidth: 1,
                      borderRadius: BorderRadius.md,
                      paddingHorizontal: Spacing.md,
                      paddingVertical: 7,
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={{ color: theme.textPrimary, fontSize: Typography.fontSize.xs, fontWeight: '700' }}>
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Seçili Gün Göstergesi & Takvim */}
            <View
              style={{
                backgroundColor: theme.background,
                borderRadius: BorderRadius.lg,
                borderWidth: 1,
                borderColor: theme.border,
                padding: Spacing.md,
              }}
            >
              <Text style={{ fontSize: Typography.fontSize.xs, fontWeight: '700', color: theme.textMuted, marginBottom: 8, textTransform: 'uppercase' }}>
                Seçilen Gün
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: BorderRadius.md,
                      backgroundColor: theme.primary + '20',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Calendar size={20} color={theme.primary} />
                  </View>
                  <View>
                    <Text style={{ fontSize: Typography.fontSize.base, fontWeight: '800', color: theme.textPrimary }}>
                      {formattedSelected}
                    </Text>
                    <Text style={{ fontSize: Typography.fontSize.xs, color: theme.textSecondary, marginTop: 1 }}>
                      {toLocalISODate(selectedDateObj)}
                    </Text>
                  </View>
                </View>

                {Platform.OS === 'android' && (
                  <TouchableOpacity
                    onPress={() => setShowAndroidPicker(true)}
                    style={{
                      backgroundColor: theme.primary,
                      borderRadius: BorderRadius.md,
                      paddingHorizontal: Spacing.md,
                      paddingVertical: 8,
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={{ color: '#fff', fontSize: Typography.fontSize.xs, fontWeight: '800' }}>
                      Takvimi Aç
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* iOS İnteraktif Takvimi */}
              {Platform.OS === 'ios' && (
                <View style={{ marginTop: Spacing.sm, alignItems: 'center' }}>
                  <DateTimePicker
                    value={selectedDateObj}
                    mode="date"
                    display="inline"
                    onChange={onNativeChange}
                    textColor={theme.textPrimary}
                    themeVariant={theme.isDark ? 'dark' : 'light'}
                    locale="tr-TR"
                  />
                </View>
              )}

              {/* Android Native Picker */}
              {Platform.OS === 'android' && showAndroidPicker && (
                <DateTimePicker
                  value={selectedDateObj}
                  mode="date"
                  display="default"
                  onChange={onNativeChange}
                  locale="tr-TR"
                />
              )}
            </View>

            {/* Stepper (Önceki / Sonraki Gün) */}
            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              <TouchableOpacity
                onPress={() => {
                  const next = new Date(selectedDateObj);
                  next.setDate(next.getDate() - 1);
                  setSelectedDateObj(next);
                }}
                style={{
                  flex: 1,
                  backgroundColor: theme.background,
                  borderWidth: 1,
                  borderColor: theme.border,
                  borderRadius: BorderRadius.md,
                  paddingVertical: Spacing.md,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: theme.textPrimary, fontWeight: '700', fontSize: Typography.fontSize.xs }}>
                  ◀ 1 Gün Önce
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  const next = new Date(selectedDateObj);
                  next.setDate(next.getDate() + 1);
                  setSelectedDateObj(next);
                }}
                style={{
                  flex: 1,
                  backgroundColor: theme.background,
                  borderWidth: 1,
                  borderColor: theme.border,
                  borderRadius: BorderRadius.md,
                  paddingVertical: Spacing.md,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: theme.textPrimary, fontWeight: '700', fontSize: Typography.fontSize.xs }}>
                  1 Gün Sonra ▶
                </Text>
              </TouchableOpacity>
            </View>

            {/* Bu Tarihe Git Butonu */}
            <TouchableOpacity
              onPress={() => handleApply()}
              style={{
                backgroundColor: theme.primary,
                borderRadius: BorderRadius.lg,
                paddingVertical: Spacing.md,
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 4,
                ...Shadows.sm,
              }}
              activeOpacity={0.85}
            >
              <Text style={{ color: '#fff', fontSize: Typography.fontSize.base, fontWeight: '900' }}>
                ✓ BU GÜNÜN KASASINI AÇ
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Günlük Atölye Kasası Ekranı ───────────────────────────────────────────
export default function CashRegisterScreen() {
  const { colors: theme } = useAppTheme();
  const queryClient = useQueryClient();

  const [date, setDate] = useState(() => toLocalISODate(new Date()));
  const [filterType, setFilterType] = useState<'ALL' | 'IN' | 'OUT'>('ALL');
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['cashDaily', date],
    queryFn: () => cashAPI.getDaily({ date }).then((res) => res.data?.data || res.data),
  });

  useFocusEffect(
    React.useCallback(() => {
      refetch();
    }, [refetch])
  );

  const summary = (data as any)?.summary;
  const timeline: any[] = (data as any)?.timeline || [];
  const isClosed = !!(data as any)?.isClosed;
  const existingClose = (data as any)?.registerClose;

  // Gün değiştirme
  const shiftDay = (days: number) => {
    const parts = date.split('-').map(Number);
    const current = new Date(parts[0], parts[1] - 1, parts[2]);
    current.setDate(current.getDate() + days);
    setDate(toLocalISODate(current));
  };

  const isToday = date === toLocalISODate(new Date());

  const filteredTimeline = useMemo(() => {
    if (filterType === 'ALL') return timeline;
    return timeline.filter((item) => item.type === filterType);
  }, [timeline, filterType]);

  const deleteTxMutation = useMutation({
    mutationFn: (id: string) => cashAPI.deleteTransaction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashDaily'] });
      Alert.alert('Başarılı', 'İşlem silindi.');
    },
    onError: (err: any) =>
      Alert.alert('Hata', err?.response?.data?.error || err?.message || 'İşlem silinemedi.'),
  });

  const handleDeleteItem = (item: any) => {
    if (item.source !== 'MANUAL') {
      Alert.alert('Bilgi', 'İş emri veya parçacı ödemelerini ilgili ekrandan düzenleyebilirsiniz.');
      return;
    }
    const realId = item.id.replace('tx-', '');
    Alert.alert('İşlemi Sil', `"${item.title}" kasa hareketini silmek istediğinize emin misiniz?`, [
      { text: 'İptal', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: () => deleteTxMutation.mutate(realId) },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top']}>
      {/* Header */}
      <LinearGradient
        colors={[theme.primary + 'EE', theme.primaryDark || '#1E40AF'] as [string, string]}
        style={{
          padding: Spacing.lg,
          paddingTop: Spacing.sm,
          borderBottomLeftRadius: BorderRadius.xl,
          borderBottomRightRadius: BorderRadius.xl,
          marginBottom: Spacing.sm,
          ...Shadows.md,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs }}>
          <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <ArrowLeft size={18} color="#fff" />
            <Text style={{ color: '#fff', fontSize: Typography.fontSize.sm, fontWeight: '700' }}>Geri</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowReportsModal(true)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              backgroundColor: 'rgba(255,255,255,0.2)',
              borderRadius: BorderRadius.md,
              paddingHorizontal: Spacing.md,
              paddingVertical: 5,
            }}
          >
            <Receipt size={14} color="#fff" />
            <Text style={{ color: '#fff', fontSize: Typography.fontSize.xs, fontWeight: '700' }}>Geçmiş Raporlar</Text>
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 4 }}>
          <View>
            <Text style={{ fontSize: Typography.fontSize.xl, fontWeight: '900', color: '#fff' }}>
              💵 Atölye Kasası & Z-Raporu
            </Text>
            <Text style={{ fontSize: Typography.fontSize.xs, color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>
              Günlük Nakit, POS, Masraf & Kapanış Defteri
            </Text>
          </View>

          {/* Günlük Durum Rozeti */}
          <View
            style={{
              backgroundColor: isClosed ? '#10B98130' : '#F59E0B30',
              borderColor: isClosed ? '#10B981' : '#F59E0B',
              borderWidth: 1,
              borderRadius: BorderRadius.full,
              paddingHorizontal: 8,
              paddingVertical: 4,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
            }}
          >
            {isClosed ? <Lock size={12} color="#10B981" /> : <Clock size={12} color="#F59E0B" />}
            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>
              {isClosed ? 'GÜN KAPALI (Z ALINDI)' : 'KASA AÇIK'}
            </Text>
          </View>
        </View>

        {/* Gün Değiştirici Bar */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'rgba(0,0,0,0.22)',
            borderRadius: BorderRadius.lg,
            padding: 4,
            marginTop: Spacing.md,
          }}
        >
          <TouchableOpacity
            onPress={() => shiftDay(-1)}
            style={{
              padding: 8,
              borderRadius: BorderRadius.md,
              backgroundColor: 'rgba(255,255,255,0.12)',
            }}
            activeOpacity={0.7}
          >
            <ChevronLeft size={20} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowDatePickerModal(true)}
            activeOpacity={0.75}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: 'rgba(255,255,255,0.2)',
              paddingHorizontal: Spacing.md,
              paddingVertical: 6,
              borderRadius: BorderRadius.md,
              gap: 8,
            }}
          >
            <Calendar size={18} color="#fff" />
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontSize: Typography.fontSize.sm, fontWeight: '800' }}>
                {formatDisplayDate(date)}
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 10, fontWeight: '700' }}>
                {isToday ? 'Bugün (Tarih Seç ▾)' : 'Tarih Değiştir ▾'}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => shiftDay(1)}
            style={{
              padding: 8,
              borderRadius: BorderRadius.md,
              backgroundColor: 'rgba(255,255,255,0.12)',
            }}
            activeOpacity={0.7}
          >
            <ChevronRight size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Main Content */}
      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={theme.primary} size="large" />
          <Text style={{ color: theme.textSecondary, marginTop: Spacing.sm, fontSize: Typography.fontSize.sm }}>
            Kasa hesaplanıyor...
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 60, gap: Spacing.md }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.primary} />}
        >
          {/* 🌟 BÜYÜK KASA DURUM KARTI (HERO KART) */}
          <LinearGradient
            colors={[theme.surface, theme.background]}
            style={{
              borderRadius: BorderRadius.xl,
              borderWidth: 1.5,
              borderColor: Number(summary?.expectedCash || 0) >= 0 ? theme.primary + '40' : theme.danger + '60',
              padding: Spacing.lg,
              ...Shadows.md,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View>
                <Text style={{ fontSize: Typography.fontSize.xs, color: theme.textMuted, fontWeight: '700', textTransform: 'uppercase' }}>
                  KASADA OLMASI GEREKEN NAKİT
                </Text>
                <Text
                  style={{
                    fontSize: 32,
                    fontWeight: '900',
                    color: Number(summary?.expectedCash || 0) >= 0 ? theme.primary : theme.danger,
                    marginTop: 2,
                  }}
                >
                  ₺{Number(summary?.expectedCash || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </Text>
              </View>

              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: theme.primary + '15',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 24 }}>💵</Text>
              </View>
            </View>

            {/* İkincil Rakamlar Grid */}
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 8,
                marginTop: Spacing.md,
                paddingTop: Spacing.md,
                borderTopWidth: 1,
                borderTopColor: theme.border,
              }}
            >
              <View style={{ flex: 1, minWidth: '45%' }}>
                <Text style={{ fontSize: 10, color: theme.textMuted }}>🌅 Sabah Açılış / Devir</Text>
                <Text style={{ fontSize: Typography.fontSize.sm, fontWeight: '700', color: theme.textPrimary, marginTop: 1 }}>
                  ₺{Number(summary?.openingCash || 0).toLocaleString('tr-TR')}
                </Text>
              </View>

              <View style={{ flex: 1, minWidth: '45%' }}>
                <Text style={{ fontSize: 10, color: theme.textMuted }}>📥 Günlük Nakit Girişi</Text>
                <Text style={{ fontSize: Typography.fontSize.sm, fontWeight: '700', color: theme.success, marginTop: 1 }}>
                  +₺{Number(summary?.totalCashIncome || 0).toLocaleString('tr-TR')}
                </Text>
              </View>

              <View style={{ flex: 1, minWidth: '45%' }}>
                <Text style={{ fontSize: 10, color: theme.textMuted }}>📤 Günlük Nakit Çıkışı</Text>
                <Text style={{ fontSize: Typography.fontSize.sm, fontWeight: '700', color: theme.danger, marginTop: 1 }}>
                  -₺{Number(summary?.totalCashExpense || 0).toLocaleString('tr-TR')}
                </Text>
              </View>

              <View style={{ flex: 1, minWidth: '45%' }}>
                <Text style={{ fontSize: 10, color: theme.textMuted }}>💳 POS / Kredi Kartı</Text>
                <Text style={{ fontSize: Typography.fontSize.sm, fontWeight: '700', color: '#3B82F6', marginTop: 1 }}>
                  ₺{Number(summary?.woPosIncome || 0).toLocaleString('tr-TR')}
                </Text>
              </View>
            </View>

            {/* Nakit Çıkış Detay Ayrımı: Parçacı vs Dükkan Masrafı */}
            {(Number(summary?.supplierCashOut || 0) > 0 || Number(summary?.manualCashOut || 0) > 0) && (
              <View style={{ flexDirection: 'row', gap: Spacing.xs, marginTop: Spacing.xs }}>
                <View style={{ flex: 1, backgroundColor: theme.surface, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 4, borderWidth: 1, borderColor: theme.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 10, color: theme.textMuted }}>📦 Parçacı Nakit:</Text>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#EF4444' }}>
                    -₺{Number(summary?.supplierCashOut || 0).toLocaleString('tr-TR')}
                  </Text>
                </View>
                <View style={{ flex: 1, backgroundColor: theme.surface, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 4, borderWidth: 1, borderColor: theme.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 10, color: theme.textMuted }}>🛠️ Dükkan Gideri:</Text>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#F59E0B' }}>
                    -₺{Number(summary?.manualCashOut || 0).toLocaleString('tr-TR')}
                  </Text>
                </View>
              </View>
            )}

            {/* Toplam Ciro Şeridi */}
            <View
              style={{
                marginTop: Spacing.sm,
                backgroundColor: theme.primary + '10',
                borderRadius: BorderRadius.md,
                padding: Spacing.sm,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: Typography.fontSize.xs, fontWeight: '700', color: theme.primary }}>
                🚀 Toplam Günlük İş Hacmi / Ciro:
              </Text>
              <Text style={{ fontSize: Typography.fontSize.sm, fontWeight: '900', color: theme.primary }}>
                ₺{Number(summary?.totalRevenue || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </Text>
            </View>
          </LinearGradient>

          {/* ⚡ HIZLI İŞLEM BUTONLARI */}
          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: '#FEF2F2',
                borderColor: '#FECACA',
                borderWidth: 1.5,
                borderRadius: BorderRadius.lg,
                paddingVertical: Spacing.md,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                ...Shadows.sm,
              }}
              onPress={() => setShowExpenseModal(true)}
              activeOpacity={0.8}
            >
              <TrendingDown size={20} color="#DC2626" />
              <Text style={{ color: '#991B1B', fontWeight: '800', fontSize: Typography.fontSize.xs }}>
                - MASRAF GİR
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: '#ECFDF5',
                borderColor: '#A7F3D0',
                borderWidth: 1.5,
                borderRadius: BorderRadius.lg,
                paddingVertical: Spacing.md,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                ...Shadows.sm,
              }}
              onPress={() => setShowIncomeModal(true)}
              activeOpacity={0.8}
            >
              <TrendingUp size={20} color="#059669" />
              <Text style={{ color: '#065F46', fontWeight: '800', fontSize: Typography.fontSize.xs }}>
                + HARİCİ GİRİŞ
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: isClosed ? theme.surface : theme.primary,
                borderColor: isClosed ? theme.border : theme.primary,
                borderWidth: 1.5,
                borderRadius: BorderRadius.lg,
                paddingVertical: Spacing.md,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                ...Shadows.sm,
              }}
              onPress={() => setShowCloseModal(true)}
              activeOpacity={0.8}
            >
              <Lock size={20} color={isClosed ? theme.primary : '#fff'} />
              <Text style={{ color: isClosed ? theme.primary : '#fff', fontWeight: '800', fontSize: Typography.fontSize.xs }}>
                {isClosed ? 'Z RAPORU' : 'GÜNÜ KAPAT'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* 📜 GÜNÜN MALİ HAREKET ZAMAN TÜNELİ */}
          <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm }}>
              <Text style={{ fontSize: Typography.fontSize.base, fontWeight: '800', color: theme.textPrimary }}>
                📜 Günün Kasa Hareketleri ({filteredTimeline.length})
              </Text>

              {/* Filtre Tabs */}
              <View style={{ flexDirection: 'row', gap: 4 }}>
                {[
                  { id: 'ALL', label: 'Tümü' },
                  { id: 'IN', label: 'Giriş (+)' },
                  { id: 'OUT', label: 'Çıkış (-)' },
                ].map((f) => {
                  const isSel = filterType === f.id;
                  return (
                    <TouchableOpacity
                      key={f.id}
                      onPress={() => setFilterType(f.id as any)}
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: BorderRadius.full,
                        backgroundColor: isSel ? theme.primary : theme.surface,
                        borderWidth: 1,
                        borderColor: isSel ? theme.primary : theme.border,
                      }}
                    >
                      <Text style={{ fontSize: 10, fontWeight: '700', color: isSel ? '#fff' : theme.textSecondary }}>
                        {f.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {filteredTimeline.map((item) => {
              const isIncome = item.type === 'IN';
              const timeStr = new Date(item.time).toLocaleTimeString('tr-TR', {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <View
                  key={item.id}
                  style={{
                    backgroundColor: theme.surface,
                    borderRadius: BorderRadius.lg,
                    borderWidth: 1,
                    borderColor: theme.border,
                    padding: Spacing.md,
                    marginBottom: Spacing.xs,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <View style={{ flex: 1, paddingRight: Spacing.sm }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: Typography.fontSize.sm, fontWeight: '800', color: theme.textPrimary }}>
                        {item.title}
                      </Text>
                      {item.paymentMethod && (
                        <View style={{ backgroundColor: theme.background, paddingHorizontal: 6, paddingVertical: 2, borderRadius: BorderRadius.sm }}>
                          <Text style={{ color: theme.textMuted, fontSize: 10, fontWeight: '700' }}>
                            {item.paymentMethod}
                          </Text>
                        </View>
                      )}
                    </View>

                    <Text style={{ fontSize: Typography.fontSize.xs, color: theme.textSecondary, marginTop: 2 }}>
                      {item.subtitle} • 🕒 {timeStr}
                      {item.documentNo ? ` • No: ${item.documentNo}` : ''}
                    </Text>
                  </View>

                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Text
                      style={{
                        fontSize: Typography.fontSize.base,
                        fontWeight: '900',
                        color: isIncome ? theme.success : theme.danger,
                      }}
                    >
                      {isIncome ? '+' : '-'}₺{Number(item.amount).toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
                    </Text>

                    {item.source === 'MANUAL' && (
                      <TouchableOpacity onPress={() => handleDeleteItem(item)} style={{ padding: 2 }}>
                        <Trash2 size={13} color={theme.textMuted} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}

            {filteredTimeline.length === 0 && (
              <View style={{ alignItems: 'center', paddingVertical: 40, backgroundColor: theme.surface, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: theme.border }}>
                <Text style={{ fontSize: 36, marginBottom: 8 }}>💵</Text>
                <Text style={{ color: theme.textPrimary, fontWeight: '700', fontSize: Typography.fontSize.sm }}>
                  Henüz İşlem Kaydı Yok
                </Text>
                <Text style={{ color: theme.textMuted, fontSize: Typography.fontSize.xs, marginTop: 2 }}>
                  Bugün yapılan iş emri tahsilatları ve masraflar burada listelenir.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}

      {/* Modals */}
      <AddExpenseModal
        visible={showExpenseModal}
        date={date}
        onClose={() => setShowExpenseModal(false)}
        theme={theme}
      />

      <AddIncomeModal
        visible={showIncomeModal}
        date={date}
        onClose={() => setShowIncomeModal(false)}
        theme={theme}
      />

      <CloseDayModal
        visible={showCloseModal}
        date={date}
        summary={summary}
        existingClose={existingClose}
        onClose={() => setShowCloseModal(false)}
        theme={theme}
      />

      <PastReportsModal
        visible={showReportsModal}
        onClose={() => setShowReportsModal(false)}
        onSelectDate={(newDate) => setDate(newDate)}
        theme={theme}
      />

      <DateSelectorModal
        visible={showDatePickerModal}
        currentDate={date}
        onClose={() => setShowDatePickerModal(false)}
        onSelectDate={(newDate) => setDate(newDate)}
        theme={theme}
      />
    </SafeAreaView>
  );
}
