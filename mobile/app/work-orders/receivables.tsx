import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Linking,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { workOrderAPI } from '../../src/api/client';
import { Typography, Spacing, BorderRadius, Shadows } from '../../src/constants/theme';
import { useAppTheme } from '../../src/hooks/useAppTheme';
import { useAuthStore } from '../../src/store/auth.store';
import {
  ArrowLeft,
  Search,
  Phone,
  MessageSquare,
  DollarSign,
  Calendar,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Filter,
  Check,
} from 'lucide-react-native';
import { openWhatsApp, generateDebtReminderMessage } from '../../src/utils/whatsapp';
import { CannedNotesPicker } from '../../src/components/CannedNotesPicker';

export default function ReceivablesScreen() {
  const queryClient = useQueryClient();
  const { colors: theme } = useAppTheme();
  const dynamicStyles = useMemo(() => styles(theme), [theme]);
  const { user } = useAuthStore();
  const canAccess = ['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(user?.role || '');

  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'VERESIYE' | 'KISMI' | 'BEKLIYOR'>('ALL');

  // Modal State for Payment Collection
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('NAKIT');
  const [payStatus, setPayStatus] = useState('ODENDI');
  const [payNotes, setPayNotes] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['receivables', search],
    queryFn: () => workOrderAPI.getReceivables({ search: search.trim() || undefined }),
    enabled: canAccess,
  });

  if (!canAccess) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl }}>
        <View style={{ backgroundColor: theme.surface, borderRadius: BorderRadius.xl, padding: Spacing.xl, alignItems: 'center', borderWidth: 1, borderColor: theme.border, width: '100%', maxWidth: 360 }}>
          <Text style={{ fontSize: 48, marginBottom: Spacing.md }}>🔒</Text>
          <Text style={{ fontSize: Typography.fontSize.lg, fontWeight: '800', color: theme.textPrimary, textAlign: 'center', marginBottom: Spacing.xs }}>
            Yetkisiz Erişim
          </Text>
          <Text style={{ fontSize: Typography.fontSize.sm, color: theme.textSecondary, textAlign: 'center', marginBottom: Spacing.lg, lineHeight: 20 }}>
            Açık Hesap & Veresiye Takibi ekranı sadece Yönetici ve Admin yetkisine açıktır.
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: theme.primary, borderRadius: BorderRadius.md, paddingVertical: Spacing.sm + 2, paddingHorizontal: Spacing.xl }}
            onPress={() => router.back()}
          >
            <Text style={{ color: '#fff', fontWeight: '700' }}>Geri Dön</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const receivablesData = (data as any)?.data || {
    totalReceivables: 0,
    totalPaid: 0,
    totalAmountAll: 0,
    debtorOrdersCount: 0,
    customerCount: 0,
    orders: [],
  };

  const orders: any[] = receivablesData.orders || [];

  // Filter orders
  const filteredOrders = useMemo(() => {
    if (selectedFilter === 'ALL') return orders;
    return orders.filter((o) => o.paymentStatus === selectedFilter);
  }, [orders, selectedFilter]);

  // Payment mutation
  const paymentMutation = useMutation({
    mutationFn: (payload: { id: string; data: any }) =>
      workOrderAPI.updatePayment(payload.id, payload.data),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['receivables'] });
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['work-order', selectedOrder?.id] });
      queryClient.invalidateQueries({ queryKey: ['cashDaily'] });
      setShowPaymentModal(false);
      setSelectedOrder(null);
      const msg = res?.data?.message || 'Ödeme ve tahsilat kaydı başarıyla kaydedildi! ✅';
      Alert.alert('Başarılı', msg);
    },
    onError: (err: any) => {
      Alert.alert('Hata', err?.response?.data?.error || err?.message || 'Ödeme kaydedilemedi.');
    },
  });

  const handleAmountChange = (text: string) => {
    const filtered = text.replace(/[^0-9.,]/g, '');
    setPayAmount(filtered);
    const amount = parseFloat(filtered.replace(',', '.'));
    const remaining = selectedOrder?.remainingAmount || ((selectedOrder?.totalAmount || 0) - (selectedOrder?.paidAmount || 0));
    if (!isNaN(amount)) {
      if (amount >= remaining - 0.01 && remaining > 0) {
        setPayStatus('ODENDI');
      } else if (amount > 0) {
        setPayStatus('KISMI');
      } else {
        setPayStatus('VERESIYE');
      }
    }
  };

  const handleOpenPaymentModal = (order: any) => {
    setSelectedOrder(order);
    const remaining = order.remainingAmount || (order.totalAmount - (order.paidAmount || 0));
    setPayAmount(String(remaining));
    setPayMethod(order.paymentMethod || 'NAKIT');
    setPayStatus('ODENDI');
    setPayNotes(order.paymentNotes || '');
    setShowPaymentModal(true);
  };

  const handleSavePayment = () => {
    if (!selectedOrder) return;
    const amount = parseFloat(payAmount.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Hata', 'Lütfen geçerli bir tahsilat tutarı girin.');
      return;
    }

    const remaining = selectedOrder?.remainingAmount ?? Math.max(0, (selectedOrder?.totalAmount || 0) - (selectedOrder?.paidAmount || 0));
    const previousPaid = parseFloat(selectedOrder.paidAmount || 0);
    const totalAmount = parseFloat(selectedOrder.totalAmount || 0);

    const executePayment = () => {
      const isFullPayment = (previousPaid + amount) >= totalAmount - 0.01;
      paymentMutation.mutate({
        id: selectedOrder.id,
        data: {
          amountCollected: amount,
          paymentStatus: isFullPayment ? 'ODENDI' : (payStatus === 'ODENDI' ? 'KISMI' : payStatus),
          paymentMethod: payMethod,
          paymentNotes: payNotes.trim() || undefined,
        },
      });
    };

    if (amount > remaining && remaining > 0) {
      const excess = Math.round((amount - remaining) * 100) / 100;
      Alert.alert(
        'Bahşiş / İkramiye Onayı 🎁',
        `Kalan borç ₺${remaining.toLocaleString('tr-TR')} tutarındadır.\n\nFazla olan ₺${excess.toLocaleString('tr-TR')} tutar kasaya 'Bahşiş / Usta İkramiyesi' olarak kaydedilecek ve iş emri tamamen kapatılacaktır.\n\nOnaylıyor musunuz?`,
        [
          { text: 'Vazgeç', style: 'cancel' },
          {
            text: `Kalan Tutara Eşitle (₺${remaining.toLocaleString('tr-TR')})`,
            onPress: () => handleAmountChange(String(remaining)),
          },
          {
            text: 'Evet, Bahşiş Olarak Kaydet',
            onPress: executePayment,
          },
        ]
      );
    } else {
      executePayment();
    }
  };

  const handleSendWhatsAppReminder = (order: any) => {
    if (!order.customerPhone) {
      Alert.alert('Telefon Yok', 'Bu iş emrinde müşteri telefon numarası kayıtlı değil.');
      return;
    }
    const msg = generateDebtReminderMessage(order);
    openWhatsApp(order.customerPhone, msg);
  };

  const handleCallCustomer = (phone: string | null) => {
    if (!phone) {
      Alert.alert('Telefon Yok', 'Müşteri telefon numarası bulunamadı.');
      return;
    }
    Linking.openURL(`tel:${phone.replace(/\s+/g, '')}`);
  };

  return (
    <SafeAreaView style={dynamicStyles.container} edges={['top']}>
      {/* Header */}
      <LinearGradient
        colors={[theme.danger + 'DD', (theme as any).dangerDark || '#991B1B'] as [string, string]}
        style={dynamicStyles.header}
      >
        <View style={dynamicStyles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={dynamicStyles.backButton}>
            <ArrowLeft size={22} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: Spacing.sm }}>
            <Text style={dynamicStyles.headerTitle}>📒 Veresiye Defteri</Text>
            <Text style={dynamicStyles.headerSubtitle}>Müşteri Açık Hesap & Alacak Takibi</Text>
          </View>
        </View>

        {/* Top Summary Banner */}
        <View style={dynamicStyles.summaryCard}>
          <View style={dynamicStyles.summaryItemMain}>
            <Text style={dynamicStyles.summaryMainLabel}>TOPLAM ALACAK</Text>
            <Text style={dynamicStyles.summaryMainValue}>
              ₺{receivablesData.totalReceivables.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
            </Text>
          </View>
          <View style={dynamicStyles.summaryDivider} />
          <View style={dynamicStyles.summaryItem}>
            <Text style={dynamicStyles.summarySubValue}>{receivablesData.customerCount}</Text>
            <Text style={dynamicStyles.summarySubLabel}>Borçlu Müşteri</Text>
          </View>
          <View style={dynamicStyles.summaryDivider} />
          <View style={dynamicStyles.summaryItem}>
            <Text style={dynamicStyles.summarySubValue}>{receivablesData.debtorOrdersCount}</Text>
            <Text style={dynamicStyles.summarySubLabel}>Açık İş Emri</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Search Bar */}
      <View style={dynamicStyles.searchContainer}>
        <View style={dynamicStyles.searchInputWrapper}>
          <Search size={18} color={theme.textMuted} />
          <TextInput
            style={dynamicStyles.searchInput}
            placeholder="Müşteri adı, plaka veya işlem ara..."
            placeholderTextColor={theme.textMuted}
            value={search}
            onChangeText={setSearch}
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={dynamicStyles.filterTabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={dynamicStyles.filterTabs}>
          {[
            { key: 'ALL', label: `Tümü (${orders.length})` },
            { key: 'VERESIYE', label: '🔴 Veresiye' },
            { key: 'KISMI', label: '🟡 Kısmi Ödeme' },
            { key: 'BEKLIYOR', label: '⏳ Bekliyor' },
          ].map((tab) => {
            const isSelected = selectedFilter === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  dynamicStyles.filterChip,
                  isSelected && dynamicStyles.filterChipSelected,
                ]}
                onPress={() => setSelectedFilter(tab.key as any)}
              >
                <Text
                  style={[
                    dynamicStyles.filterChipText,
                    isSelected && dynamicStyles.filterChipTextSelected,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* List */}
      {isLoading ? (
        <View style={dynamicStyles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.danger} />
          <Text style={dynamicStyles.loadingText}>Açık hesaplar yükleniyor...</Text>
        </View>
      ) : filteredOrders.length === 0 ? (
        <View style={dynamicStyles.emptyContainer}>
          <Text style={{ fontSize: 50, marginBottom: 12 }}>🎉</Text>
          <Text style={dynamicStyles.emptyTitle}>Tebrikler! Açık Hesap Bulunmuyor</Text>
          <Text style={dynamicStyles.emptySubtitle}>
            {search ? 'Aramanıza uygun borç kaydı bulunamadı.' : 'Tüm iş emirlerinin ödemeleri eksiksiz tahsil edildi.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.danger} />}
          contentContainerStyle={dynamicStyles.listContent}
          renderItem={({ item }) => {
            const remaining = item.remainingAmount || (item.totalAmount - (item.paidAmount || 0));
            const statusConfig = {
              VERESIYE: { label: 'VERESİYE', bg: '#EF444420', color: '#EF4444', icon: '🔴' },
              KISMI: { label: 'KISMİ ÖDEME', bg: '#F59E0B20', color: '#F59E0B', icon: '🟡' },
              BEKLIYOR: { label: 'ÖDEME BEKLİYOR', bg: '#64748B20', color: '#64748B', icon: '⏳' },
              ODENDI: { label: 'ÖDENDİ', bg: '#10B98120', color: '#10B981', icon: '✅' },
            }[item.paymentStatus as string] || { label: 'BEKLİYOR', bg: '#64748B20', color: '#64748B', icon: '⏳' };

            return (
              <View style={dynamicStyles.debtCard}>
                {/* Header row */}
                <View style={dynamicStyles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={dynamicStyles.customerName}>{item.customerName}</Text>
                    {item.vehicleInfo && (
                      <View style={dynamicStyles.vehicleBadge}>
                        <Text style={dynamicStyles.vehicleText}>🚗 {item.vehicleInfo}</Text>
                      </View>
                    )}
                  </View>
                  <View style={[dynamicStyles.statusBadge, { backgroundColor: statusConfig.bg }]}>
                    <Text style={[dynamicStyles.statusBadgeText, { color: statusConfig.color }]}>
                      {statusConfig.icon} {statusConfig.label}
                    </Text>
                  </View>
                </View>

                {/* Title & Date */}
                <Text style={dynamicStyles.orderTitle}>{item.title}</Text>
                <View style={dynamicStyles.metaRow}>
                  <Calendar size={13} color={theme.textMuted} />
                  <Text style={dynamicStyles.metaText}>
                    {new Date(item.createdAt).toLocaleDateString('tr-TR')}
                    {item.daysPassed > 0 ? ` (${item.daysPassed} gün önce)` : ' (Bugün)'}
                  </Text>
                  {item.paymentMethod && (
                    <Text style={[dynamicStyles.metaText, { marginLeft: Spacing.sm }]}>
                      💳 {item.paymentMethod}
                    </Text>
                  )}
                </View>

                {/* Debt Amount Box */}
                <View style={dynamicStyles.amountBox}>
                  <View>
                    <Text style={dynamicStyles.amountBoxSub}>Kalan Tahsilat</Text>
                    <Text style={dynamicStyles.amountBoxMain}>
                      ₺{remaining.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={dynamicStyles.amountBoxMeta}>
                      Toplam: ₺{item.totalAmount?.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                    </Text>
                    <Text style={[dynamicStyles.amountBoxMeta, { color: theme.success }]}>
                      Ödenen: ₺{item.paidAmount?.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                    </Text>
                  </View>
                </View>

                {/* Notes */}
                {item.paymentNotes && (
                  <View style={dynamicStyles.notesBox}>
                    <Text style={dynamicStyles.notesText}>📝 {item.paymentNotes}</Text>
                  </View>
                )}

                {/* Action Buttons */}
                <View style={dynamicStyles.cardActions}>
                  {item.customerPhone ? (
                    <>
                      <TouchableOpacity
                        style={[dynamicStyles.actionBtn, { backgroundColor: '#25D366' }]}
                        onPress={() => handleSendWhatsAppReminder(item)}
                      >
                        <MessageSquare size={16} color="#fff" />
                        <Text style={dynamicStyles.actionBtnText}>WhatsApp</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[dynamicStyles.actionBtn, { backgroundColor: theme.primary }]}
                        onPress={() => handleCallCustomer(item.customerPhone)}
                      >
                        <Phone size={16} color="#fff" />
                        <Text style={dynamicStyles.actionBtnText}>Ara</Text>
                      </TouchableOpacity>
                    </>
                  ) : null}

                  <TouchableOpacity
                    style={[dynamicStyles.actionBtn, { backgroundColor: theme.success }]}
                    onPress={() => handleOpenPaymentModal(item)}
                  >
                    <DollarSign size={16} color="#fff" />
                    <Text style={dynamicStyles.actionBtnText}>Tahsil Et</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[dynamicStyles.actionBtnOutline, { borderColor: theme.border }]}
                    onPress={() => router.push(`/work-orders/${item.id}` as any)}
                  >
                    <Text style={[dynamicStyles.actionBtnOutlineText, { color: theme.textPrimary }]}>İş Emri</Text>
                    <ChevronRight size={14} color={theme.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Tahsilat / Ödeme Alma Modalı */}
      <Modal visible={showPaymentModal} animationType="slide" transparent onRequestClose={() => setShowPaymentModal(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={dynamicStyles.modalBackdrop}
        >
          <View style={dynamicStyles.modalContent}>
            <View style={dynamicStyles.modalHeader}>
              <View>
                <Text style={dynamicStyles.modalTitle}>💰 Tahsilat / Ödeme Girişi</Text>
                <Text style={dynamicStyles.modalSubtitle}>
                  {selectedOrder?.customerName} — {selectedOrder?.vehicleInfo}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowPaymentModal(false)} style={dynamicStyles.modalCloseBtn}>
                <Text style={{ color: theme.textMuted, fontSize: 18 }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: Spacing.lg }}>
              {/* Debt comparison 3-metric banner */}
              <View style={{ marginBottom: Spacing.md }}>
                <Text style={{ fontSize: Typography.fontSize.xs, fontWeight: '800', color: theme.textMuted, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 8 }}>
                  📊 İş Emri Bakiye Detayları
                </Text>

                <View style={{ flexDirection: 'row', gap: Spacing.xs }}>
                  <View style={{ flex: 1, backgroundColor: theme.surface, borderRadius: BorderRadius.md, padding: Spacing.sm + 2, borderWidth: 1, borderColor: theme.border, borderTopWidth: 3, borderTopColor: theme.primary }}>
                    <Text style={{ fontSize: 9, fontWeight: '800', color: theme.textMuted, textTransform: 'uppercase' }}>1. İŞ EMRİ TUTARI</Text>
                    <Text style={{ fontSize: Typography.fontSize.sm, fontWeight: '900', color: theme.textPrimary, marginTop: 4 }}>
                      ₺{(selectedOrder?.totalAmount || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Text>
                    <Text style={{ fontSize: 9, color: theme.textMuted, marginTop: 2 }}>Toplam Bedel</Text>
                  </View>

                  <View style={{ flex: 1, backgroundColor: theme.surface, borderRadius: BorderRadius.md, padding: Spacing.sm + 2, borderWidth: 1, borderColor: theme.border, borderTopWidth: 3, borderTopColor: theme.success }}>
                    <Text style={{ fontSize: 9, fontWeight: '800', color: theme.success, textTransform: 'uppercase' }}>2. ALINAN (ÖDENEN)</Text>
                    <Text style={{ fontSize: Typography.fontSize.sm, fontWeight: '900', color: theme.success, marginTop: 4 }}>
                      ₺{(selectedOrder?.paidAmount || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Text>
                    <Text style={{ fontSize: 9, color: theme.textMuted, marginTop: 2 }}>Kasaya Giren</Text>
                  </View>

                  <View style={{ flex: 1, backgroundColor: theme.surface, borderRadius: BorderRadius.md, padding: Spacing.sm + 2, borderWidth: 1, borderColor: theme.border, borderTopWidth: 3, borderTopColor: theme.danger }}>
                    <Text style={{ fontSize: 9, fontWeight: '800', color: theme.danger, textTransform: 'uppercase' }}>3. KALAN BORÇ</Text>
                    <Text style={{ fontSize: Typography.fontSize.sm, fontWeight: '900', color: theme.danger, marginTop: 4 }}>
                      ₺{(selectedOrder?.remainingAmount || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Text>
                    <Text style={{ fontSize: 9, color: theme.danger, marginTop: 2 }}>Açık Bakiye</Text>
                  </View>
                </View>
              </View>

              {/* Amount input */}
              <Text style={dynamicStyles.inputLabel}>Tahsil Edilecek Tutar (₺) *</Text>
              <TextInput
                style={dynamicStyles.amountInput}
                keyboardType="numeric"
                value={payAmount}
                onChangeText={handleAmountChange}
                placeholder="0"
                placeholderTextColor={theme.textMuted}
                autoFocus
              />

              {/* Quick Amount Shortcuts */}
              <View style={dynamicStyles.quickAmountRow}>
                <TouchableOpacity
                  style={dynamicStyles.quickAmountBtn}
                  onPress={() => handleAmountChange(String(selectedOrder?.remainingAmount || 0))}
                >
                  <Text style={dynamicStyles.quickAmountText}>Tamamını Kapat</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={dynamicStyles.quickAmountBtn}
                  onPress={() => handleAmountChange(String(Math.round((selectedOrder?.remainingAmount || 0) / 2)))}
                >
                  <Text style={dynamicStyles.quickAmountText}>Yarısını Tahsil Et</Text>
                </TouchableOpacity>
              </View>

              {/* Smart Tip Notice if amount > remaining */}
              {(() => {
                const rem = selectedOrder?.remainingAmount ?? Math.max(0, (selectedOrder?.totalAmount || 0) - (selectedOrder?.paidAmount || 0));
                const amt = parseFloat(payAmount) || 0;
                const tip = Math.max(0, amt - rem);
                if (tip > 0 && rem > 0) {
                  return (
                    <View
                      style={{
                        backgroundColor: '#10B98115',
                        borderWidth: 1,
                        borderColor: '#10B981',
                        borderRadius: BorderRadius.md,
                        padding: Spacing.sm + 2,
                        marginVertical: Spacing.sm,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: Typography.fontSize.xs, fontWeight: '800', color: '#059669' }}>
                          🎁 Fazla Tutar: +₺{tip.toLocaleString('tr-TR')} (Bahşiş)
                        </Text>
                        <TouchableOpacity
                          style={{
                            backgroundColor: theme.surface,
                            borderWidth: 1,
                            borderColor: '#059669',
                            borderRadius: BorderRadius.sm,
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                          }}
                          onPress={() => handleAmountChange(String(rem))}
                        >
                          <Text style={{ fontSize: 10, fontWeight: '700', color: '#059669' }}>
                            Kalan Tutara Eşitle (₺{rem.toLocaleString('tr-TR')})
                          </Text>
                        </TouchableOpacity>
                      </View>
                      <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 4 }}>
                        Kalan ₺{rem.toLocaleString('tr-TR')} borç kapatılacak, fazla girilen ₺{tip.toLocaleString('tr-TR')} tutar kasaya Bahşiş / Usta İkramiyesi olarak kaydedilecektir.
                      </Text>
                    </View>
                  );
                }
                return null;
              })()}

              {/* Payment Method */}
              <Text style={dynamicStyles.inputLabel}>Ödeme Şekli</Text>
              <View style={dynamicStyles.methodsGrid}>
                {[
                  { id: 'NAKIT', label: '💵 Nakit' },
                  { id: 'KREDI_KARTI', label: '💳 Kredi Kartı' },
                  { id: 'HAVALE', label: '🏦 Havale/EFT' },
                  { id: 'VERESIYE', label: '🔴 Veresiye' },
                ].map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    style={[
                      dynamicStyles.methodBtn,
                      payMethod === m.id && dynamicStyles.methodBtnSelected,
                    ]}
                    onPress={() => setPayMethod(m.id)}
                  >
                    <Text
                      style={[
                        dynamicStyles.methodBtnText,
                        payMethod === m.id && dynamicStyles.methodBtnTextSelected,
                      ]}
                    >
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Status picker */}
              <Text style={dynamicStyles.inputLabel}>Yeni Ödeme Durumu</Text>
              <View style={dynamicStyles.statusSelectRow}>
                {[
                  { id: 'ODENDI', label: '✅ Ödendi', color: theme.success },
                  { id: 'KISMI', label: '🟡 Kısmi', color: '#F59E0B' },
                  { id: 'VERESIYE', label: '🔴 Veresiye', color: theme.danger },
                ].map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    style={[
                      dynamicStyles.statusSelectBtn,
                      payStatus === s.id && { borderColor: s.color, backgroundColor: s.color + '20' },
                    ]}
                    onPress={() => setPayStatus(s.id)}
                  >
                    <Text
                      style={[
                        dynamicStyles.statusSelectText,
                        payStatus === s.id && { color: s.color, fontWeight: '800' },
                      ]}
                    >
                      {s.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Notes */}
              <Text style={dynamicStyles.inputLabel}>Ödeme Notu / Vade (Opsiyonel)</Text>
              <CannedNotesPicker currentNote={payNotes} onSelectNote={setPayNotes} theme={theme} />
              <TextInput
                style={dynamicStyles.notesInput}
                placeholder="Örn: 1.000 TL elden alındı, kalanı cuma günü ödenecek..."
                placeholderTextColor={theme.textMuted}
                value={payNotes}
                onChangeText={setPayNotes}
                multiline
              />

              {/* Save Button */}
              <TouchableOpacity
                style={[
                  dynamicStyles.submitBtn,
                  paymentMutation.isPending && { opacity: 0.7 },
                ]}
                onPress={handleSavePayment}
                disabled={paymentMutation.isPending}
              >
                {paymentMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Check size={18} color="#fff" />
                    <Text style={dynamicStyles.submitBtnText}>Tahsilatı Kaydet</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      padding: Spacing.lg,
      paddingTop: Spacing.md,
      ...Shadows.md,
    },
    headerTop: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    backButton: {
      width: 38,
      height: 38,
      borderRadius: BorderRadius.full,
      backgroundColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: Typography.fontSize.xl,
      fontWeight: '800',
      color: '#fff',
    },
    headerSubtitle: {
      fontSize: Typography.fontSize.xs,
      color: 'rgba(255,255,255,0.85)',
      marginTop: 2,
    },
    summaryCard: {
      flexDirection: 'row',
      backgroundColor: 'rgba(0,0,0,0.25)',
      borderRadius: BorderRadius.lg,
      padding: Spacing.md,
      marginTop: Spacing.md,
      alignItems: 'center',
    },
    summaryItemMain: {
      flex: 1.5,
    },
    summaryMainLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: 'rgba(255,255,255,0.7)',
      letterSpacing: 0.5,
    },
    summaryMainValue: {
      fontSize: Typography.fontSize.xl,
      fontWeight: '900',
      color: '#fff',
      marginTop: 2,
    },
    summaryDivider: {
      width: 1,
      height: 34,
      backgroundColor: 'rgba(255,255,255,0.2)',
      marginHorizontal: Spacing.sm,
    },
    summaryItem: {
      flex: 1,
      alignItems: 'center',
    },
    summarySubValue: {
      fontSize: Typography.fontSize.lg,
      fontWeight: '800',
      color: '#fff',
    },
    summarySubLabel: {
      fontSize: 10,
      color: 'rgba(255,255,255,0.75)',
      marginTop: 2,
      textAlign: 'center',
    },

    searchContainer: {
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.md,
    },
    searchInputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surface,
      borderRadius: BorderRadius.md,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: Spacing.md,
      height: 44,
      gap: Spacing.sm,
    },
    searchInput: {
      flex: 1,
      color: theme.textPrimary,
      fontSize: Typography.fontSize.sm,
    },

    filterTabsContainer: {
      paddingVertical: Spacing.sm,
    },
    filterTabs: {
      paddingHorizontal: Spacing.lg,
      gap: Spacing.xs,
    },
    filterChip: {
      paddingHorizontal: Spacing.md,
      paddingVertical: 6,
      borderRadius: BorderRadius.full,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
    },
    filterChipSelected: {
      backgroundColor: theme.danger + '20',
      borderColor: theme.danger,
    },
    filterChipText: {
      fontSize: Typography.fontSize.xs,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    filterChipTextSelected: {
      color: theme.danger,
      fontWeight: '700',
    },

    listContent: {
      padding: Spacing.lg,
      paddingTop: Spacing.xs,
      gap: Spacing.md,
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
    },
    loadingText: {
      color: theme.textSecondary,
      fontSize: Typography.fontSize.sm,
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: Spacing['2xl'],
    },
    emptyTitle: {
      fontSize: Typography.fontSize.lg,
      fontWeight: '800',
      color: theme.textPrimary,
      textAlign: 'center',
      marginBottom: 6,
    },
    emptySubtitle: {
      fontSize: Typography.fontSize.sm,
      color: theme.textSecondary,
      textAlign: 'center',
    },

    debtCard: {
      backgroundColor: theme.surface,
      borderRadius: BorderRadius.lg,
      borderWidth: 1,
      borderColor: theme.border,
      padding: Spacing.md,
      ...Shadows.sm,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    customerName: {
      fontSize: Typography.fontSize.base,
      fontWeight: '800',
      color: theme.textPrimary,
    },
    vehicleBadge: {
      alignSelf: 'flex-start',
      backgroundColor: theme.primary + '15',
      borderRadius: BorderRadius.sm,
      paddingHorizontal: 6,
      paddingVertical: 2,
      marginTop: 3,
    },
    vehicleText: {
      fontSize: Typography.fontSize.xs,
      color: theme.primary,
      fontWeight: '700',
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: BorderRadius.full,
    },
    statusBadgeText: {
      fontSize: 10,
      fontWeight: '800',
    },
    orderTitle: {
      fontSize: Typography.fontSize.sm,
      fontWeight: '600',
      color: theme.textSecondary,
      marginTop: Spacing.sm,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
    },
    metaText: {
      fontSize: Typography.fontSize.xs,
      color: theme.textMuted,
      marginLeft: 4,
    },

    amountBox: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: theme.danger + '0F',
      borderRadius: BorderRadius.md,
      borderWidth: 1,
      borderColor: theme.danger + '30',
      padding: Spacing.md,
      marginTop: Spacing.md,
    },
    amountBoxSub: {
      fontSize: 10,
      fontWeight: '700',
      color: theme.danger,
      letterSpacing: 0.5,
    },
    amountBoxMain: {
      fontSize: Typography.fontSize.lg,
      fontWeight: '900',
      color: theme.danger,
      marginTop: 1,
    },
    amountBoxMeta: {
      fontSize: Typography.fontSize.xs,
      color: theme.textSecondary,
    },
    notesBox: {
      backgroundColor: theme.surfaceAlt || '#f8fafc',
      borderRadius: BorderRadius.sm,
      padding: Spacing.sm,
      marginTop: Spacing.sm,
    },
    notesText: {
      fontSize: Typography.fontSize.xs,
      color: theme.textSecondary,
      fontStyle: 'italic',
    },

    cardActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      marginTop: Spacing.md,
      paddingTop: Spacing.sm,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    actionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      paddingVertical: 7,
      borderRadius: BorderRadius.md,
    },
    actionBtnText: {
      color: '#fff',
      fontSize: Typography.fontSize.xs,
      fontWeight: '700',
    },
    actionBtnOutline: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 7,
      borderRadius: BorderRadius.md,
      borderWidth: 1,
    },
    actionBtnOutlineText: {
      fontSize: Typography.fontSize.xs,
      fontWeight: '600',
    },

    // Modal
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: theme.background,
      borderTopLeftRadius: BorderRadius.xl,
      borderTopRightRadius: BorderRadius.xl,
      maxHeight: '90%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: Spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    modalTitle: {
      fontSize: Typography.fontSize.lg,
      fontWeight: '800',
      color: theme.textPrimary,
    },
    modalSubtitle: {
      fontSize: Typography.fontSize.xs,
      color: theme.textSecondary,
      marginTop: 2,
    },
    modalCloseBtn: {
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },

    modalBalanceBanner: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      backgroundColor: theme.surface,
      borderRadius: BorderRadius.md,
      padding: Spacing.md,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: Spacing.md,
    },
    modalBalanceLabel: {
      fontSize: Typography.fontSize.xs,
      color: theme.textMuted,
    },
    modalBalanceVal: {
      fontSize: Typography.fontSize.base,
      fontWeight: '800',
      color: theme.textPrimary,
      marginTop: 2,
    },

    inputLabel: {
      fontSize: Typography.fontSize.xs,
      fontWeight: '700',
      color: theme.textPrimary,
      marginBottom: 6,
      marginTop: Spacing.sm,
    },
    amountInput: {
      backgroundColor: theme.surface,
      borderRadius: BorderRadius.md,
      borderWidth: 2,
      borderColor: theme.success,
      padding: Spacing.md,
      fontSize: Typography.fontSize.xl,
      fontWeight: '800',
      color: theme.textPrimary,
      textAlign: 'center',
    },
    quickAmountRow: {
      flexDirection: 'row',
      gap: Spacing.sm,
      marginTop: Spacing.xs,
      marginBottom: Spacing.sm,
    },
    quickAmountBtn: {
      flex: 1,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: BorderRadius.sm,
      paddingVertical: 6,
      alignItems: 'center',
    },
    quickAmountText: {
      fontSize: Typography.fontSize.xs,
      fontWeight: '600',
      color: theme.primary,
    },

    methodsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.xs,
      marginBottom: Spacing.sm,
    },
    methodBtn: {
      flex: 1,
      minWidth: '45%',
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: BorderRadius.md,
      paddingVertical: Spacing.sm,
      alignItems: 'center',
    },
    methodBtnSelected: {
      borderColor: theme.primary,
      backgroundColor: theme.primary + '15',
    },
    methodBtnText: {
      fontSize: Typography.fontSize.xs,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    methodBtnTextSelected: {
      color: theme.primary,
      fontWeight: '800',
    },

    statusSelectRow: {
      flexDirection: 'row',
      gap: Spacing.xs,
      marginBottom: Spacing.sm,
    },
    statusSelectBtn: {
      flex: 1,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: BorderRadius.md,
      paddingVertical: Spacing.sm,
      alignItems: 'center',
    },
    statusSelectText: {
      fontSize: Typography.fontSize.xs,
      fontWeight: '600',
      color: theme.textSecondary,
    },

    notesInput: {
      backgroundColor: theme.surface,
      borderRadius: BorderRadius.md,
      borderWidth: 1,
      borderColor: theme.border,
      padding: Spacing.md,
      color: theme.textPrimary,
      fontSize: Typography.fontSize.sm,
      minHeight: 60,
      textAlignVertical: 'top',
      marginBottom: Spacing.lg,
    },
    submitBtn: {
      backgroundColor: theme.success,
      borderRadius: BorderRadius.md,
      paddingVertical: Spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.xs,
      ...Shadows.sm,
    },
    submitBtnText: {
      color: '#fff',
      fontSize: Typography.fontSize.base,
      fontWeight: '800',
    },
  });
