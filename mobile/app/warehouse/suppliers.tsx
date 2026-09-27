import React, { useState } from 'react';
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

// ─── Tedarikçiler Ekranı ────────────────────────────────────────────────────
export default function SuppliersScreen() {
  const { colors: theme } = useAppTheme();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<any | null>(null);
  const [showModal, setShowModal] = useState(false);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['suppliers', search],
    queryFn: () => supplierAPI.getAll({ search: search.trim() || undefined }),
    placeholderData: (prev: any) => prev,
  });

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

      {/* Modal */}
      <SupplierFormModal
        visible={showModal}
        supplier={selectedSupplier}
        onClose={() => {
          setShowModal(false);
          setSelectedSupplier(null);
        }}
        theme={theme}
      />
    </SafeAreaView>
  );
}
