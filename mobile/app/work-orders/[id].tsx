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
import { workOrderAPI, partsAPI, uploadAPI, warehouseAPI, companiesAPI } from '../../src/api/client';
import { Typography, Spacing, BorderRadius, Shadows } from '../../src/constants/theme';
import { useAppTheme } from '../../src/hooks/useAppTheme';
import { useAuthStore } from '../../src/store/auth.store';
import {
  Plus,
  Minus,
  Search,
  ShoppingBag,
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
import { CannedNotesPicker } from '../../src/components/CannedNotesPicker';
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

// ─── Atölye Sarf Malzemesi Ekle Modalı ───────────────────────────────────────
const CONSUMABLE_PRESETS = [
  { name: 'Genel Atölye Sarf Paketi (Balata Spreyi, Tiner, Zımpara, Sarfiyat)', price: '250', icon: '🧰' },
  { name: 'Balata Spreyi (1 Kutu)', price: '150', icon: '🧪' },
  { name: 'Sıvı Conta & Yapıştırıcı Silikon', price: '100', icon: '🧴' },
  { name: 'Pas Sökücü & Yağlayıcı Sprey (WD-40)', price: '120', icon: '⚙️' },
  { name: 'Karter / Şanzıman Yağ Temizleme & Tiner', price: '150', icon: '🛢️' },
];

function WorkshopConsumableModal({
  visible,
  orderId,
  onClose,
  theme,
}: {
  visible: boolean;
  orderId: string;
  onClose: () => void;
  theme: any;
}) {
  const queryClient = useQueryClient();
  const [selectedPreset, setSelectedPreset] = useState<any>(CONSUMABLE_PRESETS[0]);
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [isCustom, setIsCustom] = useState(false);

  const addConsumableMutation = useMutation({
    mutationFn: async () => {
      const name = isCustom ? customName.trim() : selectedPreset.name;
      const price = parseFloat((isCustom ? customPrice : selectedPreset.price).replace(',', '.')) || 0;
      const qty = parseInt(quantity) || 1;

      if (!name) throw new Error('Lütfen sarfiyat adını belirtin.');

      // 1. Önce bu isimde parça var mı kontrol et
      const existingRes = await partsAPI.getAll({ search: name, limit: 5 });
      const found = existingRes.data?.data?.find(
        (p: any) => p.name.toLowerCase() === name.toLowerCase()
      );

      let partId = found?.id;

      if (!partId) {
        // Yeni sarf parçası oluştur
        const newPartRes = await partsAPI.create({
          name,
          category: 'Sarf Malzeme',
          quantity: 99,
          unit: 'adet',
          purchasePrice: price * 0.6,
          sellingPrice: price,
          notes: 'Otomatik atölye sarf malzemesi kaydı',
        });
        const created = newPartRes.data?.data || newPartRes.data;
        partId = created.id;
      }

      // 2. İş emrine ekle
      return await workOrderAPI.addItem(orderId, {
        partId,
        quantity: qty,
        unitPrice: price,
        notes: 'Atölye Sarfiyatı',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['parts'] });
      Alert.alert('✅ Eklendi', 'Atölye sarf malzemesi iş emrine başarıyla eklendi.');
      onClose();
    },
    onError: (err: any) => {
      Alert.alert('Hata', err?.response?.data?.error || err?.message || 'Sarf malzemesi eklenemedi.');
    },
  });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: theme.background }}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: theme.border }}>
            <View>
              <Text style={{ fontSize: Typography.fontSize.lg, fontWeight: '800', color: theme.textPrimary }}>
                🧰 Atölye Sarfiyatı Ekle
              </Text>
              <Text style={{ fontSize: Typography.fontSize.xs, color: theme.textSecondary, marginTop: 2 }}>
                Balata spreyi, sıvı conta ve genel sarfları hızlıca ekleyin
              </Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ color: theme.primary, fontWeight: '700' }}>Kapat</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.md }}>
            <Text style={{ fontSize: Typography.fontSize.xs, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase' }}>
              Hızlı Sarf Paketi Seçin
            </Text>

            {CONSUMABLE_PRESETS.map((preset, idx) => {
              const isSelected = !isCustom && selectedPreset?.name === preset.name;
              return (
                <TouchableOpacity
                  key={idx}
                  onPress={() => {
                    setSelectedPreset(preset);
                    setIsCustom(false);
                  }}
                  style={{
                    backgroundColor: isSelected ? theme.primary + '15' : theme.surface,
                    borderColor: isSelected ? theme.primary : theme.border,
                    borderWidth: 1.5,
                    borderRadius: BorderRadius.md,
                    padding: Spacing.md,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 }}>
                    <Text style={{ fontSize: 24 }}>{preset.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: Typography.fontSize.sm, fontWeight: '700', color: theme.textPrimary }}>
                        {preset.name}
                      </Text>
                      <Text style={{ fontSize: Typography.fontSize.xs, color: theme.textMuted, marginTop: 2 }}>
                        Önerilen Yansıtma Tutarı
                      </Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: Typography.fontSize.base, fontWeight: '800', color: theme.primary }}>
                    ₺{preset.price}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {/* Özel Sarf Girişi */}
            <TouchableOpacity
              onPress={() => setIsCustom(true)}
              style={{
                backgroundColor: isCustom ? theme.primary + '15' : theme.surface,
                borderColor: isCustom ? theme.primary : theme.border,
                borderWidth: 1.5,
                borderRadius: BorderRadius.md,
                padding: Spacing.md,
              }}
            >
              <Text style={{ fontSize: Typography.fontSize.sm, fontWeight: '700', color: theme.textPrimary, marginBottom: Spacing.xs }}>
                ✏️ Özel Sarf Malzemesi Gir
              </Text>
              {isCustom && (
                <View style={{ gap: Spacing.sm, marginTop: Spacing.xs }}>
                  <TextInput
                    style={{
                      backgroundColor: theme.background,
                      borderWidth: 1,
                      borderColor: theme.border,
                      borderRadius: BorderRadius.sm,
                      padding: Spacing.sm,
                      color: theme.textPrimary,
                      fontSize: Typography.fontSize.sm,
                    }}
                    placeholder="Sarf malzemesi adı (örn: Tiner, Zımpara)"
                    placeholderTextColor={theme.textMuted}
                    value={customName}
                    onChangeText={setCustomName}
                  />
                  <TextInput
                    style={{
                      backgroundColor: theme.background,
                      borderWidth: 1,
                      borderColor: theme.border,
                      borderRadius: BorderRadius.sm,
                      padding: Spacing.sm,
                      color: theme.textPrimary,
                      fontSize: Typography.fontSize.sm,
                    }}
                    placeholder="Müşteriye Yansıtılacak Fiyat (₺)"
                    placeholderTextColor={theme.textMuted}
                    value={customPrice}
                    onChangeText={setCustomPrice}
                    keyboardType="decimal-pad"
                  />
                </View>
              )}
            </TouchableOpacity>

            {/* Miktar */}
            <View style={{ marginTop: Spacing.xs }}>
              <Text style={{ fontSize: Typography.fontSize.xs, fontWeight: '700', color: theme.textSecondary, marginBottom: 4 }}>
                MİKTAR (ADET)
              </Text>
              <TextInput
                style={{
                  backgroundColor: theme.surface,
                  borderWidth: 1,
                  borderColor: theme.border,
                  borderRadius: BorderRadius.md,
                  padding: Spacing.md,
                  color: theme.textPrimary,
                  fontSize: Typography.fontSize.base,
                  fontWeight: '700',
                }}
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="numeric"
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
              onPress={() => addConsumableMutation.mutate()}
              disabled={addConsumableMutation.isPending}
            >
              {addConsumableMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontSize: Typography.fontSize.base, fontWeight: '800' }}>
                  + İş Emrine Sarfiyatı Ekle
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Çıkma Parça Envantere Alma Modalı ────────────────────────────────────────
function SalvagePartModal({
  visible,
  order,
  onClose,
  theme,
}: {
  visible: boolean;
  order: any;
  onClose: () => void;
  theme: any;
}) {
  const queryClient = useQueryClient();
  const [partName, setPartName] = useState('');
  const [category, setCategory] = useState('Motor');
  const [warehouseId, setWarehouseId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [sellingPrice, setSellingPrice] = useState('');
  const [notes, setNotes] = useState('');

  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehouseAPI.getAll(),
    enabled: visible,
  });
  const warehouses: any[] = (warehousesData as any)?.data?.data || (warehousesData as any)?.data || [];

  React.useEffect(() => {
    if (visible && order) {
      const vInfo = order.vehicleInfo ? ` (${order.vehicleInfo})` : '';
      setPartName(`Çıkma Parça${vInfo}`);
      setNotes(`${order.vehicleInfo || order.title} nolu araçtan sağlam olarak sökülmüştür.`);
      if (warehouses.length > 0 && !warehouseId) {
        const def = warehouses.find((w: any) => w.isDefault) || warehouses[0];
        setWarehouseId(def.id);
      }
    }
  }, [visible, order, warehouses]);

  const salvageMutation = useMutation({
    mutationFn: async () => {
      if (!partName.trim()) throw new Error('Lütfen parça adını girin.');
      const qty = parseInt(quantity) || 1;
      const sPrice = sellingPrice ? parseFloat(sellingPrice.replace(',', '.')) : 0;

      return await partsAPI.create({
        name: partName.trim(),
        condition: 'USED', // ÇIKMA PARÇA
        category: category || 'Çıkma / İkinci El',
        quantity: qty,
        unit: 'adet',
        purchasePrice: 0, // Araçtan söküldü, maliyeti 0 TL
        sellingPrice: sPrice,
        warehouseId: warehouseId || undefined,
        notes: notes.trim(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parts'] });
      queryClient.invalidateQueries({ queryKey: ['warehouseStats'] });
      queryClient.invalidateQueries({ queryKey: ['parts-search-wo'] });
      Alert.alert(
        '♻️ Çıkma Parça Kaydedildi',
        'Araçtan sökülen parça "Çıkma (İkinci El)" olarak depo envanterinize eklendi.'
      );
      onClose();
    },
    onError: (err: any) => {
      Alert.alert('Hata', err?.response?.data?.error || err?.message || 'Çıkma parça kaydedilemedi.');
    },
  });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: theme.background }}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: theme.border }}>
            <View>
              <Text style={{ fontSize: Typography.fontSize.lg, fontWeight: '800', color: theme.textPrimary }}>
                ♻️ Çıkma Parça Envantere Al
              </Text>
              <Text style={{ fontSize: Typography.fontSize.xs, color: theme.textSecondary, marginTop: 2 }}>
                Araçtan sökülen sağlam parçayı ikinci el stoğunuza kaydedin
              </Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ color: theme.primary, fontWeight: '700' }}>Kapat</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.md }}>
            <View
              style={{
                backgroundColor: '#ECFDF5',
                borderColor: '#A7F3D0',
                borderWidth: 1,
                borderRadius: BorderRadius.md,
                padding: Spacing.md,
                flexDirection: 'row',
                alignItems: 'center',
                gap: Spacing.sm,
              }}
            >
              <Text style={{ fontSize: 24 }}>💡</Text>
              <Text style={{ fontSize: Typography.fontSize.xs, color: '#065F46', flex: 1 }}>
                Sökülen alternatör, marş motoru, kaliper vb. parçaları 0 TL maliyetle "Çıkma / İkinci El" olarak kaydedip ileride başka müşterilere satabilirsiniz.
              </Text>
            </View>

            <View>
              <Text style={{ fontSize: Typography.fontSize.xs, fontWeight: '700', color: theme.textSecondary, marginBottom: 4 }}>
                PARÇA ADI *
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
                placeholder="Örn: Çıkma Marş Motoru (Honda PCX)"
                placeholderTextColor={theme.textMuted}
                value={partName}
                onChangeText={setPartName}
              />
            </View>

            <View style={{ flexDirection: 'row', gap: Spacing.md }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: Typography.fontSize.xs, fontWeight: '700', color: theme.textSecondary, marginBottom: 4 }}>
                  ADET
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
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="numeric"
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: Typography.fontSize.xs, fontWeight: '700', color: theme.textSecondary, marginBottom: 4 }}>
                  TAHMİNİ SATIŞ FİYATI (₺)
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
                  placeholder="0,00"
                  placeholderTextColor={theme.textMuted}
                  value={sellingPrice}
                  onChangeText={setSellingPrice}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            {/* Depo Seçimi */}
            {warehouses.length > 0 && (
              <View>
                <Text style={{ fontSize: Typography.fontSize.xs, fontWeight: '700', color: theme.textSecondary, marginBottom: 4 }}>
                  HEDEF DEPO / RAF
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {warehouses.map((w: any) => {
                    const isSel = warehouseId === w.id;
                    return (
                      <TouchableOpacity
                        key={w.id}
                        onPress={() => setWarehouseId(w.id)}
                        style={{
                          backgroundColor: isSel ? theme.primary : theme.surface,
                          borderColor: isSel ? theme.primary : theme.border,
                          borderWidth: 1,
                          borderRadius: BorderRadius.md,
                          paddingHorizontal: Spacing.md,
                          paddingVertical: 8,
                        }}
                      >
                        <Text style={{ color: isSel ? '#fff' : theme.textPrimary, fontWeight: '700', fontSize: Typography.fontSize.xs }}>
                          🏢 {w.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            <View>
              <Text style={{ fontSize: Typography.fontSize.xs, fontWeight: '700', color: theme.textSecondary, marginBottom: 4 }}>
                SÖKÜM VE DURUM NOTU
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
                  minHeight: 60,
                }}
                multiline
                placeholder="Parçanın durumu, revizyon ihtiyacı vb."
                placeholderTextColor={theme.textMuted}
                value={notes}
                onChangeText={setNotes}
              />
            </View>

            <TouchableOpacity
              style={{
                backgroundColor: '#059669',
                borderRadius: BorderRadius.md,
                paddingVertical: Spacing.md,
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: Spacing.sm,
                ...Shadows.sm,
              }}
              onPress={() => salvageMutation.mutate()}
              disabled={salvageMutation.isPending}
            >
              {salvageMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontSize: Typography.fontSize.base, fontWeight: '800' }}>
                  ♻️ Çıkma Parçayı Depoya Kaydet
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Parça Ekle Modal (Çoklu Parça Seçimi & Sepet) ───────────────────────────
interface SelectedPartItem {
  part: any;
  quantity: number;
  unitPrice: string;
}

function AddPartModal({ visible, orderId, onClose, theme }: any) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'LIST' | 'CREATE'>('LIST');
  const [partSearch, setPartSearch] = useState('');
  const [selectedItems, setSelectedItems] = useState<SelectedPartItem[]>([]);

  // Hızlı Yeni Parça Formu State
  const [newPart, setNewPart] = useState({
    name: '',
    brand: '',
    category: 'Motor',
    quantity: '1',
    unit: 'adet',
    purchasePrice: '',
    sellingPrice: '',
    partNumber: '',
  });

  const { data: partsData, isLoading: isPartsLoading } = useQuery({
    queryKey: ['parts-search-wo', partSearch],
    queryFn: () => partsAPI.getAll({ search: partSearch.trim() || undefined, limit: 100 }),
    enabled: visible,
  });

  const parts: any[] = (partsData as any)?.data || [];

  // Çoklu Parça Yönetim Fonksiyonları
  const handleAddOrIncrement = (part: any) => {
    setSelectedItems((prev) => {
      const idx = prev.findIndex((item) => item.part.id === part.id);
      if (idx > -1) {
        const copy = [...prev];
        copy[idx] = {
          ...copy[idx],
          quantity: copy[idx].quantity + 1,
        };
        return copy;
      }
      return [
        ...prev,
        {
          part,
          quantity: 1,
          unitPrice: part.sellingPrice ? String(parseFloat(part.sellingPrice)) : '',
        },
      ];
    });
  };

  const handleDecrement = (partId: string) => {
    setSelectedItems((prev) => {
      const idx = prev.findIndex((item) => item.part.id === partId);
      if (idx === -1) return prev;
      if (prev[idx].quantity <= 1) {
        return prev.filter((item) => item.part.id !== partId);
      }
      const copy = [...prev];
      copy[idx] = {
        ...copy[idx],
        quantity: copy[idx].quantity - 1,
      };
      return copy;
    });
  };

  const handleRemove = (partId: string) => {
    setSelectedItems((prev) => prev.filter((item) => item.part.id !== partId));
  };

  const handleQuantityChange = (partId: string, val: string) => {
    const qty = parseInt(val) || 0;
    if (qty <= 0) {
      handleRemove(partId);
      return;
    }
    setSelectedItems((prev) =>
      prev.map((item) => (item.part.id === partId ? { ...item, quantity: qty } : item))
    );
  };

  const handlePriceChange = (partId: string, val: string) => {
    setSelectedItems((prev) =>
      prev.map((item) => (item.part.id === partId ? { ...item, unitPrice: val } : item))
    );
  };

  // Toplam Adet ve Fiyat Hesaplamaları
  const totalQuantity = useMemo(() => {
    return selectedItems.reduce((acc, curr) => acc + curr.quantity, 0);
  }, [selectedItems]);

  const totalEstimatedPrice = useMemo(() => {
    return selectedItems.reduce((acc, curr) => {
      const price = curr.unitPrice
        ? parseFloat(curr.unitPrice.replace(',', '.'))
        : (curr.part.sellingPrice ? parseFloat(curr.part.sellingPrice) : 0);
      return acc + (isNaN(price) ? 0 : price * curr.quantity);
    }, 0);
  }, [selectedItems]);

  // Çoklu Parça Toplu Ekleme Mutasyonu
  const addBatchMutation = useMutation({
    mutationFn: () => {
      const items = selectedItems.map((item) => ({
        partId: item.part.id,
        quantity: item.quantity,
        unitPrice: item.unitPrice ? parseFloat(item.unitPrice.replace(',', '.')) : undefined,
      }));
      return workOrderAPI.addBatchItems(orderId, items);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['parts'] });
      queryClient.invalidateQueries({ queryKey: ['parts-search-wo'] });
      queryClient.invalidateQueries({ queryKey: ['warehouseStats'] });
      queryClient.invalidateQueries({ queryKey: ['partStats'] });
      Alert.alert('✅ Başarılı', `${selectedItems.length} parça (${totalQuantity} adet) iş emrine eklendi.`);
      setSelectedItems([]);
      setPartSearch('');
      onClose();
    },
    onError: (err: any) => {
      Alert.alert('Hata', err?.response?.data?.message || err?.message || 'Parçalar iş emrine eklenirken bir hata oluştu.');
    },
  });

  // Yeni parça oluşturup doğrudan iş emrine ekleme mutasyonu
  const quickCreateMutation = useMutation({
    mutationFn: async ({ addToCartOnly }: { addToCartOnly?: boolean }) => {
      const qty = parseInt(newPart.quantity) || 1;
      const purchasePrice = newPart.purchasePrice ? parseFloat(newPart.purchasePrice.replace(',', '.')) : undefined;
      const sellingPrice = newPart.sellingPrice ? parseFloat(newPart.sellingPrice.replace(',', '.')) : undefined;

      // 1. Yeni parçayı oluştur
      const createdRes: any = await partsAPI.create({
        name: newPart.name.trim(),
        brand: newPart.brand.trim() || undefined,
        partNumber: newPart.partNumber.trim() || undefined,
        category: newPart.category || 'Motor',
        quantity: qty,
        unit: newPart.unit || 'adet',
        purchasePrice,
        sellingPrice,
      });

      const createdPart = createdRes?.data || createdRes;
      if (!createdPart?.id) {
        throw new Error('Parça oluşturulamadı.');
      }

      if (addToCartOnly) {
        return { part: createdPart, qty, sellingPrice, addToCart: true };
      }

      // 2. Parçayı doğrudan iş emrine ekle
      await workOrderAPI.addItem(orderId, {
        partId: createdPart.id,
        quantity: qty,
        unitPrice: sellingPrice,
        unitCost: purchasePrice,
      });
      return { part: createdPart, qty, sellingPrice, addToCart: false };
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['work-order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['parts'] });
      queryClient.invalidateQueries({ queryKey: ['parts-search-wo'] });
      queryClient.invalidateQueries({ queryKey: ['warehouseStats'] });
      queryClient.invalidateQueries({ queryKey: ['partStats'] });

      // Formu sıfırla
      setNewPart({
        name: '',
        brand: '',
        category: 'Motor',
        quantity: '1',
        unit: 'adet',
        purchasePrice: '',
        sellingPrice: '',
        partNumber: '',
      });

      if (data?.addToCart) {
        // Sepete ekle ve List tabına dön
        setSelectedItems((prev) => [
          ...prev,
          {
            part: data.part,
            quantity: data.qty || 1,
            unitPrice: data.sellingPrice ? String(data.sellingPrice) : '',
          },
        ]);
        setActiveTab('LIST');
        Alert.alert('✅ Başarılı', `${data.part.name} oluşturuldu ve seçilen parçalara eklendi.`);
      } else {
        Alert.alert('✅ Başarılı', `${data.part.name} oluşturuldu ve doğrudan iş emrine eklendi.`);
        setSelectedItems([]);
        setPartSearch('');
        setActiveTab('LIST');
        onClose();
      }
    },
    onError: (err: any) => {
      Alert.alert('Hata', err?.response?.data?.message || err?.message || 'Yeni parça oluşturulurken bir hata oluştu.');
    },
  });

  const handleQuickCreate = (addToCartOnly = false) => {
    if (!newPart.name.trim()) {
      Alert.alert('Hata', 'Lütfen parça adını girin.');
      return;
    }
    if (!newPart.sellingPrice || parseFloat(newPart.sellingPrice.replace(',', '.')) <= 0) {
      Alert.alert('Hata', 'Lütfen müşteriye yansıtılacak satış fiyatını girin.');
      return;
    }
    quickCreateMutation.mutate({ addToCartOnly });
  };

  const isPending = addBatchMutation.isPending || quickCreateMutation.isPending;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: theme.background }}>
        <SafeAreaView style={{ flex: 1 }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: theme.border }}>
            <View>
              <Text style={{ fontSize: Typography.fontSize.lg, fontWeight: '700', color: theme.textPrimary }}>🔩 Parça Ekle</Text>
              <Text style={{ fontSize: Typography.fontSize.xs, color: theme.textMuted, marginTop: 2 }}>
                Birden fazla parçayı aynı anda seçip ekleyebilirsiniz
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} disabled={isPending}>
              <Text style={{ color: theme.primary, fontWeight: '600' }}>Kapat</Text>
            </TouchableOpacity>
          </View>

          {/* Sekme Seçici */}
          <View style={{ flexDirection: 'row', paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, gap: Spacing.sm }}>
            <TouchableOpacity
              onPress={() => setActiveTab('LIST')}
              style={{
                flex: 1,
                paddingVertical: 10,
                alignItems: 'center',
                borderRadius: BorderRadius.md,
                backgroundColor: activeTab === 'LIST' ? theme.primary : theme.surface,
                borderWidth: 1,
                borderColor: activeTab === 'LIST' ? theme.primary : theme.border,
              }}
            >
              <Text style={{ color: activeTab === 'LIST' ? '#fff' : theme.textSecondary, fontWeight: '700', fontSize: Typography.fontSize.sm }}>
                📋 Parça Listesi {selectedItems.length > 0 ? `(${selectedItems.length})` : ''}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                if (partSearch.trim() && !newPart.name) {
                  setNewPart((prev) => ({ ...prev, name: partSearch.trim() }));
                }
                setActiveTab('CREATE');
              }}
              style={{
                flex: 1,
                paddingVertical: 10,
                alignItems: 'center',
                borderRadius: BorderRadius.md,
                backgroundColor: activeTab === 'CREATE' ? theme.primary : theme.surface,
                borderWidth: 1,
                borderColor: activeTab === 'CREATE' ? theme.primary : theme.border,
              }}
            >
              <Text style={{ color: activeTab === 'CREATE' ? '#fff' : theme.textSecondary, fontWeight: '700', fontSize: Typography.fontSize.sm }}>
                ➕ Hızlı Yeni Parça
              </Text>
            </TouchableOpacity>
          </View>

          {activeTab === 'LIST' ? (
            /* ─── TAB 1: MEVCUT PARÇALARDAN ÇOKLU SEÇ ─── */
            <View style={{ flex: 1 }}>
              <ScrollView contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 110 }} keyboardShouldPersistTaps="handled">
                {/* 🛒 SEÇİLEN PARÇALAR SEPETİ */}
                {selectedItems.length > 0 && (
                  <View
                    style={{
                      backgroundColor: theme.primary + '10',
                      borderWidth: 1.5,
                      borderColor: theme.primary + '40',
                      borderRadius: BorderRadius.lg,
                      padding: Spacing.md,
                      marginBottom: Spacing.lg,
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <ShoppingBag size={18} color={theme.primary} />
                        <Text style={{ fontSize: Typography.fontSize.sm, fontWeight: '700', color: theme.primary }}>
                          Seçilen Parçalar ({selectedItems.length} Çeşit, {totalQuantity} Adet)
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => setSelectedItems([])}>
                        <Text style={{ fontSize: Typography.fontSize.xs, color: theme.danger, fontWeight: '600' }}>Tümünü Kaldır</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Seçilen Parça Kartları */}
                    {selectedItems.map((item) => {
                      const itemAvailable = item.part.quantity - (item.part.reservedQuantity || 0);
                      const unitPriceNum = item.unitPrice
                        ? parseFloat(item.unitPrice.replace(',', '.'))
                        : (item.part.sellingPrice ? parseFloat(item.part.sellingPrice) : 0);
                      const subtotal = (isNaN(unitPriceNum) ? 0 : unitPriceNum) * item.quantity;

                      return (
                        <View
                          key={item.part.id}
                          style={{
                            backgroundColor: theme.surface,
                            borderRadius: BorderRadius.md,
                            padding: Spacing.sm,
                            borderWidth: 1,
                            borderColor: theme.border,
                            marginBottom: Spacing.xs,
                          }}
                        >
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <View style={{ flex: 1, marginRight: Spacing.xs }}>
                              <Text style={{ fontSize: Typography.fontSize.sm, fontWeight: '700', color: theme.textPrimary }} numberOfLines={1}>
                                {item.part.name}
                              </Text>
                              <Text style={{ fontSize: Typography.fontSize.xs, color: theme.textMuted }}>
                                {item.part.brand || 'Standart'} • Depo: {itemAvailable} {item.part.unit}
                              </Text>
                            </View>
                            <TouchableOpacity
                              onPress={() => handleRemove(item.part.id)}
                              style={{ padding: 4 }}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              <Trash2 size={16} color={theme.danger} />
                            </TouchableOpacity>
                          </View>

                          {/* Miktar Stepper + Fiyat Düzenleme */}
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.xs }}>
                            {/* Stepper */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.background, borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: theme.border }}>
                              <TouchableOpacity
                                onPress={() => handleDecrement(item.part.id)}
                                style={{ paddingHorizontal: 10, paddingVertical: 6 }}
                              >
                                <Minus size={14} color={theme.textPrimary} />
                              </TouchableOpacity>
                              <TextInput
                                style={{
                                  minWidth: 32,
                                  textAlign: 'center',
                                  color: theme.textPrimary,
                                  fontWeight: '700',
                                  fontSize: Typography.fontSize.sm,
                                  paddingVertical: 2,
                                }}
                                keyboardType="numeric"
                                value={String(item.quantity)}
                                onChangeText={(val) => handleQuantityChange(item.part.id, val)}
                              />
                              <TouchableOpacity
                                onPress={() => handleAddOrIncrement(item.part)}
                                style={{ paddingHorizontal: 10, paddingVertical: 6 }}
                              >
                                <Plus size={14} color={theme.primary} />
                              </TouchableOpacity>
                            </View>

                            {/* Birim Satış Fiyatı */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <Text style={{ fontSize: Typography.fontSize.xs, color: theme.textMuted }}>Birim ₺:</Text>
                              <TextInput
                                style={{
                                  backgroundColor: theme.background,
                                  borderWidth: 1,
                                  borderColor: theme.border,
                                  borderRadius: BorderRadius.sm,
                                  paddingHorizontal: 8,
                                  paddingVertical: 4,
                                  fontSize: Typography.fontSize.xs,
                                  color: theme.textPrimary,
                                  fontWeight: '600',
                                  minWidth: 64,
                                  textAlign: 'right',
                                }}
                                keyboardType="decimal-pad"
                                placeholder="0.00"
                                placeholderTextColor={theme.textMuted}
                                value={item.unitPrice}
                                onChangeText={(val) => handlePriceChange(item.part.id, val)}
                              />
                            </View>

                            {/* Ara Toplam */}
                            <Text style={{ fontSize: Typography.fontSize.sm, fontWeight: '700', color: theme.success }}>
                              ₺{subtotal.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* 🔍 ARAMA KUTUSU */}
                <View style={{ position: 'relative', marginBottom: Spacing.sm }}>
                  <TextInput
                    style={{
                      backgroundColor: theme.surface,
                      borderWidth: 1,
                      borderColor: theme.border,
                      borderRadius: BorderRadius.md,
                      paddingHorizontal: Spacing.md,
                      paddingLeft: 38,
                      paddingRight: partSearch ? 38 : Spacing.md,
                      paddingVertical: Spacing.md,
                      color: theme.textPrimary,
                      fontSize: Typography.fontSize.sm,
                    }}
                    placeholder="🔍 Parça adı, marka veya OEM kodu ile ara..."
                    placeholderTextColor={theme.textMuted}
                    value={partSearch}
                    onChangeText={setPartSearch}
                  />
                  <View style={{ position: 'absolute', left: 12, top: 15 }}>
                    <Search size={16} color={theme.textMuted} />
                  </View>
                  {partSearch ? (
                    <TouchableOpacity
                      onPress={() => setPartSearch('')}
                      style={{ position: 'absolute', right: 12, top: 14, padding: 4 }}
                    >
                      <X size={16} color={theme.textMuted} />
                    </TouchableOpacity>
                  ) : null}
                </View>

                {/* Hızlı Parça Ekleme Kısayol Linki */}
                <TouchableOpacity
                  onPress={() => {
                    if (partSearch.trim()) {
                      setNewPart((prev) => ({ ...prev, name: partSearch.trim() }));
                    }
                    setActiveTab('CREATE');
                  }}
                  style={{ alignSelf: 'flex-end', marginBottom: Spacing.sm }}
                >
                  <Text style={{ color: theme.primary, fontSize: Typography.fontSize.xs, fontWeight: '600' }}>
                    Parça bulunamadı mı? ➕ Yeni Parça Tanımla
                  </Text>
                </TouchableOpacity>

                {/* Parça Listesi */}
                <View style={{ marginBottom: Spacing.md }}>
                  <Text style={{ fontSize: Typography.fontSize.xs, fontWeight: '700', color: theme.textMuted, marginBottom: Spacing.xs, textTransform: 'uppercase' }}>
                    Katalog Parçaları {parts.length > 0 ? `(${parts.length})` : ''}
                  </Text>

                  {isPartsLoading ? (
                    <ActivityIndicator color={theme.primary} style={{ paddingVertical: 20 }} />
                  ) : parts.length > 0 ? (
                    parts.map((p: any) => {
                      const available = p.quantity - (p.reservedQuantity || 0);
                      const isAvailable = available > 0;
                      const selectedItem = selectedItems.find((it) => it.part.id === p.id);
                      const isSelected = !!selectedItem;

                      return (
                        <TouchableOpacity
                          key={p.id}
                          activeOpacity={0.7}
                          onPress={() => handleAddOrIncrement(p)}
                          style={{
                            backgroundColor: isSelected ? theme.primary + '12' : theme.surface,
                            borderWidth: 1.5,
                            borderColor: isSelected ? theme.primary : theme.border,
                            borderRadius: BorderRadius.md,
                            padding: Spacing.md,
                            marginBottom: 8,
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <View style={{ flex: 1, marginRight: Spacing.sm }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text style={{ color: isSelected ? theme.primary : theme.textPrimary, fontWeight: '700', fontSize: Typography.fontSize.sm }}>
                                {p.name}
                              </Text>
                              {isSelected && (
                                <View style={{ backgroundColor: theme.primary, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 }}>
                                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>
                                    {selectedItem.quantity} Adet
                                  </Text>
                                </View>
                              )}
                            </View>
                            <View style={{ flexDirection: 'row', gap: 8, marginTop: 3 }}>
                              {p.brand && <Text style={{ color: theme.textMuted, fontSize: Typography.fontSize.xs }}>{p.brand}</Text>}
                              {p.partNumber && <Text style={{ color: theme.textMuted, fontSize: Typography.fontSize.xs }}>Kod: {p.partNumber}</Text>}
                            </View>
                            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                              <Text style={{ color: isAvailable ? theme.success : theme.danger, fontSize: Typography.fontSize.xs, fontWeight: '600' }}>
                                Depo: {available} {p.unit}
                              </Text>
                              {p.sellingPrice && (
                                <Text style={{ color: theme.textSecondary, fontSize: Typography.fontSize.xs, fontWeight: '600' }}>
                                  ₺{parseFloat(p.sellingPrice).toLocaleString('tr-TR')}
                                </Text>
                              )}
                            </View>
                          </View>

                          {/* Sağ Kontrol Butonu */}
                          {isSelected ? (
                            <View
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                backgroundColor: theme.surface,
                                borderRadius: BorderRadius.sm,
                                borderWidth: 1,
                                borderColor: theme.primary,
                              }}
                            >
                              <TouchableOpacity
                                onPress={(e) => {
                                  e.stopPropagation();
                                  handleDecrement(p.id);
                                }}
                                style={{ paddingHorizontal: 8, paddingVertical: 6 }}
                              >
                                <Minus size={14} color={theme.textPrimary} />
                              </TouchableOpacity>
                              <Text style={{ fontWeight: '700', color: theme.primary, minWidth: 22, textAlign: 'center', fontSize: Typography.fontSize.xs }}>
                                {selectedItem.quantity}
                              </Text>
                              <TouchableOpacity
                                onPress={(e) => {
                                  e.stopPropagation();
                                  handleAddOrIncrement(p);
                                }}
                                style={{ paddingHorizontal: 8, paddingVertical: 6 }}
                              >
                                <Plus size={14} color={theme.primary} />
                              </TouchableOpacity>
                            </View>
                          ) : (
                            <TouchableOpacity
                              onPress={() => handleAddOrIncrement(p)}
                              style={{
                                backgroundColor: theme.primary + '18',
                                paddingHorizontal: 12,
                                paddingVertical: 8,
                                borderRadius: BorderRadius.sm,
                                borderWidth: 1,
                                borderColor: theme.primary + '40',
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              <Plus size={14} color={theme.primary} />
                              <Text style={{ color: theme.primary, fontWeight: '700', fontSize: Typography.fontSize.xs }}>Ekle</Text>
                            </TouchableOpacity>
                          )}
                        </TouchableOpacity>
                      );
                    })
                  ) : (
                    <View style={{ paddingVertical: Spacing.xl, alignItems: 'center' }}>
                      <Text style={{ color: theme.textMuted, marginBottom: Spacing.sm, textAlign: 'center' }}>
                        {partSearch.trim() ? `"${partSearch}" ile eşleşen parça bulunamadı.` : 'Kayıtlı parça bulunamadı.'}
                      </Text>
                      <TouchableOpacity
                        onPress={() => {
                          if (partSearch.trim()) {
                            setNewPart((prev) => ({ ...prev, name: partSearch.trim() }));
                          }
                          setActiveTab('CREATE');
                        }}
                        style={{
                          backgroundColor: theme.primary + '15',
                          paddingHorizontal: Spacing.md,
                          paddingVertical: 10,
                          borderRadius: BorderRadius.md,
                          borderWidth: 1,
                          borderColor: theme.primary + '40',
                        }}
                      >
                        <Text style={{ color: theme.primary, fontWeight: '700', fontSize: Typography.fontSize.sm }}>
                          ➕ {partSearch.trim() ? `"${partSearch}" Olarak Hızlıca Tanımla` : 'Yeni Parça Oluştur'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </ScrollView>

              {/* STICKY ALT ÇUBUK: TOPLU KAYDET */}
              <View
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  backgroundColor: theme.surface,
                  borderTopWidth: 1,
                  borderTopColor: theme.border,
                  padding: Spacing.md,
                  ...Shadows.lg,
                }}
              >
                {selectedItems.length > 0 ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md }}>
                    <View>
                      <Text style={{ fontSize: Typography.fontSize.xs, color: theme.textMuted }}>
                        {selectedItems.length} çeşit, {totalQuantity} adet
                      </Text>
                      <Text style={{ fontSize: Typography.fontSize.base, fontWeight: '700', color: theme.textPrimary }}>
                        Toplam: ₺{totalEstimatedPrice.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={{
                        flex: 1,
                        backgroundColor: theme.primary,
                        borderRadius: BorderRadius.md,
                        paddingVertical: 12,
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: isPending ? 0.7 : 1,
                      }}
                      onPress={() => addBatchMutation.mutate()}
                      disabled={isPending}
                    >
                      {addBatchMutation.isPending ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: Typography.fontSize.sm }}>
                          🚀 {selectedItems.length} Parçayı İş Emrine Ekle
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={{ alignItems: 'center', paddingVertical: 4 }}>
                    <Text style={{ color: theme.textMuted, fontSize: Typography.fontSize.xs }}>
                      Listeden parçaların yanındaki "+ Ekle" butonuna dokunarak sepete ekleyin.
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ) : (
            /* ─── TAB 2: HIZLI YENİ PARÇA OLUŞTUR VE EKLE ─── */
            <ScrollView contentContainerStyle={{ padding: Spacing.lg }} keyboardShouldPersistTaps="handled">
              <View style={{ backgroundColor: theme.surface, borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1, borderColor: theme.border, marginBottom: Spacing.md }}>
                <Text style={{ color: theme.textPrimary, fontWeight: '700', fontSize: Typography.fontSize.base, marginBottom: 2 }}>
                  ✨ Hızlı Parça Tanımlama
                </Text>
                <Text style={{ color: theme.textMuted, fontSize: Typography.fontSize.xs }}>
                  Kuryeden veya sanayi toptancısından gelen parçayı anında sisteme kaydedip iş emrine ekleyin.
                </Text>
              </View>

              {/* Parça Adı */}
              <Text style={{ color: theme.textMuted, fontSize: Typography.fontSize.xs, marginBottom: 4 }}>Parça Adı *</Text>
              <TextInput
                style={{ backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: BorderRadius.md, padding: Spacing.md, color: theme.textPrimary, marginBottom: Spacing.sm }}
                placeholder="Örn: Silindir Kapak Conta Takımı"
                placeholderTextColor={theme.textMuted}
                value={newPart.name}
                onChangeText={(val) => setNewPart((p) => ({ ...p, name: val }))}
                autoFocus
              />

              {/* Marka ve OEM Kodu */}
              <View style={{ flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.textMuted, fontSize: Typography.fontSize.xs, marginBottom: 4 }}>Marka</Text>
                  <TextInput
                    style={{ backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: BorderRadius.md, padding: Spacing.md, color: theme.textPrimary }}
                    placeholder="Örn: Victor Reinz"
                    placeholderTextColor={theme.textMuted}
                    value={newPart.brand}
                    onChangeText={(val) => setNewPart((p) => ({ ...p, brand: val }))}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.textMuted, fontSize: Typography.fontSize.xs, marginBottom: 4 }}>Parça / OEM Kodu</Text>
                  <TextInput
                    style={{ backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: BorderRadius.md, padding: Spacing.md, color: theme.textPrimary }}
                    placeholder="Örn: 04L 103 383"
                    placeholderTextColor={theme.textMuted}
                    value={newPart.partNumber}
                    onChangeText={(val) => setNewPart((p) => ({ ...p, partNumber: val }))}
                  />
                </View>
              </View>

              {/* Birim Seçimi */}
              <Text style={{ color: theme.textMuted, fontSize: Typography.fontSize.xs, marginBottom: 4 }}>Birim</Text>
              <View style={{ flexDirection: 'row', gap: Spacing.xs, marginBottom: Spacing.sm }}>
                {['adet', 'takım', 'set', 'litre'].map((u) => (
                  <TouchableOpacity
                    key={u}
                    onPress={() => setNewPart((p) => ({ ...p, unit: u }))}
                    style={{
                      paddingHorizontal: Spacing.md,
                      paddingVertical: 6,
                      borderRadius: BorderRadius.sm,
                      borderWidth: 1,
                      borderColor: newPart.unit === u ? theme.primary : theme.border,
                      backgroundColor: newPart.unit === u ? theme.primary + '15' : theme.surface,
                    }}
                  >
                    <Text style={{ color: newPart.unit === u ? theme.primary : theme.textSecondary, fontSize: Typography.fontSize.xs, fontWeight: '600' }}>
                      {u}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Miktar, Alış ve Satış Fiyatı */}
              <View style={{ flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.textMuted, fontSize: Typography.fontSize.xs, marginBottom: 4 }}>Miktar *</Text>
                  <TextInput
                    style={{ backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: BorderRadius.md, padding: Spacing.md, color: theme.textPrimary }}
                    keyboardType="numeric"
                    placeholder="1"
                    placeholderTextColor={theme.textMuted}
                    value={newPart.quantity}
                    onChangeText={(val) => setNewPart((p) => ({ ...p, quantity: val }))}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.textMuted, fontSize: Typography.fontSize.xs, marginBottom: 4 }}>Alış Fiyatı (₺)</Text>
                  <TextInput
                    style={{ backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: BorderRadius.md, padding: Spacing.md, color: theme.textPrimary }}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={theme.textMuted}
                    value={newPart.purchasePrice}
                    onChangeText={(val) => setNewPart((p) => ({ ...p, purchasePrice: val }))}
                  />
                </View>
                <View style={{ flex: 1.2 }}>
                  <Text style={{ color: theme.textMuted, fontSize: Typography.fontSize.xs, marginBottom: 4 }}>Satış Fiyatı (₺) *</Text>
                  <TextInput
                    style={{ backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: BorderRadius.md, padding: Spacing.md, color: theme.textPrimary }}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={theme.textMuted}
                    value={newPart.sellingPrice}
                    onChangeText={(val) => setNewPart((p) => ({ ...p, sellingPrice: val }))}
                  />
                </View>
              </View>

              {/* Aksiyon Butonları */}
              <View style={{ gap: Spacing.sm }}>
                <TouchableOpacity
                  style={{
                    backgroundColor: '#10B981',
                    borderRadius: BorderRadius.md,
                    padding: Spacing.md,
                    alignItems: 'center',
                    opacity: isPending ? 0.7 : 1,
                  }}
                  onPress={() => handleQuickCreate(false)}
                  disabled={isPending}
                >
                  {quickCreateMutation.isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: Typography.fontSize.base }}>
                      ✨ Parçayı Oluştur ve Doğrudan İş Emrine Ekle
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    backgroundColor: theme.primary + '18',
                    borderRadius: BorderRadius.md,
                    padding: Spacing.md,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: theme.primary + '50',
                    opacity: isPending ? 0.7 : 1,
                  }}
                  onPress={() => handleQuickCreate(true)}
                  disabled={isPending}
                >
                  <Text style={{ color: theme.primary, fontWeight: '700', fontSize: Typography.fontSize.sm }}>
                    ➕ Parçayı Oluştur ve Çoklu Seçime (Sepete) Ekle
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Ödeme & Tahsilat Güncelle Modal ──────────────────────────────────────────
// ─── Ödeme & Tahsilat Girişi ve Düzeltme Modalı ──────────────────────────────
function PaymentUpdateModal({ visible, order, onClose, theme }: any) {
  const queryClient = useQueryClient();
  const total = parseFloat(order?.totalAmount || 0);
  const paid = parseFloat(order?.paidAmount || 0);
  const remaining = Math.max(0, total - paid);

  // Active Tab: 'collect' (Yeni Tahsilat Al) or 'edit' (Kaydı Düzelt / Sıfırla)
  const [activeTab, setActiveTab] = useState<'collect' | 'edit'>('collect');

  // Tab 1 (Tahsilat Al) state
  const [collectAmount, setCollectAmount] = useState(String(remaining > 0 ? remaining : ''));
  const [collectMethod, setCollectMethod] = useState(order?.paymentMethod || 'NAKIT');
  const [collectNotes, setCollectNotes] = useState('');
  const [postPaymentType, setPostPaymentType] = useState<'BAHSIS' | 'EK_TAHSILAT'>('BAHSIS');

  // Tab 2 (Kaydı Düzelt) state
  const [editPaidAmount, setEditPaidAmount] = useState(String(order?.paidAmount || 0));
  const [editStatus, setEditStatus] = useState(order?.paymentStatus || 'BEKLIYOR');
  const [editMethod, setEditMethod] = useState(order?.paymentMethod || 'NAKIT');
  const [editNotes, setEditNotes] = useState(order?.paymentNotes || '');

  const existingTip = parseFloat(order?.tipAmount || 0) || (() => {
    if (order?.paymentNotes) {
      const match = order.paymentNotes.match(/\[₺([0-9.,]+)\s*Bahşiş\/İkramiye\]/i);
      if (match && match[1]) {
        const p = parseFloat(match[1].replace(/\./g, '').replace(',', '.'));
        if (!isNaN(p)) return p;
      }
    }
    return 0;
  })();

  React.useEffect(() => {
    if (order) {
      const curTotal = parseFloat(order.totalAmount || 0);
      const curPaid = parseFloat(order.paidAmount || 0);
      const curRemaining = Math.max(0, curTotal - curPaid);

      setCollectAmount(curRemaining > 0 ? String(curRemaining) : '');
      setCollectMethod(order.paymentMethod || 'NAKIT');
      setCollectNotes('');
      setPostPaymentType('BAHSIS');

      setEditPaidAmount(String(curPaid));
      setEditStatus(order.paymentStatus || 'BEKLIYOR');
      setEditMethod(order.paymentMethod || 'NAKIT');
      setEditNotes(order.paymentNotes || '');

      setActiveTab('collect');
    }
  }, [order, visible]);

  const mutation = useMutation({
    mutationFn: (data: any) => workOrderAPI.updatePayment(order.id, data),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['work-order', order.id] });
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['receivables'] });
      queryClient.invalidateQueries({ queryKey: ['cashDaily'] });
      onClose();
      const msg = res?.data?.message || 'Ödeme ve kasa kaydı güncellendi! ✅';
      Alert.alert('Başarılı', msg);
    },
    onError: (err: any) => Alert.alert('Hata', err?.response?.data?.error || err?.message || 'Ödeme güncellenemedi.'),
  });

  // Handle Tab 1: Yeni Tahsilat Al
  const handleCollect = () => {
    if (order?.status === 'IPTAL') {
      Alert.alert('İptal Edilmiş İş Emri', 'İptal edilmiş bir iş emrine ödeme veya tahsilat alınamaz.');
      return;
    }

    const cleanStr = collectAmount.replace(',', '.').trim();
    const numAmount = parseFloat(cleanStr);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Geçersiz Tutar', 'Lütfen tahsil edilecek tutarı 0\'dan büyük olarak giriniz.');
      return;
    }

    const isTipMode = remaining <= 0 && total > 0 && postPaymentType === 'BAHSIS';

    const executeCollect = () => {
      mutation.mutate({
        amountCollected: numAmount,
        paymentMethod: collectMethod,
        paymentNotes: collectNotes.trim() || undefined,
        isTip: isTipMode,
      });
    };

    if (total > 0 && remaining > 0 && numAmount > remaining) {
      const tip = Math.round((numAmount - remaining) * 100) / 100;
      Alert.alert(
        'Bahşiş / İkramiye Onayı 🎁',
        `Kalan borç ₺${remaining.toLocaleString('tr-TR')} tutarındadır.\n\nFazla olan ₺${tip.toLocaleString('tr-TR')} tutar kasaya 'Bahşiş / Usta İkramiyesi' olarak kaydedilecek ve iş emri borcu tamamen kapatılacaktır.\n\nOnaylıyor musunuz?`,
        [
          { text: 'Vazgeç', style: 'cancel' },
          {
            text: `Kalan Tutara Eşitle (₺${remaining.toLocaleString('tr-TR')})`,
            onPress: () => setCollectAmount(String(remaining)),
          },
          {
            text: 'Evet, Bahşiş Olarak Kaydet',
            onPress: executeCollect,
          },
        ]
      );
    } else {
      executeCollect();
    }
  };

  // Handle Tab 2: Kaydı Düzelt
  const handleEditRecord = () => {
    if (order?.status === 'IPTAL') {
      Alert.alert('İptal Edilmiş İş Emri', 'İptal edilmiş bir iş emrinde ödeme düzenlemesi yapılamaz.');
      return;
    }

    const cleanStr = editPaidAmount.replace(',', '.').trim();
    const numPaid = parseFloat(cleanStr);
    if (isNaN(numPaid) || numPaid < 0) {
      Alert.alert('Geçersiz Tutar', 'Lütfen geçerli bir toplam ödeme tutarı giriniz.');
      return;
    }
    if (total > 0 && numPaid > total) {
      Alert.alert(
        'Tutar Aşıldı',
        `Toplam tahsilat tutarı iş emri toplam bedelini (₺${total.toLocaleString('tr-TR')}) aşamaz. Lütfen en fazla ₺${total.toLocaleString('tr-TR')} giriniz veya fazla ödeme için 'Yeni Tahsilat Al' sekmesindeki Bahşiş özelliğini kullanınız.`,
        [
          { text: 'Tamam' },
          { text: 'Maksimuma Eşitle', onPress: () => setEditPaidAmount(String(total)) },
        ]
      );
      return;
    }

    mutation.mutate({
      paidAmount: numPaid,
      paymentStatus: editStatus,
      paymentMethod: editMethod,
      paymentNotes: editNotes.trim() || undefined,
    });
  };

  const cleanCollectStr = collectAmount.replace(',', '.').trim();
  const parsedCollect = parseFloat(cleanCollectStr) || 0;
  const woPortion = total > 0 ? Math.min(parsedCollect, remaining) : parsedCollect;
  const excessTip = total > 0 && remaining > 0 ? Math.max(0, parsedCollect - remaining) : 0;
  const projectedPaid = total > 0 ? Math.min(total, paid + parsedCollect) : (paid + parsedCollect);
  const projectedRemaining = total > 0 ? Math.max(0, remaining - parsedCollect) : 0;

  const cleanEditPaidStr = editPaidAmount.replace(',', '.').trim();
  const parsedEditPaid = parseFloat(cleanEditPaidStr) || 0;
  const projectedEditRemaining = total > 0 ? Math.max(0, total - parsedEditPaid) : 0;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: theme.background, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, maxHeight: '92%' }}>
          
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: theme.border }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: Typography.fontSize.lg, fontWeight: '800', color: theme.textPrimary }}>
                💳 Ödeme & Tahsilat Yönetimi
              </Text>
              <Text style={{ fontSize: Typography.fontSize.xs, color: theme.textMuted, marginTop: 2 }}>
                {order?.customerName} — {order?.vehicleInfo}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <Text style={{ fontSize: 20, color: theme.textMuted }}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Mode Switcher Tabs */}
          <View style={{ flexDirection: 'row', paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, gap: Spacing.sm }}>
            <TouchableOpacity
              style={{
                flex: 1,
                paddingVertical: Spacing.sm,
                alignItems: 'center',
                borderBottomWidth: 3,
                borderBottomColor: activeTab === 'collect' ? theme.primary : 'transparent',
              }}
              onPress={() => setActiveTab('collect')}
            >
              <Text style={{ fontSize: Typography.fontSize.sm, fontWeight: activeTab === 'collect' ? '800' : '600', color: activeTab === 'collect' ? theme.primary : theme.textMuted }}>
                💰 Yeni Tahsilat Al
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flex: 1,
                paddingVertical: Spacing.sm,
                alignItems: 'center',
                borderBottomWidth: 3,
                borderBottomColor: activeTab === 'edit' ? '#F59E0B' : 'transparent',
              }}
              onPress={() => setActiveTab('edit')}
            >
              <Text style={{ fontSize: Typography.fontSize.sm, fontWeight: activeTab === 'edit' ? '800' : '600', color: activeTab === 'edit' ? '#F59E0B' : theme.textMuted }}>
                ✏️ Kaydı Düzelt / Sıfırla
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: Spacing.lg }}>
            {/* Top Balance Summary Section with Clear Distinct Titles */}
            <View style={{ marginBottom: Spacing.md }}>
              <Text style={{ fontSize: Typography.fontSize.xs, fontWeight: '800', color: theme.textMuted, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 8, paddingHorizontal: 2 }}>
                📊 İş Emri Bakiye & Hesap Detayları
              </Text>

              <View style={{ flexDirection: 'row', gap: Spacing.xs }}>
                {/* 1. İş Emri Tutarı (Toplam Bedel) */}
                <View
                  style={{
                    flex: 1,
                    backgroundColor: theme.surface,
                    borderRadius: BorderRadius.md,
                    padding: Spacing.sm + 2,
                    borderWidth: 1,
                    borderColor: theme.border,
                    borderTopWidth: 3,
                    borderTopColor: theme.primary,
                  }}
                >
                  <Text style={{ fontSize: 9, fontWeight: '800', color: theme.textMuted, textTransform: 'uppercase' }}>
                    1. İŞ EMRİ TUTARI
                  </Text>
                  <Text style={{ fontSize: Typography.fontSize.sm, fontWeight: '900', color: theme.textPrimary, marginTop: 4 }}>
                    ₺{total.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                  <Text style={{ fontSize: 9, color: theme.textMuted, marginTop: 2 }}>
                    Parça + İşçilik
                  </Text>
                </View>

                {/* 2. Şu Ana Kadar Alınan (Ödenen) */}
                <View
                  style={{
                    flex: 1,
                    backgroundColor: theme.surface,
                    borderRadius: BorderRadius.md,
                    padding: Spacing.sm + 2,
                    borderWidth: 1,
                    borderColor: theme.border,
                    borderTopWidth: 3,
                    borderTopColor: theme.success,
                  }}
                >
                  <Text style={{ fontSize: 9, fontWeight: '800', color: theme.success, textTransform: 'uppercase' }}>
                    2. ALINAN (ÖDENEN)
                  </Text>
                  <Text style={{ fontSize: Typography.fontSize.sm, fontWeight: '900', color: theme.success, marginTop: 4 }}>
                    ₺{paid.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                  <Text style={{ fontSize: 9, color: theme.textMuted, marginTop: 2 }}>
                    Kasaya Giren
                  </Text>
                </View>

                {/* 3. Kalan Müşteri Borcu (Açık Hesap) */}
                <View
                  style={{
                    flex: 1,
                    backgroundColor: theme.surface,
                    borderRadius: BorderRadius.md,
                    padding: Spacing.sm + 2,
                    borderWidth: 1,
                    borderColor: theme.border,
                    borderTopWidth: 3,
                    borderTopColor: remaining > 0 ? theme.danger : theme.success,
                  }}
                >
                  <Text style={{ fontSize: 9, fontWeight: '800', color: remaining > 0 ? theme.danger : theme.success, textTransform: 'uppercase' }}>
                    3. KALAN BORÇ
                  </Text>
                  <Text style={{ fontSize: Typography.fontSize.sm, fontWeight: '900', color: remaining > 0 ? theme.danger : theme.success, marginTop: 4 }}>
                    ₺{remaining.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                  <Text style={{ fontSize: 9, color: remaining > 0 ? theme.danger : theme.success, marginTop: 2 }}>
                    {remaining > 0 ? 'Açık Bakiye' : 'Borç Yok ✅'}
                  </Text>
                </View>
              </View>

              {/* Kayıtlı Bahşiş Vurgulama Rozeti */}
              {existingTip > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#10B98115', borderWidth: 1, borderColor: '#10B981', borderRadius: BorderRadius.md, paddingHorizontal: Spacing.sm + 2, paddingVertical: 6, marginTop: 8, gap: 6 }}>
                  <Text style={{ fontSize: 16 }}>🎁</Text>
                  <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#047857' }}>
                      Kayıtlı Bahşiş / İkramiye:
                    </Text>
                    <Text style={{ fontSize: Typography.fontSize.xs, fontWeight: '900', color: '#059669' }}>
                      +₺{existingTip.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* TAB 1: YENİ TAHSİLAT AL */}
            {activeTab === 'collect' && (
              <View>
                {/* Bilgilendirme Notu: Borç yokken veya tutar girilmemişken */}
                {remaining <= 0 && (
                  <View
                    style={{
                      backgroundColor: total === 0 ? theme.primary + '15' : theme.success + '15',
                      borderWidth: 1,
                      borderColor: total === 0 ? theme.primary : theme.success,
                      borderRadius: BorderRadius.md,
                      padding: Spacing.sm + 4,
                      marginBottom: Spacing.md,
                      gap: Spacing.xs,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                      <Text style={{ fontSize: 20 }}>{total === 0 ? '💡' : '🎉'}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: Typography.fontSize.xs, fontWeight: '800', color: total === 0 ? theme.primary : theme.success }}>
                          {total === 0 ? 'Ön Ödeme / Kapora Tahsilatı' : 'Müşterinin Açık Borcu Bulunmuyor'}
                        </Text>
                        <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2, lineHeight: 15 }}>
                          {total === 0
                            ? 'İş emrine henüz parça/işçilik girilmediği için tahsil edilen tutar kasaya kapora olarak işlenecektir.'
                            : 'İş emri bedeli eksiksiz tahsil edilmiştir. Müşteri personeller / ustalar için bahşiş bıraktıysa veya ilave tahsilat alındıysa aşağıdan türünü seçebilirsiniz.'}
                        </Text>
                      </View>
                    </View>

                    {total > 0 && (
                      <View style={{ flexDirection: 'row', gap: Spacing.xs, marginTop: 4 }}>
                        <TouchableOpacity
                          style={{
                            flex: 1,
                            backgroundColor: postPaymentType === 'BAHSIS' ? '#059669' : theme.surface,
                            borderRadius: BorderRadius.md,
                            paddingVertical: 7,
                            alignItems: 'center',
                            borderWidth: 1.5,
                            borderColor: postPaymentType === 'BAHSIS' ? '#059669' : theme.border,
                          }}
                          onPress={() => setPostPaymentType('BAHSIS')}
                        >
                          <Text style={{ fontSize: Typography.fontSize.xs, fontWeight: '800', color: postPaymentType === 'BAHSIS' ? '#fff' : theme.textPrimary }}>
                            🎁 Usta Bahşişi Al
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={{
                            flex: 1,
                            backgroundColor: postPaymentType === 'EK_TAHSILAT' ? theme.primary : theme.surface,
                            borderRadius: BorderRadius.md,
                            paddingVertical: 7,
                            alignItems: 'center',
                            borderWidth: 1.5,
                            borderColor: postPaymentType === 'EK_TAHSILAT' ? theme.primary : theme.border,
                          }}
                          onPress={() => setPostPaymentType('EK_TAHSILAT')}
                        >
                          <Text style={{ fontSize: Typography.fontSize.xs, fontWeight: '800', color: postPaymentType === 'EK_TAHSILAT' ? '#fff' : theme.textPrimary }}>
                            💰 İlave Tahsilat Al
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}

                {/* Tahsilat Input */}
                <Text style={{ fontSize: Typography.fontSize.xs, fontWeight: '700', color: theme.textPrimary, marginBottom: 6 }}>
                  {total === 0 || remaining <= 0
                    ? (postPaymentType === 'BAHSIS' && total > 0 ? 'Alınacak Usta Bahşişi Tutarı (₺) *' : 'Alınacak Tahsilat / Kapora Tutarı (₺) *')
                    : 'Şimdi Alınan Tahsilat Tutarı (₺) *'}
                </Text>
                <TextInput
                  style={{
                    backgroundColor: theme.surface,
                    borderRadius: BorderRadius.md,
                    borderWidth: 2,
                    borderColor: theme.success,
                    padding: Spacing.md,
                    fontSize: Typography.fontSize.xl,
                    fontWeight: '800',
                    color: theme.textPrimary,
                    textAlign: 'center',
                  }}
                  keyboardType="decimal-pad"
                  value={collectAmount}
                  onChangeText={(val) => {
                    const filtered = val.replace(/[^0-9.,]/g, '');
                    setCollectAmount(filtered);
                  }}
                  placeholder="0.00"
                  placeholderTextColor={theme.textMuted}
                />

                {/* Quick shortcuts */}
                {remaining > 0 ? (
                  <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: 6, marginBottom: Spacing.md }}>
                    <TouchableOpacity
                      style={{ flex: 1, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: BorderRadius.sm, paddingVertical: 8, alignItems: 'center' }}
                      onPress={() => setCollectAmount(String(remaining))}
                    >
                      <Text style={{ fontSize: Typography.fontSize.xs, fontWeight: '700', color: theme.success }}>
                        Borcun Tamamı (₺{remaining.toLocaleString('tr-TR')})
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{ flex: 1, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: BorderRadius.sm, paddingVertical: 8, alignItems: 'center' }}
                      onPress={() => setCollectAmount(String(Math.round(remaining / 2)))}
                    >
                      <Text style={{ fontSize: Typography.fontSize.xs, fontWeight: '700', color: theme.primary }}>
                        Yarısı (₺{Math.round(remaining / 2).toLocaleString('tr-TR')})
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{ backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: BorderRadius.sm, paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center' }}
                      onPress={() => setCollectAmount('')}
                    >
                      <Text style={{ fontSize: Typography.fontSize.xs, fontWeight: '600', color: theme.textMuted }}>
                        Temizle
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', gap: Spacing.xs, marginTop: 6, marginBottom: Spacing.md }}>
                    {[500, 1000, 2000, 5000].map((amt) => (
                      <TouchableOpacity
                        key={amt}
                        style={{ flex: 1, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: BorderRadius.sm, paddingVertical: 8, alignItems: 'center' }}
                        onPress={() => setCollectAmount(String(amt))}
                      >
                        <Text style={{ fontSize: Typography.fontSize.xs, fontWeight: '700', color: theme.primary }}>
                          +₺{amt.toLocaleString('tr-TR')}
                        </Text>
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                      style={{ backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: BorderRadius.sm, paddingVertical: 8, paddingHorizontal: 10, alignItems: 'center' }}
                      onPress={() => setCollectAmount('')}
                    >
                      <Text style={{ fontSize: Typography.fontSize.xs, fontWeight: '600', color: theme.textMuted }}>
                        ✕
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Smart Tip Notice if parsedCollect > remaining */}
                {excessTip > 0 && remaining > 0 && (
                  <View
                    style={{
                      backgroundColor: '#10B98115',
                      borderWidth: 1,
                      borderColor: '#10B981',
                      borderRadius: BorderRadius.md,
                      padding: Spacing.sm + 2,
                      marginBottom: Spacing.md,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: Typography.fontSize.xs, fontWeight: '800', color: '#059669' }}>
                        🎁 Fazla Tutar: +₺{excessTip.toLocaleString('tr-TR')} (Bahşiş)
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
                        onPress={() => setCollectAmount(String(remaining))}
                      >
                        <Text style={{ fontSize: 10, fontWeight: '700', color: '#059669' }}>
                          Kalan Tutara Eşitle (₺{remaining.toLocaleString('tr-TR')})
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 4 }}>
                      Kalan ₺{remaining.toLocaleString('tr-TR')} borç kapatılacak, fazla girilen ₺{excessTip.toLocaleString('tr-TR')} tutar kasaya Bahşiş / Usta İkramiyesi olarak kaydedilecektir.
                    </Text>
                  </View>
                )}

                {/* Projected calculation preview box */}
                {parsedCollect > 0 && (
                  <View style={{ backgroundColor: theme.primary + '10', borderWidth: 1, borderColor: theme.primary + '30', borderRadius: BorderRadius.md, padding: Spacing.sm + 2, marginBottom: Spacing.md }}>
                    <Text style={{ fontSize: Typography.fontSize.xs, fontWeight: '700', color: theme.primary, marginBottom: 4 }}>
                      ⚡ İşlem Sonrası Durum Özeti:
                    </Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
                      <Text style={{ fontSize: Typography.fontSize.xs, color: theme.textSecondary }}>Kasaya Girecek:</Text>
                      <Text style={{ fontSize: Typography.fontSize.xs, fontWeight: '700', color: theme.success }}>+₺{parsedCollect.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                    </View>
                    {excessTip > 0 && (
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
                        <Text style={{ fontSize: Typography.fontSize.xs, color: '#059669', fontWeight: '600' }}>├─ Usta Bahşişi / İkramiye:</Text>
                        <Text style={{ fontSize: Typography.fontSize.xs, fontWeight: '700', color: '#059669' }}>+₺{excessTip.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                      </View>
                    )}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
                      <Text style={{ fontSize: Typography.fontSize.xs, color: theme.textSecondary }}>{excessTip > 0 ? '└─ İş Emri Tahsilatı:' : (total === 0 ? 'Toplam Ön Ödeme / Kapora:' : 'Yeni Toplam Tahsilat:')}</Text>
                      <Text style={{ fontSize: Typography.fontSize.xs, fontWeight: '700', color: theme.textPrimary }}>₺{projectedPaid.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                    </View>
                    {total > 0 && (
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
                        <Text style={{ fontSize: Typography.fontSize.xs, color: theme.textSecondary }}>Kalan Son Borç:</Text>
                        <Text style={{ fontSize: Typography.fontSize.xs, fontWeight: '800', color: projectedRemaining === 0 ? theme.success : theme.danger }}>
                          ₺{projectedRemaining.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {projectedRemaining === 0 ? '(Borç Kapanıyor ✅)' : '(Kısmi Bakiye 🟡)'}
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Payment Method */}
                <Text style={{ fontSize: Typography.fontSize.xs, fontWeight: '700', color: theme.textPrimary, marginBottom: 6 }}>Ödeme Şekli</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginBottom: Spacing.md }}>
                  {[
                    { id: 'NAKIT', label: '💵 Nakit' },
                    { id: 'KREDI_KARTI', label: '💳 Kredi Kartı' },
                    { id: 'HAVALE', label: '🏦 Havale/EFT' },
                  ].map((m) => (
                    <TouchableOpacity
                      key={m.id}
                      style={{
                        flex: 1,
                        backgroundColor: collectMethod === m.id ? theme.primary + '15' : theme.surface,
                        borderWidth: 1,
                        borderColor: collectMethod === m.id ? theme.primary : theme.border,
                        borderRadius: BorderRadius.md,
                        paddingVertical: Spacing.sm,
                        alignItems: 'center',
                      }}
                      onPress={() => setCollectMethod(m.id)}
                    >
                      <Text style={{ fontSize: Typography.fontSize.xs, fontWeight: collectMethod === m.id ? '800' : '600', color: collectMethod === m.id ? theme.primary : theme.textSecondary }}>
                        {m.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Payment Notes */}
                <Text style={{ fontSize: Typography.fontSize.xs, fontWeight: '700', color: theme.textPrimary, marginBottom: 6 }}>Tahsilat Notu</Text>
                <CannedNotesPicker currentNote={collectNotes} onSelectNote={setCollectNotes} theme={theme} />
                <TextInput
                  style={{ backgroundColor: theme.surface, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: theme.border, padding: Spacing.md, color: theme.textPrimary, fontSize: Typography.fontSize.sm, minHeight: 50, textAlignVertical: 'top', marginBottom: Spacing.lg }}
                  placeholder="Örn: Elden teslim alındı..."
                  placeholderTextColor={theme.textMuted}
                  value={collectNotes}
                  onChangeText={setCollectNotes}
                />

                {/* Collect Button */}
                <TouchableOpacity
                  style={{
                    backgroundColor: (remaining <= 0 && total > 0 && postPaymentType === 'BAHSIS') ? '#059669' : theme.success,
                    borderRadius: BorderRadius.md,
                    paddingVertical: Spacing.md,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: Spacing.xs,
                    ...Shadows.sm,
                    opacity: mutation.isPending || parsedCollect <= 0 ? 0.6 : 1,
                  }}
                  onPress={handleCollect}
                  disabled={mutation.isPending || parsedCollect <= 0}
                >
                  {mutation.isPending ? <ActivityIndicator color="#fff" /> : (
                    <>
                      <Check size={18} color="#fff" />
                      <Text style={{ color: '#fff', fontSize: Typography.fontSize.base, fontWeight: '800' }}>
                        {parsedCollect > 0
                          ? (remaining <= 0 && total > 0 && postPaymentType === 'BAHSIS'
                              ? `₺${parsedCollect.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bahşiş Olarak Kasaya Kaydet 🎁`
                              : `₺${parsedCollect.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Tahsil Et ve Kasaya Kaydet ✅`)
                          : 'Tahsilat Tutarı Giriniz'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* TAB 2: KAYDI DÜZELT / SIFIRLA */}
            {activeTab === 'edit' && (
              <View>
                <View style={{ backgroundColor: '#F59E0B15', borderWidth: 1, borderColor: '#F59E0B50', borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.md }}>
                  <Text style={{ fontSize: Typography.fontSize.xs, fontWeight: '800', color: '#D97706', marginBottom: 2 }}>
                    ⚠️ Manuel Kayıt Düzeltme Modu
                  </Text>
                  <Text style={{ fontSize: Typography.fontSize.xs, color: theme.textSecondary, lineHeight: 16 }}>
                    Bu alan geçmişte sisteme yanlış girilmiş toplam ödeme kaydını doğrudan düzeltmek içindir. Burada girilen tutar doğrudan "toplam ödenen" olarak kaydedilir.
                  </Text>
                </View>

                {/* Direct Paid Amount Input */}
                <Text style={{ fontSize: Typography.fontSize.xs, fontWeight: '700', color: theme.textPrimary, marginBottom: 6 }}>
                  Sistemde Kayıtlı Toplam Ödenen Tutar (₺) *
                </Text>
                <TextInput
                  style={{
                    backgroundColor: theme.surface,
                    borderRadius: BorderRadius.md,
                    borderWidth: 2,
                    borderColor: '#F59E0B',
                    padding: Spacing.md,
                    fontSize: Typography.fontSize.xl,
                    fontWeight: '800',
                    color: theme.textPrimary,
                    textAlign: 'center',
                  }}
                  keyboardType="decimal-pad"
                  value={editPaidAmount}
                  onChangeText={(val) => {
                    const filtered = val.replace(/[^0-9.,]/g, '');
                    setEditPaidAmount(filtered);
                    const n = parseFloat(filtered.replace(',', '.')) || 0;
                    if (total > 0 && n >= total - 0.01) setEditStatus('ODENDI');
                    else if (n > 0) setEditStatus('KISMI');
                    else setEditStatus('VERESIYE');
                  }}
                />

                {/* Edit Shortcuts */}
                <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: 6, marginBottom: Spacing.md }}>
                  <TouchableOpacity
                    style={{ flex: 1, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: BorderRadius.sm, paddingVertical: 8, alignItems: 'center' }}
                    onPress={() => {
                      setEditPaidAmount(String(total));
                      setEditStatus('ODENDI');
                    }}
                  >
                    <Text style={{ fontSize: Typography.fontSize.xs, fontWeight: '700', color: theme.success }}>
                      Tamamen Ödendi Yap (₺{total})
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ flex: 1, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: BorderRadius.sm, paddingVertical: 8, alignItems: 'center' }}
                    onPress={() => {
                      setEditPaidAmount('0');
                      setEditStatus('VERESIYE');
                      setEditMethod('VERESIYE');
                    }}
                  >
                    <Text style={{ fontSize: Typography.fontSize.xs, fontWeight: '700', color: theme.danger }}>
                      Sıfırla / Tamamı Veresiye
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Dynamic Preview for Edit */}
                <View style={{ backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: BorderRadius.md, padding: Spacing.sm + 2, marginBottom: Spacing.md, flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: Typography.fontSize.xs, color: theme.textMuted }}>Kayıt Sonrası Kalan Borç:</Text>
                  <Text style={{ fontSize: Typography.fontSize.xs, fontWeight: '800', color: projectedEditRemaining > 0 ? theme.danger : theme.success }}>
                    ₺{projectedEditRemaining.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
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
                        backgroundColor: editStatus === s.id ? s.color + '20' : theme.surface,
                        borderWidth: 1,
                        borderColor: editStatus === s.id ? s.color : theme.border,
                        borderRadius: BorderRadius.md,
                        paddingVertical: Spacing.sm,
                        alignItems: 'center',
                      }}
                      onPress={() => setEditStatus(s.id)}
                    >
                      <Text style={{ fontSize: Typography.fontSize.xs, fontWeight: editStatus === s.id ? '800' : '600', color: editStatus === s.id ? s.color : theme.textSecondary }}>
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
                        backgroundColor: editMethod === m.id ? '#F59E0B15' : theme.surface,
                        borderWidth: 1,
                        borderColor: editMethod === m.id ? '#F59E0B' : theme.border,
                        borderRadius: BorderRadius.md,
                        paddingVertical: Spacing.sm,
                        alignItems: 'center',
                      }}
                      onPress={() => setEditMethod(m.id)}
                    >
                      <Text style={{ fontSize: Typography.fontSize.xs, fontWeight: editMethod === m.id ? '800' : '600', color: editMethod === m.id ? '#D97706' : theme.textSecondary }}>
                        {m.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Payment Notes */}
                <Text style={{ fontSize: Typography.fontSize.xs, fontWeight: '700', color: theme.textPrimary, marginBottom: 6 }}>Düzeltme / Açıklama Notu</Text>
                <CannedNotesPicker currentNote={editNotes} onSelectNote={setEditNotes} theme={theme} />
                <TextInput
                  style={{ backgroundColor: theme.surface, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: theme.border, padding: Spacing.md, color: theme.textPrimary, fontSize: Typography.fontSize.sm, minHeight: 60, textAlignVertical: 'top', marginBottom: Spacing.lg }}
                  placeholder="Düzeltme sebebi veya not..."
                  placeholderTextColor={theme.textMuted}
                  value={editNotes}
                  onChangeText={setEditNotes}
                  multiline
                />

                {/* Save Edit Button */}
                <TouchableOpacity
                  style={{
                    backgroundColor: '#D97706',
                    borderRadius: BorderRadius.md,
                    paddingVertical: Spacing.md,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: Spacing.xs,
                    ...Shadows.sm,
                    opacity: mutation.isPending ? 0.7 : 1,
                  }}
                  onPress={handleEditRecord}
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? <ActivityIndicator color="#fff" /> : (
                    <>
                      <Check size={18} color="#fff" />
                      <Text style={{ color: '#fff', fontSize: Typography.fontSize.base, fontWeight: '800' }}>
                        Ödeme Kaydını Güncelle
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Fotoğraf Galerisi & Öncesi/Sonrası (Step 4) ──────────────────────────────
function PhotoSection({
  order,
  theme,
  canEdit = true,
}: {
  order: any;
  theme: any;
  canEdit?: boolean;
}) {
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
            {canEdit
              ? 'Müşteriye parçanın gerçekten değiştiğini göstermek için fotoğraf ekleyin.'
              : 'Bu iş emrine henüz fotoğraf yüklenmemiş.'}
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

              {canEdit && (
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
              )}
            </View>
          ))}
        </View>
      )}

      {/* Upload action buttons */}
      {canEdit && (
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
      )}

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

// ─── Personel Atama & Değiştirme Modalı (Yönetici / Müdür) ───────────────────
function AssignStaffModal({
  visible,
  order,
  onClose,
  theme,
  onAssign,
  isPending,
}: {
  visible: boolean;
  order: any;
  onClose: () => void;
  theme: any;
  onAssign: (userId: string) => void;
  isPending: boolean;
}) {
  const { data: usersResponse, isLoading } = useQuery({
    queryKey: ['companyUsers'],
    queryFn: () => companiesAPI.getUsers(),
    enabled: visible,
  });

  const staffList = useMemo(() => {
    const list = (usersResponse as any)?.data || [];
    return Array.isArray(list) ? list.filter((u: any) => u.isActive) : [];
  }, [usersResponse]);

  const [selectedUserId, setSelectedUserId] = useState<string | null>(order?.userId || null);
  const [search, setSearch] = useState('');

  React.useEffect(() => {
    if (visible && order?.userId) {
      setSelectedUserId(order.userId);
    }
  }, [visible, order?.userId]);

  const filteredStaff = useMemo(() => {
    if (!search.trim()) return staffList;
    const s = search.toLowerCase();
    return staffList.filter((u: any) =>
      u.fullName?.toLowerCase().includes(s) || u.role?.toLowerCase().includes(s)
    );
  }, [staffList, search]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
        <View
          style={{
            backgroundColor: theme.surface,
            borderTopLeftRadius: BorderRadius.xl,
            borderTopRightRadius: BorderRadius.xl,
            maxHeight: '85%',
            padding: Spacing.lg,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md }}>
            <View>
              <Text style={{ fontSize: Typography.fontSize.lg, fontWeight: '800', color: theme.textPrimary }}>
                👤 Personel Ata / Değiştir
              </Text>
              <Text style={{ fontSize: Typography.fontSize.xs, color: theme.textSecondary, marginTop: 2 }}>
                Bu iş emrini bir personele zimmetleyip onaylayabilirsiniz.
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <X size={22} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Arama Input */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: theme.background,
              borderRadius: BorderRadius.md,
              borderWidth: 1,
              borderColor: theme.border,
              paddingHorizontal: Spacing.sm,
              marginBottom: Spacing.md,
            }}
          >
            <Search size={16} color={theme.textMuted} />
            <TextInput
              placeholder="Personel adı veya rol ara..."
              placeholderTextColor={theme.textMuted}
              value={search}
              onChangeText={setSearch}
              style={{
                flex: 1,
                paddingVertical: 10,
                paddingHorizontal: 8,
                color: theme.textPrimary,
                fontSize: Typography.fontSize.sm,
              }}
            />
          </View>

          {isLoading ? (
            <ActivityIndicator size="large" color={theme.primary} style={{ marginVertical: 30 }} />
          ) : (
            <ScrollView style={{ maxHeight: 350 }} showsVerticalScrollIndicator={false}>
              {filteredStaff.map((staff: any) => {
                const isSelected = selectedUserId === staff.id;
                const isCurrent = order?.userId === staff.id;
                const roleLabel =
                  staff.role === 'TECHNICIAN'
                    ? 'Teknisyen'
                    : staff.role === 'MANAGER'
                    ? 'Müdür'
                    : 'Yönetici';

                return (
                  <TouchableOpacity
                    key={staff.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: Spacing.md,
                      borderRadius: BorderRadius.md,
                      borderWidth: 1.5,
                      borderColor: isSelected ? theme.primary : theme.border,
                      backgroundColor: isSelected ? theme.primary + '15' : theme.surfaceElevated || theme.surface,
                      marginBottom: Spacing.xs,
                    }}
                    onPress={() => setSelectedUserId(staff.id)}
                    activeOpacity={0.7}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                      <View
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 19,
                          backgroundColor: isSelected ? theme.primary : theme.border,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>
                          {staff.fullName?.slice(0, 1) || 'P'}
                        </Text>
                      </View>
                      <View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ fontWeight: '700', color: theme.textPrimary, fontSize: Typography.fontSize.sm }}>
                            {staff.fullName}
                          </Text>
                          {isCurrent && (
                            <View style={{ backgroundColor: theme.primary + '20', paddingHorizontal: 6, paddingVertical: 1, borderRadius: BorderRadius.full }}>
                              <Text style={{ fontSize: 10, fontWeight: '700', color: theme.primary }}>Mevcut Sorumlu</Text>
                            </View>
                          )}
                        </View>
                        <Text style={{ fontSize: Typography.fontSize.xs, color: theme.textMuted }}>
                          {roleLabel} {staff.email ? `• ${staff.email}` : ''}
                        </Text>
                      </View>
                    </View>

                    <View
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        borderWidth: 2,
                        borderColor: isSelected ? theme.primary : theme.border,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {isSelected && (
                        <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: theme.primary }} />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md }}>
            <TouchableOpacity
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: BorderRadius.md,
                borderWidth: 1,
                borderColor: theme.border,
                alignItems: 'center',
              }}
              onPress={onClose}
            >
              <Text style={{ color: theme.textSecondary, fontWeight: '600' }}>İptal</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flex: 2,
                backgroundColor: theme.primary,
                paddingVertical: 12,
                borderRadius: BorderRadius.md,
                alignItems: 'center',
                opacity: !selectedUserId || isPending ? 0.7 : 1,
              }}
              disabled={!selectedUserId || isPending}
              onPress={() => {
                if (selectedUserId) onAssign(selectedUserId);
              }}
            >
              {isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontWeight: '800' }}>✅ İşi Ata ve Onayla</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── İş Emri Detay Ana Ekranı ───────────────────────────────────────────────
export default function WorkOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { colors: theme } = useAppTheme();
  const dynamicStyles = useMemo(() => styles(theme), [theme]);
  const { user } = useAuthStore();
  const isTech = user?.role === 'TECHNICIAN';

  const [showAddPart, setShowAddPart] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showConsumablesModal, setShowConsumablesModal] = useState(false);
  const [showSalvageModal, setShowSalvageModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['work-order', id],
    queryFn: () => workOrderAPI.getById(id),
  });

  const statusMutation = useMutation({
    mutationFn: (newStatus: string) => workOrderAPI.update(id, { status: newStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-order', id] });
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['workOrderStats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['parts'] });
      queryClient.invalidateQueries({ queryKey: ['warehouseStats'] });
      queryClient.invalidateQueries({ queryKey: ['receivables'] });
    },
    onError: (err: any) => Alert.alert('Hata', err?.message || 'Durum güncellenemedi.'),
  });

  const assignMutation = useMutation({
    mutationFn: (userId: string) => workOrderAPI.assign(id, userId),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['work-order', id] });
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['workOrderStats'] });
      setShowAssignModal(false);
      Alert.alert('✅ Başarılı', res?.message || 'İş emri atandı ve onaylandı.');
    },
    onError: (err: any) => Alert.alert('Hata', err?.message || 'Personel atanamadı.'),
  });

  const approveMutation = useMutation({
    mutationFn: () => workOrderAPI.approve(id),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['work-order', id] });
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['workOrderStats'] });
      Alert.alert('✅ Onaylandı', res?.message || 'İş emri atölyede başlatılmaya açıldı.');
    },
    onError: (err: any) => Alert.alert('Hata', err?.message || 'İş emri onaylanamadı.'),
  });

  const claimMutation = useMutation({
    mutationFn: () => workOrderAPI.claim(id),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['work-order', id] });
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['workOrderStats'] });
      Alert.alert('✅ Başarılı', res?.message || 'İş emri üzerinize alındı.');
    },
    onError: (err: any) => Alert.alert('Hata', err?.message || 'İş üzerinize alınamadı.'),
  });

  const requestTakeoverMutation = useMutation({
    mutationFn: () => workOrderAPI.requestTakeover(id),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['work-order', id] });
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      Alert.alert('✅ Talep İletildi', res?.message || 'İşi devralma talebiniz yöneticinin onayına iletildi.');
    },
    onError: (err: any) => Alert.alert('Hata', err?.message || 'Talep iletilemedi.'),
  });

  const respondTakeoverMutation = useMutation({
    mutationFn: ({ action }: { action: 'APPROVE' | 'REJECT' }) => workOrderAPI.respondTakeover(id, action),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['work-order', id] });
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['workOrderStats'] });
      Alert.alert('✅ Başarılı', res?.message || 'Devralma talebi yanıtlandı.');
    },
    onError: (err: any) => Alert.alert('Hata', err?.message || 'Talep yanıtlanamadı.'),
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

  const isOwnerOrAdmin = !isTech || order?.userId === user?.id;

  const statusColor = STATUS_COLORS[order.status] || '#94A3B8';

  const total = parseFloat(order.totalAmount || 0);
  const paid = parseFloat(order.paidAmount || 0);
  const remaining = Math.max(0, total - paid);

  let orderTip = typeof order.tipAmount === 'number' ? order.tipAmount : 0;
  if (!orderTip && order.paymentNotes) {
    const tipMatches = [...order.paymentNotes.matchAll(/\[₺([\d.,]+)\s*Bahşiş/gi)];
    if (tipMatches.length > 0) {
      orderTip = tipMatches.reduce((acc: number, m: any) => {
        const val = parseFloat(m[1].replace(',', '.'));
        return acc + (isNaN(val) ? 0 : val);
      }, 0);
    }
  }

  const paymentStatusMap = order.status === 'IPTAL'
    ? { label: '🚫 İPTAL EDİLDİ', color: theme.danger, bg: theme.danger + '20' }
    : {
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
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 6 }}>
                <View style={{ backgroundColor: 'rgba(0,0,0,0.25)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.sm }}>
                  <Text style={{ color: '#fff', fontSize: Typography.fontSize.xs, fontWeight: '700' }}>
                    🔧 Sorumlu: {order.user?.fullName || 'Atölye Havuzu'} {order.userId === user?.id ? '★ (Ben)' : ''}
                  </Text>
                </View>

                {/* Onay Rozeti */}
                <View
                  style={{
                    backgroundColor: order.isApproved ? 'rgba(16, 185, 129, 0.35)' : 'rgba(245, 158, 11, 0.35)',
                    borderWidth: 1,
                    borderColor: order.isApproved ? '#10B981' : '#F59E0B',
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: BorderRadius.sm,
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>
                    {order.isApproved ? '✅ YÖNETİCİ ONAYLI' : '⏳ ONAY BEKLİYOR'}
                  </Text>
                </View>

                {/* Yönetici Personel Atama Butonu */}
                {!isTech && (
                  <TouchableOpacity
                    style={{
                      backgroundColor: '#fff',
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: BorderRadius.sm,
                    }}
                    onPress={() => setShowAssignModal(true)}
                  >
                    <Text style={{ color: theme.primary, fontSize: 11, fontWeight: '800' }}>
                      👤 Personel Ata / Değiştir
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
            <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: BorderRadius.full, marginLeft: Spacing.sm }}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: Typography.fontSize.sm }}>{STATUS_LABELS[order.status]}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Yönetici için Devralma Talebi Uyarısı */}
        {!isTech && Boolean(order.takeoverRequestedById) && (
          <View style={{ marginHorizontal: Spacing.lg, marginTop: Spacing.md, backgroundColor: '#FEF3C7', borderWidth: 1.5, borderColor: '#F59E0B', borderRadius: BorderRadius.lg, padding: Spacing.md, ...Shadows.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Text style={{ fontSize: 18 }}>🔔</Text>
              <Text style={{ fontWeight: '800', color: '#92400E', fontSize: Typography.fontSize.sm }}>
                İŞİ DEVRALMA TALEBİ MEVCUT
              </Text>
            </View>
            <Text style={{ color: '#78350F', fontSize: Typography.fontSize.xs, marginBottom: Spacing.md, lineHeight: 18 }}>
              Teknisyen <Text style={{ fontWeight: '800' }}>"{order.takeoverUser?.fullName || 'Personel'}"</Text>, bu iş emrini mevcut sorumlu ({order.user?.fullName || 'Atölye'}) üzerinden kendi üzerine devralmak istiyor.
            </Text>
            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: '#10B981', paddingVertical: 10, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center' }}
                onPress={() => {
                  Alert.alert(
                    'Devri Onayla',
                    `Bu iş emrinin "${order.takeoverUser?.fullName || 'teknisyen'}" adlı personele devredilmesini onaylıyor musunuz?`,
                    [
                      { text: 'Vazgeç', style: 'cancel' },
                      { text: '✅ Evet, Onayla', onPress: () => respondTakeoverMutation.mutate({ action: 'APPROVE' }) },
                    ]
                  );
                }}
                disabled={respondTakeoverMutation.isPending}
              >
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: Typography.fontSize.xs }}>
                  ✅ Devri Onayla
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: '#EF4444', paddingVertical: 10, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center' }}
                onPress={() => {
                  Alert.alert(
                    'Talebi Reddet',
                    'Devralma talebini reddetmek istediğinize emin misiniz?',
                    [
                      { text: 'Vazgeç', style: 'cancel' },
                      { text: '❌ Reddet', style: 'destructive', onPress: () => respondTakeoverMutation.mutate({ action: 'REJECT' }) },
                    ]
                  );
                }}
                disabled={respondTakeoverMutation.isPending}
              >
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: Typography.fontSize.xs }}>
                  ❌ Reddet
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Maliyet ve Ödeme Özeti */}
        <View style={[dynamicStyles.section, { marginTop: 0 }]}>
          <View style={dynamicStyles.costCard}>
            {[
              { label: 'Parça Satışı', value: order.partsSaleTotal, color: theme.textPrimary },
              ...(!isTech ? [
                { label: 'Parça Maliyeti', value: order.partsCostTotal, color: theme.textMuted },
                { label: 'Parça Kârı', value: order.partsProfit, color: (order.partsProfit || 0) >= 0 ? theme.success : theme.danger },
              ] : []),
              { label: 'İşçilik', value: order.laborCost, color: theme.primary },
              { label: 'TOPLAM', value: order.totalAmount, color: theme.accent, bold: true },
              ...(orderTip > 0 ? [{ label: '🎁 Usta Bahşişi / İkramiye', value: orderTip, color: '#059669', bold: true }] : []),
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

            {/* Kayıtlı Bahşiş / Usta İkramiyesi Vurgu Kartı */}
            {orderTip > 0 && (
              <View
                style={{
                  marginTop: Spacing.sm,
                  backgroundColor: '#10B98115',
                  borderWidth: 1.5,
                  borderColor: '#10B981',
                  borderRadius: BorderRadius.md,
                  padding: Spacing.sm + 2,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: Spacing.sm,
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: BorderRadius.full,
                    backgroundColor: '#10B98125',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 18 }}>🎁</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: Typography.fontSize.xs, fontWeight: '800', color: '#047857' }}>
                      Usta Bahşişi / İkramiye Kayıtlı
                    </Text>
                    <Text style={{ fontSize: Typography.fontSize.sm, fontWeight: '900', color: '#059669' }}>
                      +₺{orderTip.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }}>
                    İş emri tutarı haricinde personele/ustaya bırakılan ikramiye kasaya kaydedilmiştir.
                  </Text>
                </View>
              </View>
            )}

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
            {order.status === 'IPTAL' ? (
              <View style={{ marginTop: Spacing.sm, backgroundColor: '#FEF2F2', padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: '#FCA5A5' }}>
                <Text style={{ color: '#991B1B', fontWeight: '700', fontSize: Typography.fontSize.sm }}>
                  🚫 İptal Edilmiş İş Emri
                </Text>
                <Text style={{ color: '#7F1D1D', fontSize: Typography.fontSize.xs, marginTop: 2 }}>
                  Bu iş emri iptal edildiğinden tahsilat veya ödeme kaydı yapılamaz.
                </Text>
              </View>
            ) : isTech ? (
              <View style={{ marginTop: Spacing.xs, backgroundColor: theme.surface, padding: Spacing.sm, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: theme.border }}>
                <Text style={{ fontSize: 11, color: theme.textSecondary, textAlign: 'center' }}>
                  🔒 Tahsilat ve ödeme alma işlemleri sadece Yönetici / Admin yetkisine açıktır.
                </Text>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', gap: Spacing.xs, marginTop: Spacing.sm }}>
                <TouchableOpacity
                  style={[dynamicStyles.paymentActionBtn, { backgroundColor: remaining > 0 ? theme.primary : theme.success }]}
                  onPress={() => setShowPaymentModal(true)}
                >
                  <CreditCard size={14} color="#fff" />
                  <Text style={dynamicStyles.paymentActionBtnText}>
                    {remaining > 0 ? '💰 Tahsilat Al' : (orderTip > 0 ? '🎁 Bahşiş / Tahsilat Yönet' : '✅ Tahsilat Tamamlandı (Yönet)')}
                  </Text>
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
            )}
          </View>

          {/* WhatsApp Fiş Gönder Butonu */}
          {order.status !== 'IPTAL' && (
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
          )}
        </View>

        {/* ─── İş Emri Süreci & Durum Yönetimi ─── */}
        <View style={dynamicStyles.section}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm }}>
            <Text style={dynamicStyles.sectionTitle}>⚙️ İş Emri Durumu</Text>
            <View
              style={{
                backgroundColor: (STATUS_COLORS[order.status] || theme.primary) + '20',
                paddingHorizontal: Spacing.sm,
                paddingVertical: 4,
                borderRadius: BorderRadius.sm,
                borderWidth: 1,
                borderColor: STATUS_COLORS[order.status] || theme.primary,
              }}
            >
              <Text style={{ color: STATUS_COLORS[order.status] || theme.primary, fontWeight: '700', fontSize: Typography.fontSize.xs }}>
                {order.status === 'ACIK' ? '🔵 AÇIK / BEKLİYOR' :
                 order.status === 'DEVAM_EDIYOR' ? '🟡 LİFTTE (DEVAM EDİYOR)' :
                 order.status === 'TAMAMLANDI' ? '🟢 TAMAMLANDI' : '🔴 İPTAL EDİLDİ'}
              </Text>
            </View>
          </View>

          {/* 1. DURUM: ACIK (Bekliyor) */}
          {order.status === 'ACIK' && (
            <View style={{ gap: Spacing.sm }}>
              {/* Onay Bekleyen İş Emri Durumu */}
              {!order.isApproved ? (
                !isTech ? (
                  /* Yönetici Onay Butonu */
                  <View style={{ backgroundColor: '#FEF3C7', borderWidth: 1.5, borderColor: '#F59E0B', borderRadius: BorderRadius.lg, padding: Spacing.md, gap: Spacing.sm }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 18 }}>⏳</Text>
                      <Text style={{ fontWeight: '800', color: '#92400E', fontSize: Typography.fontSize.sm }}>
                        Yönetici Onayı Bekleniyor
                      </Text>
                    </View>
                    <Text style={{ color: '#78350F', fontSize: Typography.fontSize.xs, lineHeight: 18 }}>
                      Bu iş emri henüz onaylanmadı. Onay vererek teknisyenlerin işi lifte almasına izin verebilirsiniz.
                    </Text>
                    <TouchableOpacity
                      style={{
                        backgroundColor: '#10B981',
                        borderRadius: BorderRadius.md,
                        paddingVertical: 12,
                        alignItems: 'center',
                        justifyContent: 'center',
                        ...Shadows.sm,
                      }}
                      onPress={() => {
                        Alert.alert('İşi Onayla', 'Bu iş emrini onaylayarak atölyede başlatılmaya açmak istiyor musunuz?', [
                          { text: 'Vazgeç', style: 'cancel' },
                          { text: '✅ Evet, Onayla', onPress: () => approveMutation.mutate() },
                        ]);
                      }}
                      disabled={approveMutation.isPending}
                    >
                      {approveMutation.isPending ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={{ color: '#fff', fontWeight: '800', fontSize: Typography.fontSize.sm }}>
                          ✅ İşi Onayla & Başlatmaya Aç
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                ) : (
                  /* Teknisyen için Bilgilendirme (Lifte Alınamaz) */
                  <View style={{ backgroundColor: theme.surfaceElevated || theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: BorderRadius.lg, padding: Spacing.md, alignItems: 'center' }}>
                    <Text style={{ fontSize: 24, marginBottom: 4 }}>⏳</Text>
                    <Text style={{ fontWeight: '800', color: theme.textPrimary, fontSize: Typography.fontSize.sm, marginBottom: 4 }}>
                      Yönetici Onayı Bekleniyor
                    </Text>
                    <Text style={{ color: theme.textMuted, fontSize: Typography.fontSize.xs, textAlign: 'center', lineHeight: 18 }}>
                      Bu iş emri havuzda beklemektedir. Yönetici onaylamadan önce lifte alınamaz veya başlatılamaz.
                    </Text>
                  </View>
                )
              ) : (
                /* Onaylı İş Emri Başlatma / Devralma Seçenekleri */
                <>
                  {/* Durum A: Kendi üzerindeki iş VEYA Yönetici/Müdür */}
                  {(!isTech || order.userId === user?.id) && (
                    <TouchableOpacity
                      style={{
                        backgroundColor: '#F59E0B',
                        borderRadius: BorderRadius.md,
                        paddingVertical: 14,
                        paddingHorizontal: Spacing.md,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: Spacing.sm,
                        ...Shadows.sm,
                      }}
                      onPress={() => {
                        Alert.alert('İşi Başlat', 'İş emri başlatılsın ve araç lifte alınsın mı?', [
                          { text: 'Vazgeç', style: 'cancel' },
                          { text: '▶️ Evet, Başlat', onPress: () => statusMutation.mutate('DEVAM_EDIYOR') },
                        ]);
                      }}
                    >
                      <Text style={{ color: '#fff', fontWeight: '800', fontSize: Typography.fontSize.base }}>
                        ▶️ İşe Başla (Lifte Al)
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* Durum B: Teknisyen & İş başka bir teknisyenin üzerinde */}
                  {isTech && order.userId !== user?.id && order.user?.role === 'TECHNICIAN' && (
                    <View style={{ gap: Spacing.sm }}>
                      {order.takeoverRequestedById === user?.id ? (
                        <View style={{ backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#93C5FD', borderRadius: BorderRadius.lg, padding: Spacing.md, alignItems: 'center' }}>
                          <Text style={{ fontSize: 20, marginBottom: 4 }}>⏳</Text>
                          <Text style={{ fontWeight: '800', color: '#1D4ED8', fontSize: Typography.fontSize.sm }}>
                            Devralma Talebiniz Yönetici Onayında
                          </Text>
                          <Text style={{ color: '#3B82F6', fontSize: Typography.fontSize.xs, textAlign: 'center', marginTop: 4 }}>
                            Bu işi "{order.user?.fullName}" üzerinden devralmak için talep ilettiniz. Yönetici onayından sonra üzerinize geçecektir.
                          </Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={{
                            backgroundColor: '#6366F1',
                            borderRadius: BorderRadius.md,
                            paddingVertical: 14,
                            paddingHorizontal: Spacing.md,
                            alignItems: 'center',
                            justifyContent: 'center',
                            ...Shadows.sm,
                          }}
                          onPress={() => {
                            Alert.alert(
                              'İşi Devralma Talebi',
                              `Bu iş emri şu anda "${order.user?.fullName}" adlı teknisyene atanmıştır.\n\nİşi kendi üzerinize devralmak için yöneticiye onay talebi göndermek istiyor musunuz?`,
                              [
                                { text: 'Vazgeç', style: 'cancel' },
                                { text: '🤝 Evet, Talep Gönder', onPress: () => requestTakeoverMutation.mutate() },
                              ]
                            );
                          }}
                          disabled={requestTakeoverMutation.isPending}
                        >
                          <Text style={{ color: '#fff', fontWeight: '800', fontSize: Typography.fontSize.base }}>
                            🤝 İşi Devralma Talebi Gönder
                          </Text>
                          <Text style={{ color: '#E0E7FF', fontSize: 11, marginTop: 2 }}>
                            (Şu anki sorumlu teknisyen: {order.user?.fullName})
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}

                  {/* Durum C: Teknisyen & İş havuzda açık (teknisyene zimmetli değil) ve ONAYLI */}
                  {isTech && order.userId !== user?.id && order.user?.role !== 'TECHNICIAN' && (
                    <View style={{ gap: Spacing.sm }}>
                      <TouchableOpacity
                        style={{
                          backgroundColor: '#F59E0B',
                          borderRadius: BorderRadius.md,
                          paddingVertical: 14,
                          paddingHorizontal: Spacing.md,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: Spacing.sm,
                          ...Shadows.sm,
                        }}
                        onPress={() => {
                          Alert.alert(
                            'İşi Üzerine Al ve Başlat',
                            'Bu iş emri yönetici tarafından onaylanmıştır.\n\nİşi kendi üzerinize alıp lifte başlatmak istiyor musunuz?',
                            [
                              { text: 'Vazgeç', style: 'cancel' },
                              { text: '▶️ Evet, Üzerime Al ve Başlat', onPress: () => statusMutation.mutate('DEVAM_EDIYOR') },
                            ]
                          );
                        }}
                      >
                        <Text style={{ color: '#fff', fontWeight: '800', fontSize: Typography.fontSize.base }}>
                          ▶️ İşi Üzerime Al ve Başlat
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={{
                          backgroundColor: theme.primary + '15',
                          borderWidth: 1,
                          borderColor: theme.primary,
                          borderRadius: BorderRadius.md,
                          paddingVertical: 10,
                          alignItems: 'center',
                        }}
                        onPress={() => {
                          Alert.alert('İşi Üzerine Al', 'Bu onaylı iş emrini kendi üzerinize almak istiyor musunuz?', [
                            { text: 'Vazgeç', style: 'cancel' },
                            { text: '🎯 Evet, Üzerime Al', onPress: () => claimMutation.mutate() },
                          ]);
                        }}
                        disabled={claimMutation.isPending}
                      >
                        <Text style={{ color: theme.primary, fontWeight: '700', fontSize: Typography.fontSize.xs }}>
                          🎯 İşi Sadece Üzerime Al (Başlatmadan)
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}

              {/* İptal Butonu (Sadece Yönetici / Admin) */}
              {!isTech && (
                <TouchableOpacity
                  style={{
                    backgroundColor: theme.danger + '10',
                    borderWidth: 1,
                    borderColor: theme.danger + '40',
                    borderRadius: BorderRadius.md,
                    paddingVertical: 10,
                    alignItems: 'center',
                  }}
                  onPress={() => {
                    Alert.alert('İş Emrini İptal Et', 'Bu iş emrini iptal etmek istediğinize emin misiniz? Rezerve parçalar serbest bırakılacaktır.', [
                      { text: 'Vazgeç', style: 'cancel' },
                      { text: '❌ Evet, İptal Et', style: 'destructive', onPress: () => statusMutation.mutate('IPTAL') },
                    ]);
                  }}
                >
                  <Text style={{ color: theme.danger, fontWeight: '700', fontSize: Typography.fontSize.xs }}>
                    ❌ İş Emrini İptal Et
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* 2. DURUM: DEVAM_EDIYOR (Lifte Alındı) */}
          {order.status === 'DEVAM_EDIYOR' && (
            <View style={{ gap: Spacing.sm }}>
              {isTech && order.userId !== user?.id ? (
                /* Başka bir teknisyen lifte almış çalışıyor */
                <View style={{ gap: Spacing.sm }}>
                  {order.takeoverRequestedById === user?.id ? (
                    <View style={{ backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#93C5FD', borderRadius: BorderRadius.lg, padding: Spacing.md, alignItems: 'center' }}>
                      <Text style={{ fontSize: 20, marginBottom: 4 }}>⏳</Text>
                      <Text style={{ fontWeight: '800', color: '#1D4ED8', fontSize: Typography.fontSize.sm }}>
                        Devralma Talebiniz Yönetici Onayında
                      </Text>
                      <Text style={{ color: '#3B82F6', fontSize: Typography.fontSize.xs, textAlign: 'center', marginTop: 4 }}>
                        Bu devam eden işi devralmak için talep ilettiniz. Yönetici onayından sonra üzerinize geçecektir.
                      </Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={{
                        backgroundColor: '#6366F1',
                        borderRadius: BorderRadius.md,
                        paddingVertical: 14,
                        paddingHorizontal: Spacing.md,
                        alignItems: 'center',
                        justifyContent: 'center',
                        ...Shadows.sm,
                      }}
                      onPress={() => {
                        Alert.alert(
                          'Devam Eden İşi Devralma Talebi',
                          `Bu iş şu anda "${order.user?.fullName}" tarafından lifte alınmış ve devam etmektedir.\n\nİşi devralmak için yöneticiye onay talebi göndermek istiyor musunuz?`,
                          [
                            { text: 'Vazgeç', style: 'cancel' },
                            { text: '🤝 Evet, Talep Gönder', onPress: () => requestTakeoverMutation.mutate() },
                          ]
                        );
                      }}
                      disabled={requestTakeoverMutation.isPending}
                    >
                      <Text style={{ color: '#fff', fontWeight: '800', fontSize: Typography.fontSize.base }}>
                        🤝 Devam Eden İşi Devralma Talebi Gönder
                      </Text>
                      <Text style={{ color: '#E0E7FF', fontSize: 11, marginTop: 2 }}>
                        (Lifte alan teknisyen: {order.user?.fullName})
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                /* Sorumlu teknisyen veya Yönetici */
                <View style={{ gap: Spacing.sm }}>
                  <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                    {/* ⏸️ İŞİ GERİ AL / BEKLEMEYE AL */}
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        backgroundColor: '#3B82F6',
                        borderRadius: BorderRadius.md,
                        paddingVertical: 12,
                        alignItems: 'center',
                        justifyContent: 'center',
                        ...Shadows.sm,
                      }}
                      onPress={() => {
                        const isRevertingToOwner = order.previousUserId || (order.creatorId && order.creatorId !== user?.id);
                        const alertMsg = isRevertingToOwner
                          ? 'İş emrini geri alıp beklemeye (Açık durumuna) almak istiyor musunuz?\n\nİş emri atölye havuzuna ve önceki asıl sahibine iade edilecektir.'
                          : 'İş emrini geri alıp beklemeye (Açık durumuna) almak istiyor musunuz?\n\n(Parça bekleniyorsa veya işlem durdurulduysa aracı bekleme sırasına alabilirsiniz.)';

                        Alert.alert(
                          'İşi Geri Al (Beklemeye Al)',
                          alertMsg,
                          [
                            { text: 'Vazgeç', style: 'cancel' },
                            { text: '⏸️ Evet, Geri Al', onPress: () => statusMutation.mutate('ACIK') },
                          ]
                        );
                      }}
                    >
                      <Text style={{ color: '#fff', fontWeight: '800', fontSize: Typography.fontSize.sm }}>
                        ⏸️ İşi Geri Al
                      </Text>
                      <Text style={{ color: '#E0F2FE', fontSize: 10, fontWeight: '600', marginTop: 2 }}>
                        (Beklemeye Al)
                      </Text>
                    </TouchableOpacity>

                    {/* ✅ İŞİ TAMAMLA */}
                    <TouchableOpacity
                      style={{
                        flex: 1.2,
                        backgroundColor: '#10B981',
                        borderRadius: BorderRadius.md,
                        paddingVertical: 12,
                        alignItems: 'center',
                        justifyContent: 'center',
                        ...Shadows.sm,
                      }}
                      onPress={() => {
                        Alert.alert(
                          'İşi Tamamla',
                          'İş emri başarıyla tamamlandı olarak işaretlensin mi?\n\nKullanılan parçalar otomatik olarak depodan düşülecektir.',
                          [
                            { text: 'Vazgeç', style: 'cancel' },
                            { text: '✅ Evet, Tamamla', onPress: () => statusMutation.mutate('TAMAMLANDI') },
                          ]
                        );
                      }}
                    >
                      <Text style={{ color: '#fff', fontWeight: '800', fontSize: Typography.fontSize.sm }}>
                        ✅ İşi Tamamla
                      </Text>
                      <Text style={{ color: '#D1FAE5', fontSize: 10, fontWeight: '600', marginTop: 2 }}>
                        (Depodan Düş)
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {!isTech && (
                    <TouchableOpacity
                      style={{
                        backgroundColor: theme.danger + '10',
                        borderWidth: 1,
                        borderColor: theme.danger + '40',
                        borderRadius: BorderRadius.md,
                        paddingVertical: 9,
                        alignItems: 'center',
                      }}
                      onPress={() => {
                        Alert.alert('İş Emrini İptal Et', 'Devam eden bu iş emrini iptal etmek istediğinize emin misiniz? Kullanılan parçalar depoya geri iade edilecektir.', [
                          { text: 'Vazgeç', style: 'cancel' },
                          { text: '❌ Evet, İptal Et', style: 'destructive', onPress: () => statusMutation.mutate('IPTAL') },
                        ]);
                      }}
                    >
                      <Text style={{ color: theme.danger, fontWeight: '700', fontSize: Typography.fontSize.xs }}>
                        ❌ İş Emrini İptal Et
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          )}

          {/* 3. DURUM: TAMAMLANDI */}
          {order.status === 'TAMAMLANDI' && (
            <View style={{ gap: Spacing.sm }}>
              <View style={{ backgroundColor: '#10B98115', borderWidth: 1, borderColor: '#10B98140', borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center' }}>
                <Text style={{ color: '#10B981', fontWeight: '800', fontSize: Typography.fontSize.sm }}>
                  ✅ Bu iş emri başarıyla tamamlanmıştır.
                </Text>
                {order.completedAt && (
                  <Text style={{ color: theme.textSecondary, fontSize: Typography.fontSize.xs, marginTop: 4 }}>
                    Bitiş: {new Date(order.completedAt).toLocaleString('tr-TR')}
                  </Text>
                )}
              </View>

              {!isTech && (
                <TouchableOpacity
                  style={{
                    backgroundColor: theme.surface,
                    borderWidth: 1,
                    borderColor: theme.border,
                    borderRadius: BorderRadius.md,
                    paddingVertical: 10,
                    alignItems: 'center',
                  }}
                  onPress={() => {
                    Alert.alert('İşi Yeniden Aç', 'Tamamlanmış bu iş emrini yeniden devam eden duruma getirmek istiyor musunuz?', [
                      { text: 'Vazgeç', style: 'cancel' },
                      { text: '🔄 Yeniden Aç', onPress: () => statusMutation.mutate('DEVAM_EDIYOR') },
                    ]);
                  }}
                >
                  <Text style={{ color: theme.textSecondary, fontWeight: '600', fontSize: Typography.fontSize.xs }}>
                    🔄 İşi Yeniden Aç (Devam Ettir)
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* 4. DURUM: IPTAL */}
          {order.status === 'IPTAL' && (
            <View style={{ gap: Spacing.sm }}>
              <View style={{ backgroundColor: '#EF444415', borderWidth: 1, borderColor: '#EF444440', borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center' }}>
                <Text style={{ color: '#EF4444', fontWeight: '800', fontSize: Typography.fontSize.sm }}>
                  ⛔ BU İŞ EMRİ İPTAL EDİLMİŞTİR
                </Text>
                <Text style={{ color: theme.textSecondary, fontSize: Typography.fontSize.xs, marginTop: 4, textAlign: 'center' }}>
                  İş emri iptal edildiğinden parça ekleme ve tahsilat işlemleri tamamen kapatılmıştır.
                </Text>
              </View>

              {!isTech && (
                <TouchableOpacity
                  style={{
                    backgroundColor: theme.primary + '15',
                    borderWidth: 1,
                    borderColor: theme.primary + '40',
                    borderRadius: BorderRadius.md,
                    paddingVertical: 10,
                    alignItems: 'center',
                  }}
                  onPress={() => {
                    Alert.alert('İptali Geri Al', 'Bu iş emrinin iptalini geri alıp açık / bekleme durumuna getirmek istiyor musunuz?', [
                      { text: 'Vazgeç', style: 'cancel' },
                      { text: '🔄 İptali Geri Al (Yeniden Aç)', onPress: () => statusMutation.mutate('ACIK') },
                    ]);
                  }}
                >
                  <Text style={{ color: theme.primary, fontWeight: '700', fontSize: Typography.fontSize.xs }}>
                    🔄 İptali Geri Al (Açık Durumuna Getir)
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Parçalar & Sanayi Hızlı Aksiyonları */}
        <View style={dynamicStyles.section}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm }}>
            <Text style={dynamicStyles.sectionTitle}>🔩 Kullanılan Parçalar</Text>
            {isOwnerOrAdmin && order.status !== 'TAMAMLANDI' && order.status !== 'IPTAL' && (
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.primary, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: 8 }}
                onPress={() => setShowAddPart(true)}
              >
                <Plus size={14} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: Typography.fontSize.sm }}>PARÇA EKLE</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Başka personele ait ise bilgilendirme uyarısı */}
          {isTech && order.userId !== user?.id && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.primary + '10', padding: Spacing.sm, borderRadius: BorderRadius.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: theme.border }}>
              <Text style={{ fontSize: 14 }}>🔒</Text>
              <Text style={{ color: theme.textSecondary, fontSize: Typography.fontSize.xs, flex: 1 }}>
                Bu iş emri başka bir personele ait olduğu için parça/sarf ekleme ve düzenleme yetkisi kısıtlanmıştır (Salt Okunur).
              </Text>
            </View>
          )}

          {/* Hızlı Sanayi Butonları (Sarf Malzemesi & Çıkma Parça) */}
          {isOwnerOrAdmin && order.status !== 'TAMAMLANDI' && order.status !== 'IPTAL' && (
            <View style={{ flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: '#FEF3C7',
                  borderColor: '#FCD34D',
                  borderWidth: 1,
                  borderRadius: BorderRadius.md,
                  paddingVertical: 9,
                  paddingHorizontal: Spacing.sm,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
                onPress={() => setShowConsumablesModal(true)}
              >
                <Text style={{ fontSize: 16 }}>🧰</Text>
                <Text style={{ color: '#92400E', fontWeight: '800', fontSize: Typography.fontSize.xs }}>
                  + Sarf Malzemesi
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: '#ECFDF5',
                  borderColor: '#A7F3D0',
                  borderWidth: 1,
                  borderRadius: BorderRadius.md,
                  paddingVertical: 9,
                  paddingHorizontal: Spacing.sm,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
                onPress={() => setShowSalvageModal(true)}
              >
                <Text style={{ fontSize: 16 }}>♻️</Text>
                <Text style={{ color: '#065F46', fontWeight: '800', fontSize: Typography.fontSize.xs }}>
                  Çıkma Parça Kaydet
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {order.items?.length === 0 ? (
            isOwnerOrAdmin && order.status !== 'TAMAMLANDI' && order.status !== 'IPTAL' ? (
              <TouchableOpacity
                style={{ backgroundColor: theme.surface, borderWidth: 2, borderStyle: 'dashed', borderColor: theme.border, borderRadius: BorderRadius.lg, padding: Spacing.xl, alignItems: 'center' }}
                onPress={() => setShowAddPart(true)}
              >
                <Text style={{ fontSize: 40, marginBottom: 8 }}>🔩</Text>
                <Text style={{ color: theme.textSecondary, fontWeight: '600' }}>Parça eklemek için dokun</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: BorderRadius.lg, padding: Spacing.lg, alignItems: 'center' }}>
                <Text style={{ fontSize: 32, marginBottom: 6 }}>🔩</Text>
                <Text style={{ color: theme.textSecondary, fontWeight: '600', textAlign: 'center' }}>Bu iş emrine henüz parça eklenmemiş.</Text>
              </View>
            )
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
                      {isOwnerOrAdmin && canProgress && order.status !== 'IPTAL' && (
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
                      {isOwnerOrAdmin && item.status !== 'KULLANILDI' && order.status !== 'TAMAMLANDI' && (
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
          <PhotoSection
            order={order}
            theme={theme}
            canEdit={isOwnerOrAdmin && order.status !== 'TAMAMLANDI' && order.status !== 'IPTAL'}
          />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <AddPartModal visible={showAddPart} orderId={id} onClose={() => setShowAddPart(false)} theme={theme} />
      <PaymentUpdateModal visible={showPaymentModal} order={order} onClose={() => setShowPaymentModal(false)} theme={theme} />
      <WorkshopConsumableModal visible={showConsumablesModal} orderId={id} onClose={() => setShowConsumablesModal(false)} theme={theme} />
      <SalvagePartModal visible={showSalvageModal} order={order} onClose={() => setShowSalvageModal(false)} theme={theme} />
      <AssignStaffModal
        visible={showAssignModal}
        order={order}
        onClose={() => setShowAssignModal(false)}
        theme={theme}
        onAssign={(userId) => assignMutation.mutate(userId)}
        isPending={assignMutation.isPending}
      />
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
