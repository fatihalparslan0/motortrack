import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Linking, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { workOrderAPI } from '../../src/api/client';
import { Typography, Spacing, BorderRadius, Shadows } from '../../src/constants/theme';
import { useAppTheme } from '../../src/hooks/useAppTheme';
import {
  ArrowLeft, Search, Phone, MessageSquare, Plus, ChevronRight,
  Clock, Calendar, Wrench, ShieldCheck, FileText, CheckCircle2, History
} from 'lucide-react-native';
import { openWhatsApp } from '../../src/utils/whatsapp';
import { parseVehicleInfo, formatPlateTR } from '../../src/utils/vehicle';

const SUGGESTED_PLATES = ['34 ABC 789', '35 YMH 12', '06 KWS 90', '34 BMW 125', '16 KTM 39'];

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  ACIK: { label: 'Açık', color: '#3B82F6' },
  DEVAM_EDIYOR: { label: 'Devam Ediyor', color: '#F59E0B' },
  TAMAMLANDI: { label: 'Tamamlandı', color: '#10B981' },
  IPTAL: { label: 'İptal', color: '#EF4444' },
};

export default function PlateHistoryScreen() {
  const { colors: theme } = useAppTheme();
  const [plateInput, setPlateInput] = useState('');
  const [searchedPlate, setSearchedPlate] = useState('34 ABC 789');
  const [activeTab, setActiveTab] = useState<'orders' | 'parts'>('orders');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['plate-history', searchedPlate],
    queryFn: () => workOrderAPI.getPlateHistory(searchedPlate),
    enabled: Boolean(searchedPlate && searchedPlate.trim().length >= 3),
  });

  const result = (data as any)?.data;
  const isFound = result?.found;

  const handleSearch = (plate: string) => {
    const formatted = plate.trim().toUpperCase();
    if (!formatted) return;
    setPlateInput(formatted);
    setSearchedPlate(formatted);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top']}>
      {/* ─── Header ─── */}
      <LinearGradient
        colors={[theme.primary, theme.primaryDark || '#312E81'] as [string, string]}
        style={{
          paddingHorizontal: Spacing.lg,
          paddingTop: Spacing.md,
          paddingBottom: Spacing.lg,
          borderBottomLeftRadius: BorderRadius.xl,
          borderBottomRightRadius: BorderRadius.xl,
          ...Shadows.md,
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
          <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: Typography.fontSize.sm, fontWeight: '600' }}>
            Geri
          </Text>
        </TouchableOpacity>

        <Text style={{ fontSize: Typography.fontSize.xl, fontWeight: '800', color: '#fff' }}>
          🚗 Plaka & Araç Hafızası
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: Typography.fontSize.xs, marginTop: 2 }}>
          Aracın geçmiş servis kayıtlarını, takılan parçaları ve harcamalarını görün
        </Text>

        {/* ─── Türk Plaka Görünümlü Arama Kutusu ─── */}
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: '#fff',
            borderRadius: BorderRadius.md,
            marginTop: Spacing.md,
            overflow: 'hidden',
            borderWidth: 2,
            borderColor: '#CBD5E1',
            alignItems: 'center',
            height: 52,
            ...Shadows.sm,
          }}
        >
          {/* Mavi TR Şeridi */}
          <View
            style={{
              width: 44,
              backgroundColor: '#003399',
              height: '100%',
              justifyContent: 'center',
              alignItems: 'center',
              paddingVertical: 4,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>TR</Text>
            <Text style={{ fontSize: 8 }}>🇹🇷</Text>
          </View>

          {/* Plaka Input */}
          <TextInput
            style={{
              flex: 1,
              paddingHorizontal: Spacing.md,
              color: '#0F172A',
              fontSize: Typography.fontSize.lg,
              fontWeight: '900',
              letterSpacing: 2,
              textTransform: 'uppercase',
            }}
            placeholder="34 ABC 123"
            placeholderTextColor="#94A3B8"
            value={plateInput}
            onChangeText={v => setPlateInput(formatPlateTR(v))}
            onSubmitEditing={() => handleSearch(plateInput)}
            returnKeyType="search"
            autoCapitalize="characters"
            maxLength={11}
          />

          <TouchableOpacity
            style={{
              backgroundColor: theme.primary,
              height: '100%',
              paddingHorizontal: Spacing.lg,
              justifyContent: 'center',
              alignItems: 'center',
            }}
            onPress={() => handleSearch(plateInput)}
          >
            <Search size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Hızlı Plaka Örnekleri */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: Spacing.xs, marginTop: Spacing.sm }}
        >
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, alignSelf: 'center', marginRight: 4 }}>
            Hızlı:
          </Text>
          {SUGGESTED_PLATES.map(p => (
            <TouchableOpacity
              key={p}
              onPress={() => handleSearch(p)}
              style={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                paddingHorizontal: Spacing.sm,
                paddingVertical: 3,
                borderRadius: BorderRadius.full,
                borderWidth: 1,
                borderColor: searchedPlate === p ? '#fff' : 'rgba(255,255,255,0.3)',
              }}
            >
              <Text style={{ color: '#fff', fontSize: Typography.fontSize.xs, fontWeight: '700' }}>
                {p}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </LinearGradient>

      {/* ─── İçerik ─── */}
      <ScrollView
        contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={theme.primary} />}
      >
        {isLoading ? (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={{ color: theme.textMuted, fontSize: Typography.fontSize.xs, marginTop: Spacing.sm }}>
              Araç karnesi sorgulanıyor...
            </Text>
          </View>
        ) : isFound ? (
          <View>
            {/* ─── Araç & Müşteri Kartı ─── */}
            <View
              style={{
                backgroundColor: theme.surface,
                borderRadius: BorderRadius.xl,
                borderWidth: 1,
                borderColor: theme.border,
                padding: Spacing.lg,
                marginBottom: Spacing.lg,
                ...Shadows.sm,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  {/* Plaka Rozeti */}
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      borderWidth: 1.5,
                      borderColor: '#0F172A',
                      borderRadius: 6,
                      backgroundColor: '#fff',
                      alignSelf: 'flex-start',
                      marginBottom: 8,
                      overflow: 'hidden',
                    }}
                  >
                    <View style={{ backgroundColor: '#003399', paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>TR</Text>
                    </View>
                    <Text style={{ paddingHorizontal: 8, paddingVertical: 2, fontSize: Typography.fontSize.sm, fontWeight: '900', color: '#0F172A', letterSpacing: 1 }}>
                      {result.plate}
                    </Text>
                  </View>

                  <Text style={{ fontSize: Typography.fontSize.lg, fontWeight: '800', color: theme.textPrimary }}>
                    {result.vehicleInfo || result.plate}
                  </Text>
                  {result.customerName && (
                    <Text style={{ fontSize: Typography.fontSize.sm, color: theme.textSecondary, marginTop: 2 }}>
                      👤 {result.customerName}
                    </Text>
                  )}
                </View>

                {/* İletişim Butonları */}
                {result.customerPhone ? (
                  <View style={{ flexDirection: 'row', gap: Spacing.xs }}>
                    <TouchableOpacity
                      onPress={() => Linking.openURL(`tel:${result.customerPhone}`)}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: BorderRadius.full,
                        backgroundColor: theme.primary + '15',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <Phone size={16} color={theme.primary} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => openWhatsApp(result.customerPhone, `Selamlar ${result.customerName || 'Sayın Müşterimiz'}, ${result.plate} plakalı aracınız hakkında bilgi vermek istiyoruz.`)}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: BorderRadius.full,
                        backgroundColor: '#25D36620',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <MessageSquare size={16} color="#25D366" />
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>

              {/* Araç İstatistikleri */}
              <View
                style={{
                  flexDirection: 'row',
                  marginTop: Spacing.md,
                  paddingTop: Spacing.md,
                  borderTopWidth: 1,
                  borderTopColor: theme.borderLight || theme.border,
                  justifyContent: 'space-between',
                }}
              >
                <View style={{ alignItems: 'center', flex: 1 }}>
                  <Text style={{ fontSize: 10, color: theme.textMuted, fontWeight: '700' }}>SERVİS SAYISI</Text>
                  <Text style={{ fontSize: Typography.fontSize.lg, fontWeight: '800', color: theme.primary, marginTop: 2 }}>
                    {result.totalServices} kez
                  </Text>
                </View>

                <View style={{ width: 1, backgroundColor: theme.border }} />

                <View style={{ alignItems: 'center', flex: 1 }}>
                  <Text style={{ fontSize: 10, color: theme.textMuted, fontWeight: '700' }}>DEĞİŞEN PARÇA</Text>
                  <Text style={{ fontSize: Typography.fontSize.lg, fontWeight: '800', color: '#10B981', marginTop: 2 }}>
                    {result.allParts?.length || 0} adet
                  </Text>
                </View>

                <View style={{ width: 1, backgroundColor: theme.border }} />

                <View style={{ alignItems: 'center', flex: 1 }}>
                  <Text style={{ fontSize: 10, color: theme.textMuted, fontWeight: '700' }}>TOPLAM HARCAMA</Text>
                  <Text style={{ fontSize: Typography.fontSize.base, fontWeight: '800', color: theme.accent, marginTop: 2 }}>
                    ₺{result.totalSpent.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                  </Text>
                </View>
              </View>
            </View>

            {/* ─── Hızlı Eylem: Yeni İş Emri Aç ─── */}
            <TouchableOpacity
              style={{
                backgroundColor: theme.primary,
                borderRadius: BorderRadius.lg,
                padding: Spacing.md,
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                gap: Spacing.sm,
                marginBottom: Spacing.lg,
                ...Shadows.sm,
              }}
              onPress={() => {
                const parsed = parseVehicleInfo(result?.vehicleInfo, result?.plate || searchedPlate);
                router.push({
                  pathname: '/work-orders/create',
                  params: {
                    plate: parsed.plate || result?.plate || searchedPlate,
                    customerName: result?.customerName || '',
                    customerPhone: result?.customerPhone || '',
                    vehicleBrand: parsed.brand || '',
                    vehicleModel: parsed.model || '',
                    vehicleInfo: result?.vehicleInfo || '',
                    prefilled: 'true',
                  },
                } as any);
              }}
            >
              <Plus size={18} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: Typography.fontSize.sm }}>
                Bu Plakaya Yeni İş Emri Aç
              </Text>
            </TouchableOpacity>

            {/* ─── Sekmeler: İş Emirleri vs Takılan Parçalar ─── */}
            <View style={{ flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md }}>
              <TouchableOpacity
                onPress={() => setActiveTab('orders')}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: BorderRadius.lg,
                  backgroundColor: activeTab === 'orders' ? theme.primary : theme.surface,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: activeTab === 'orders' ? theme.primary : theme.border,
                }}
              >
                <Text style={{ fontWeight: '700', fontSize: Typography.fontSize.sm, color: activeTab === 'orders' ? '#fff' : theme.textSecondary }}>
                  📋 Geçmiş İş Emirleri ({result.orders?.length || 0})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveTab('parts')}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: BorderRadius.lg,
                  backgroundColor: activeTab === 'parts' ? theme.primary : theme.surface,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: activeTab === 'parts' ? theme.primary : theme.border,
                }}
              >
                <Text style={{ fontWeight: '700', fontSize: Typography.fontSize.sm, color: activeTab === 'parts' ? '#fff' : theme.textSecondary }}>
                  🔩 Takılan Parçalar ({result.allParts?.length || 0})
                </Text>
              </TouchableOpacity>
            </View>

            {/* ─── TAB 1: İş Emirleri Kronolojisi ─── */}
            {activeTab === 'orders' && (
              <View style={{ gap: Spacing.sm }}>
                {result.orders.map((order: any) => {
                  const statusInfo = STATUS_CONFIG[order.status] || { label: order.status, color: '#94A3B8' };
                  const dateStr = new Date(order.createdAt).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });

                  return (
                    <TouchableOpacity
                      key={order.id}
                      style={{
                        backgroundColor: theme.surface,
                        borderRadius: BorderRadius.lg,
                        borderWidth: 1,
                        borderColor: theme.border,
                        borderLeftWidth: 4,
                        borderLeftColor: statusInfo.color,
                        padding: Spacing.md,
                        ...Shadows.sm,
                      }}
                      onPress={() => router.push(`/work-orders/${order.id}` as any)}
                      activeOpacity={0.8}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                        <Text style={{ fontSize: Typography.fontSize.base, fontWeight: '700', color: theme.textPrimary, flex: 1, paddingRight: Spacing.sm }}>
                          {order.title}
                        </Text>
                        <View style={{ backgroundColor: statusInfo.color + '20', paddingHorizontal: 8, paddingVertical: 2, borderRadius: BorderRadius.full }}>
                          <Text style={{ color: statusInfo.color, fontSize: 10, fontWeight: '700' }}>
                            {statusInfo.label}
                          </Text>
                        </View>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 }}>
                        <Calendar size={12} color={theme.textMuted} />
                        <Text style={{ fontSize: Typography.fontSize.xs, color: theme.textMuted }}>{dateStr}</Text>
                        {order.user && (
                          <Text style={{ fontSize: Typography.fontSize.xs, color: theme.textMuted }}>
                            • Usta: {order.user.fullName}
                          </Text>
                        )}
                      </View>

                      {/* Değişen Parçalar Özeti */}
                      {order.items && order.items.length > 0 && (
                        <View style={{ backgroundColor: theme.surfaceElevated || theme.background, borderRadius: BorderRadius.sm, padding: Spacing.sm, marginBottom: 8 }}>
                          <Text style={{ fontSize: 10, fontWeight: '700', color: theme.textMuted, marginBottom: 4, textTransform: 'uppercase' }}>
                            Kullanılan Parçalar:
                          </Text>
                          {order.items.map((i: any) => (
                            <Text key={i.id} style={{ fontSize: Typography.fontSize.xs, color: theme.textPrimary }}>
                              • {i.part?.name} ({i.quantity} {i.part?.unit || 'adet'})
                            </Text>
                          ))}
                        </View>
                      )}

                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: theme.borderLight || theme.border, paddingTop: 6 }}>
                        <Text style={{ fontSize: Typography.fontSize.xs, color: theme.textMuted }}>
                          İşçilik: ₺{parseFloat(order.laborCost || 0).toLocaleString('tr-TR')}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Text style={{ fontSize: Typography.fontSize.xs, color: theme.primary, fontWeight: '700' }}>
                            Detayı Gör
                          </Text>
                          <ChevronRight size={14} color={theme.primary} />
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* ─── TAB 2: Takılan Tüm Parçalar Dökümü ─── */}
            {activeTab === 'parts' && (
              <View style={{ gap: Spacing.sm }}>
                {result.allParts.length === 0 ? (
                  <Text style={{ color: theme.textMuted, textAlign: 'center', paddingVertical: 20 }}>
                    Bu araca ait parça kaydı bulunamadı.
                  </Text>
                ) : (
                  result.allParts.map((p: any, idx: number) => {
                    const dateStr = new Date(p.date).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                    return (
                      <View
                        key={idx}
                        style={{
                          backgroundColor: theme.surface,
                          borderRadius: BorderRadius.md,
                          borderWidth: 1,
                          borderColor: theme.border,
                          padding: Spacing.md,
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <View style={{ flex: 1, paddingRight: Spacing.sm }}>
                          <Text style={{ fontSize: Typography.fontSize.sm, fontWeight: '700', color: theme.textPrimary }}>
                            {p.partName}
                          </Text>
                          <Text style={{ fontSize: Typography.fontSize.xs, color: theme.textMuted, marginTop: 2 }}>
                            {p.partBrand || p.partCategory || 'Yedek Parça'} • {dateStr}
                          </Text>
                          <Text style={{ fontSize: 10, color: theme.primary, marginTop: 2 }}>
                            İş Emri: {p.orderTitle}
                          </Text>
                        </View>

                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={{ fontSize: Typography.fontSize.sm, fontWeight: '800', color: theme.textPrimary }}>
                            {p.quantity} {p.unit}
                          </Text>
                          <Text style={{ fontSize: Typography.fontSize.xs, color: theme.success, fontWeight: '600' }}>
                            ₺{parseFloat(p.unitPrice || 0).toLocaleString('tr-TR')}
                          </Text>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            )}
          </View>
        ) : (
          <View style={{ alignItems: 'center', paddingVertical: 50 }}>
            <Text style={{ fontSize: 56, marginBottom: Spacing.md }}>🚗</Text>
            <Text style={{ fontSize: Typography.fontSize.lg, fontWeight: '800', color: theme.textPrimary, marginBottom: 4 }}>
              Kayıt Bulunamadı
            </Text>
            <Text style={{ fontSize: Typography.fontSize.sm, color: theme.textMuted, textAlign: 'center', paddingHorizontal: 40, marginBottom: Spacing.lg }}>
              "{searchedPlate}" plakasıyla daha önce açılmış herhangi bir iş emri bulunamadı.
            </Text>

            <TouchableOpacity
              style={{
                backgroundColor: theme.primary,
                paddingHorizontal: Spacing.xl,
                paddingVertical: 12,
                borderRadius: BorderRadius.full,
              }}
              onPress={() => {
                router.push({
                  pathname: '/work-orders/create',
                  params: {
                    plate: searchedPlate.trim().toUpperCase(),
                    prefilled: 'true',
                  },
                } as any);
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: Typography.fontSize.sm }}>
                ➕ Bu Plakaya İlk İş Emrini Aç
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
