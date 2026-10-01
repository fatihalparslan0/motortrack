import React, { useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Modal, KeyboardAvoidingView,
  Platform, ScrollView, RefreshControl, Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { warehouseAPI } from '../../src/api/client';
import { Typography, Spacing, BorderRadius, Shadows } from '../../src/constants/theme';
import { useAppTheme } from '../../src/hooks/useAppTheme';
import { useAuthStore, isTechnicianRole } from '../../src/store/auth.store';
import {
  Plus, Warehouse, MapPin, CheckCircle2, Star, Edit3, Trash2, ArrowLeft, Info
} from 'lucide-react-native';

// ─── Yeni Depo Ekleme Modalı ──────────────────────────────────────────────────
function AddWarehouseModal({ visible, onClose, theme }: any) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: '', description: '', address: '', isDefault: false });
  const update = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const mutation = useMutation({
    mutationFn: () => warehouseAPI.create(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      queryClient.invalidateQueries({ queryKey: ['warehouseStats'] });
      setForm({ name: '', description: '', address: '', isDefault: false });
      onClose();
      Alert.alert('✅ Başarılı', 'Yeni depo başarıyla eklendi.');
    },
    onError: (err: any) => Alert.alert('Hata', err?.message || 'Depo eklenemedi.'),
  });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: theme.background }}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: theme.border }}>
            <Text style={{ fontSize: Typography.fontSize.lg, fontWeight: '800', color: theme.textPrimary }}>📦 Yeni Depo Ekle</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ color: theme.primary, fontWeight: '600' }}>İptal</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: Spacing.lg }} showsVerticalScrollIndicator={false}>
            <Text style={{ color: theme.textMuted, fontSize: Typography.fontSize.xs, fontWeight: '700', marginBottom: 4, textTransform: 'uppercase' }}>
              Depo Adı *
            </Text>
            <TextInput
              style={{
                backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border,
                borderRadius: BorderRadius.md, padding: Spacing.md, color: theme.textPrimary,
                marginBottom: Spacing.md, fontSize: Typography.fontSize.base
              }}
              value={form.name}
              onChangeText={v => update('name', v)}
              placeholder="Örn: Atölye Hızlı Sarfiyat & Yağ Reyonu"
              placeholderTextColor={theme.textMuted}
            />

            <Text style={{ color: theme.textMuted, fontSize: Typography.fontSize.xs, fontWeight: '700', marginBottom: 4, textTransform: 'uppercase' }}>
              Açıklama
            </Text>
            <TextInput
              style={{
                backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border,
                borderRadius: BorderRadius.md, padding: Spacing.md, color: theme.textPrimary,
                marginBottom: Spacing.md
              }}
              value={form.description}
              onChangeText={v => update('description', v)}
              placeholder="Deponun kullanım amacı veya konumu..."
              placeholderTextColor={theme.textMuted}
            />

            <Text style={{ color: theme.textMuted, fontSize: Typography.fontSize.xs, fontWeight: '700', marginBottom: 4, textTransform: 'uppercase' }}>
              Adres / Raf / Konum
            </Text>
            <TextInput
              style={{
                backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border,
                borderRadius: BorderRadius.md, padding: Spacing.md, color: theme.textPrimary,
                marginBottom: Spacing.lg, height: 75, textAlignVertical: 'top'
              }}
              multiline
              value={form.address}
              onChangeText={v => update('address', v)}
              placeholder="Örn: Zemin Kat / 1. & 2. Lift Yanı"
              placeholderTextColor={theme.textMuted}
            />

            {/* Ana Depo Belirleme Switch'i */}
            <View style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border,
              borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.xl
            }}>
              <View style={{ flex: 1, paddingRight: Spacing.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: Typography.fontSize.sm, fontWeight: '700', color: theme.textPrimary }}>
                    ⭐ Ana Depo Olarak Ayarla
                  </Text>
                </View>
                <Text style={{ fontSize: Typography.fontSize.xs, color: theme.textMuted, marginTop: 2 }}>
                  Varsayılan depo olarak seçilir ve stok işlemlerinde ilk sırada gelir.
                </Text>
              </View>
              <Switch
                value={form.isDefault}
                onValueChange={v => update('isDefault', v)}
                trackColor={{ false: theme.border, true: '#F59E0B' }}
                thumbColor="#fff"
              />
            </View>

            <TouchableOpacity
              style={{
                backgroundColor: theme.primary, borderRadius: BorderRadius.md,
                padding: Spacing.md, alignItems: 'center', opacity: mutation.isPending ? 0.7 : 1
              }}
              onPress={() => {
                if (!form.name.trim()) { Alert.alert('Hata', 'Depo adı zorunludur.'); return; }
                mutation.mutate();
              }}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: Typography.fontSize.base }}>
                  Depoyu Kaydet
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Depo Düzenleme Modalı ────────────────────────────────────────────────────
function EditWarehouseModal({ visible, warehouse, onClose, theme }: any) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  React.useEffect(() => {
    if (warehouse) {
      setName(warehouse.name || '');
      setDescription(warehouse.description || '');
      setAddress(warehouse.address || '');
      setIsDefault(Boolean(warehouse.isDefault));
    }
  }, [warehouse]);

  const updateMutation = useMutation({
    mutationFn: () => warehouseAPI.update(warehouse.id, {
      name: name.trim(),
      description: description.trim(),
      address: address.trim(),
      isDefault,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      queryClient.invalidateQueries({ queryKey: ['warehouseStats'] });
      onClose();
      Alert.alert('✅ Başarılı', 'Depo bilgileri güncellendi.');
    },
    onError: (err: any) => Alert.alert('Hata', err?.message || 'Depo güncellenemedi.'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => warehouseAPI.delete(warehouse.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      queryClient.invalidateQueries({ queryKey: ['warehouseStats'] });
      onClose();
      Alert.alert('✅ Başarılı', 'Depo silindi.');
    },
    onError: (err: any) => Alert.alert('Hata', err?.message || 'Depo silinemedi.'),
  });

  const handleDelete = () => {
    if (warehouse.isDefault) {
      Alert.alert('Uyarı', 'Ana depo silinemez. Lütfen önce başka bir depoyu ana depo olarak belirleyin.');
      return;
    }
    Alert.alert(
      'Depoyu Sil',
      `"${warehouse.name}" deposunu silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`,
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Sil', style: 'destructive', onPress: () => deleteMutation.mutate() }
      ]
    );
  };

  if (!warehouse) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: theme.background }}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: theme.border }}>
            <View>
              <Text style={{ fontSize: Typography.fontSize.lg, fontWeight: '800', color: theme.textPrimary }}>
                ✏️ Depo Düzenle
              </Text>
              <Text style={{ fontSize: Typography.fontSize.xs, color: theme.textMuted }}>{warehouse.name}</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ color: theme.primary, fontWeight: '600' }}>İptal</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: Spacing.lg }} showsVerticalScrollIndicator={false}>
            <Text style={{ color: theme.textMuted, fontSize: Typography.fontSize.xs, fontWeight: '700', marginBottom: 4, textTransform: 'uppercase' }}>
              Depo Adı *
            </Text>
            <TextInput
              style={{
                backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border,
                borderRadius: BorderRadius.md, padding: Spacing.md, color: theme.textPrimary,
                marginBottom: Spacing.md, fontSize: Typography.fontSize.base, fontWeight: '600'
              }}
              value={name}
              onChangeText={setName}
              placeholder="Depo adı..."
              placeholderTextColor={theme.textMuted}
            />

            <Text style={{ color: theme.textMuted, fontSize: Typography.fontSize.xs, fontWeight: '700', marginBottom: 4, textTransform: 'uppercase' }}>
              Açıklama
            </Text>
            <TextInput
              style={{
                backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border,
                borderRadius: BorderRadius.md, padding: Spacing.md, color: theme.textPrimary,
                marginBottom: Spacing.md
              }}
              value={description}
              onChangeText={setDescription}
              placeholder="Açıklama..."
              placeholderTextColor={theme.textMuted}
            />

            <Text style={{ color: theme.textMuted, fontSize: Typography.fontSize.xs, fontWeight: '700', marginBottom: 4, textTransform: 'uppercase' }}>
              Adres / Konum
            </Text>
            <TextInput
              style={{
                backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border,
                borderRadius: BorderRadius.md, padding: Spacing.md, color: theme.textPrimary,
                marginBottom: Spacing.lg, height: 75, textAlignVertical: 'top'
              }}
              multiline
              value={address}
              onChangeText={setAddress}
              placeholder="Adres / Konum..."
              placeholderTextColor={theme.textMuted}
            />

            {/* Ana Depo Switch */}
            <View style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              backgroundColor: isDefault ? '#F59E0B15' : theme.surface,
              borderWidth: 1.5, borderColor: isDefault ? '#F59E0B' : theme.border,
              borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.xl
            }}>
              <View style={{ flex: 1, paddingRight: Spacing.sm }}>
                <Text style={{ fontSize: Typography.fontSize.sm, fontWeight: '800', color: isDefault ? '#D97706' : theme.textPrimary }}>
                  ⭐ Ana Depo (Varsayılan) Yap
                </Text>
                <Text style={{ fontSize: Typography.fontSize.xs, color: theme.textMuted, marginTop: 2 }}>
                  {isDefault
                    ? 'Bu depo şu an sistemin birincil Ana Deposu durumundadır.'
                    : 'Açıldığında bu depo birincil ana depo olur ve eski ana deponun yerini alır.'}
                </Text>
              </View>
              <Switch
                value={isDefault}
                onValueChange={setIsDefault}
                trackColor={{ false: theme.border, true: '#F59E0B' }}
                thumbColor="#fff"
              />
            </View>

            <TouchableOpacity
              style={{
                backgroundColor: theme.primary, borderRadius: BorderRadius.md,
                padding: Spacing.md, alignItems: 'center', marginBottom: Spacing.md,
                opacity: updateMutation.isPending ? 0.7 : 1
              }}
              onPress={() => {
                if (!name.trim()) { Alert.alert('Hata', 'Depo adı boş olamaz.'); return; }
                updateMutation.mutate();
              }}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: Typography.fontSize.base }}>
                  Değişiklikleri Kaydet
                </Text>
              )}
            </TouchableOpacity>

            {!warehouse.isDefault && (
              <TouchableOpacity
                style={{
                  backgroundColor: theme.danger + '12', borderRadius: BorderRadius.md,
                  padding: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: theme.danger + '30',
                  opacity: deleteMutation.isPending ? 0.7 : 1
                }}
                onPress={handleDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
                  <ActivityIndicator color={theme.danger} />
                ) : (
                  <Text style={{ color: theme.danger, fontWeight: '700', fontSize: Typography.fontSize.sm }}>
                    🗑️ Bu Depoyu Sil
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Ana Ekran ────────────────────────────────────────────────────────────────
export default function WarehousesScreen() {
  const { colors: theme } = useAppTheme();
  const { user } = useAuthStore();
  const isTechnician = isTechnicianRole(user?.role);
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [selectedWarehouseForEdit, setSelectedWarehouseForEdit] = useState<any>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehouseAPI.getAll(),
  });

  const warehouses: any[] = (data as any)?.data || [];

  // Hızlı 1-Tap Ana Depo Yap Mutation
  const setDefaultMutation = useMutation({
    mutationFn: (warehouseId: string) => warehouseAPI.update(warehouseId, { isDefault: true }),
    onSuccess: (_, warehouseId) => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      queryClient.invalidateQueries({ queryKey: ['warehouseStats'] });
      const target = warehouses.find(w => w.id === warehouseId);
      Alert.alert('⭐ Ana Depo Güncellendi', `"${target?.name || 'Seçilen depo'}" artık varsayılan Ana Depo olarak ayarlandı.`);
    },
    onError: (err: any) => Alert.alert('Hata', err?.message || 'Ana depo belirlenemedi.'),
  });

  const handleQuickSetDefault = (w: any) => {
    if (w.isDefault) return;
    Alert.alert(
      'Ana Depo Değişikliği',
      `"${w.name}" deposunu varsayılan Ana Depo yapmak istiyor musunuz?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: '⭐ Ana Depo Yap', onPress: () => setDefaultMutation.mutate(w.id) }
      ]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top']}>
      {/* ─── Header ─── */}
      <LinearGradient
        colors={[theme.primary, theme.primaryDark || '#312E81'] as [string, string]}
        style={{
          padding: Spacing.lg,
          borderBottomLeftRadius: BorderRadius.xl,
          borderBottomRightRadius: BorderRadius.xl,
          marginBottom: Spacing.md,
          ...Shadows.sm,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 6,
            marginBottom: Spacing.sm
          }}
        >
          <ArrowLeft size={18} color="rgba(255,255,255,0.85)" />
          <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: Typography.fontSize.sm, fontWeight: '600' }}>Geri</Text>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ fontSize: Typography.fontSize.xl, fontWeight: '800', color: '#fff' }}>
              📦 Depo Yönetimi
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: Typography.fontSize.xs, marginTop: 2 }}>
              Depolarınızı düzenleyin ve ana depoyu belirleyin
            </Text>
          </View>

          {!isTechnician && (
            <TouchableOpacity
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 6,
                backgroundColor: 'rgba(255,255,255,0.25)',
                borderRadius: BorderRadius.full, paddingHorizontal: Spacing.md, paddingVertical: 8,
                borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)'
              }}
              onPress={() => setShowAdd(true)}
              activeOpacity={0.8}
            >
              <Plus size={16} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: Typography.fontSize.sm }}>Yeni Depo</Text>
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* ─── Depolar Listesi ─── */}
      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <FlatList
          data={warehouses}
          keyExtractor={i => i.id}
          contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: 60, gap: Spacing.md }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={theme.primary} />}
          renderItem={({ item }) => {
            const isMain = item.isDefault;

            return (
              <View
                style={{
                  backgroundColor: theme.surface,
                  borderRadius: BorderRadius.xl,
                  borderWidth: isMain ? 2 : 1,
                  borderColor: isMain ? '#F59E0B' : theme.border,
                  padding: Spacing.md,
                  ...Shadows.sm,
                }}
              >
                {/* Üst Satır */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: BorderRadius.lg,
                        backgroundColor: isMain ? '#F59E0B20' : theme.primary + '15',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      {isMain ? (
                        <Star size={22} color="#F59E0B" fill="#F59E0B" />
                      ) : (
                        <Warehouse size={22} color={theme.primary} />
                      )}
                    </View>

                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text style={{ fontSize: Typography.fontSize.base, fontWeight: '800', color: theme.textPrimary }}>
                          {item.name}
                        </Text>

                        {isMain && (
                          <View
                            style={{
                              backgroundColor: '#F59E0B20',
                              borderWidth: 1,
                              borderColor: '#F59E0B60',
                              paddingHorizontal: 8,
                              paddingVertical: 2,
                              borderRadius: BorderRadius.full,
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 3,
                            }}
                          >
                            <Star size={10} color="#D97706" fill="#D97706" />
                            <Text style={{ fontSize: 10, color: '#D97706', fontWeight: '800' }}>
                              ANA DEPO
                            </Text>
                          </View>
                        )}
                      </View>

                      {item.description ? (
                        <Text style={{ color: theme.textSecondary, fontSize: Typography.fontSize.xs, marginTop: 2 }}>
                          {item.description}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  {/* Düzenle Butonu (Sadece Admin / Manager) */}
                  {!isTechnician && (
                    <TouchableOpacity
                      onPress={() => setSelectedWarehouseForEdit(item)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        backgroundColor: theme.surfaceElevated || theme.background,
                        paddingHorizontal: Spacing.sm,
                        paddingVertical: 6,
                        borderRadius: BorderRadius.md,
                        borderWidth: 1,
                        borderColor: theme.border,
                      }}
                      activeOpacity={0.7}
                    >
                      <Edit3 size={13} color={theme.textPrimary} />
                      <Text style={{ fontSize: Typography.fontSize.xs, color: theme.textPrimary, fontWeight: '700' }}>
                        Düzenle
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Adres / Konum Bilgisi */}
                {item.address ? (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      marginTop: Spacing.sm,
                      paddingTop: Spacing.xs,
                    }}
                  >
                    <MapPin size={13} color={theme.textMuted} />
                    <Text style={{ color: theme.textMuted, fontSize: Typography.fontSize.xs, flex: 1 }}>
                      {item.address}
                    </Text>
                  </View>
                ) : null}

                {/* Alt Eylem Barı */}
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: Spacing.sm,
                    paddingTop: Spacing.sm,
                    borderTopWidth: 1,
                    borderTopColor: theme.borderLight || theme.border,
                  }}
                >
                  <Text style={{ fontSize: Typography.fontSize.xs, color: theme.textMuted }}>
                    📦 {item._count?.stocks ?? 0} çeşit parça kayıtlı
                  </Text>

                  {isMain ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <CheckCircle2 size={14} color="#10B981" />
                      <Text style={{ fontSize: Typography.fontSize.xs, color: '#10B981', fontWeight: '700' }}>
                        Varsayılan Depo
                      </Text>
                    </View>
                  ) : !isTechnician ? (
                    <TouchableOpacity
                      onPress={() => handleQuickSetDefault(item)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        backgroundColor: '#F59E0B15',
                        borderWidth: 1,
                        borderColor: '#F59E0B40',
                        paddingHorizontal: Spacing.sm,
                        paddingVertical: 4,
                        borderRadius: BorderRadius.md,
                      }}
                      activeOpacity={0.7}
                    >
                      <Star size={12} color="#D97706" />
                      <Text style={{ fontSize: Typography.fontSize.xs, color: '#D97706', fontWeight: '700' }}>
                        ⭐ Ana Depo Yap
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Text style={{ fontSize: 64, marginBottom: Spacing.md }}>📦</Text>
              <Text style={{ fontSize: Typography.fontSize.lg, fontWeight: '700', color: theme.textPrimary, marginBottom: Spacing.sm }}>
                Kayıtlı Depo Bulunamadı
              </Text>
            </View>
          }
        />
      )}

      {/* Modallar */}
      <AddWarehouseModal visible={showAdd} onClose={() => setShowAdd(false)} theme={theme} />
      <EditWarehouseModal
        visible={Boolean(selectedWarehouseForEdit)}
        warehouse={selectedWarehouseForEdit}
        onClose={() => setSelectedWarehouseForEdit(null)}
        theme={theme}
      />
    </SafeAreaView>
  );
}
