import React, { useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { warehouseAPI, supplierAPI } from '../../src/api/client';
import { Typography, Spacing, BorderRadius, Shadows } from '../../src/constants/theme';
import { useAppTheme } from '../../src/hooks/useAppTheme';
import { AlertTriangle, ChevronRight, MessageSquare } from 'lucide-react-native';
import { openWhatsApp, generateBatchOrderMessage } from '../../src/utils/whatsapp';

export default function CriticalStockScreen() {
  const { colors: theme } = useAppTheme();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['criticalStockFull'],
    queryFn: () => warehouseAPI.getCriticalStock(),
  });

  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => supplierAPI.getAll(),
  });
  const suppliers: any[] = (suppliersData as any)?.data || [];

  const parts: any[] = (data as any)?.data || [];

  const handleBatchOrder = () => {
    if (parts.length === 0) {
      Alert.alert('Bilgi', 'Kritik seviyede parça bulunmuyor.');
      return;
    }
    if (!suppliers || suppliers.length === 0) {
      Alert.alert(
        'Tedarikçi Bulunamadı',
        'Kayıtlı yedek parçacı bulunmuyor. Depo > Tedarikçiler bölümünden parça toptancısı ekleyebilirsiniz.'
      );
      return;
    }

    if (suppliers.length === 1) {
      const s = suppliers[0];
      const msg = generateBatchOrderMessage(parts);
      openWhatsApp(s.phone, msg);
      return;
    }

    Alert.alert(
      '📲 Parçacıya Toplu Sipariş (WhatsApp)',
      `Kritik ${parts.length} parça için hangi tedarikçiye WhatsApp siparişi göndermek istersiniz?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        ...suppliers.slice(0, 6).map((s: any) => ({
          text: `🏭 ${s.name}`,
          onPress: () => {
            const msg = generateBatchOrderMessage(parts);
            openWhatsApp(s.phone, msg);
          },
        })),
      ]
    );
  };

  const getStockLevel = (qty: number, min: number) => {
    if (qty === 0) return { label: 'Tükendi', color: '#7F1D1D', bg: '#FEE2E2' };
    if (qty < min * 0.5) return { label: 'Kritik', color: '#EF4444', bg: '#FEE2E2' };
    return { label: 'Az', color: '#F59E0B', bg: '#FEF3C7' };
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top']}>
      <LinearGradient
        colors={['#EF4444CC', '#DC2626EE'] as [string, string]}
        style={{ padding: Spacing.lg, borderBottomLeftRadius: BorderRadius.xl, borderBottomRightRadius: BorderRadius.xl, marginBottom: Spacing.md, ...Shadows.sm }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: 'rgba(255,255,255,0.8)', marginBottom: 4 }}>← Geri</Text>
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: Typography.fontSize.xl, fontWeight: '800', color: '#fff' }}>⚠️ Kritik Stok</Text>
            <Text style={{ color: 'rgba(255,255,255,0.85)', marginTop: 2, fontSize: Typography.fontSize.xs }}>
              {parts.length} ürün minimum stok sınırının altında
            </Text>
          </View>
          <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' }}>
            <AlertTriangle size={26} color="#fff" />
          </View>
        </View>

        {parts.length > 0 && (
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              backgroundColor: '#10B981',
              paddingVertical: 11,
              paddingHorizontal: Spacing.md,
              borderRadius: BorderRadius.md,
              marginTop: Spacing.md,
              ...Shadows.sm,
            }}
            onPress={handleBatchOrder}
            activeOpacity={0.85}
          >
            <MessageSquare size={18} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: Typography.fontSize.sm }}>
              Parçacıya WhatsApp İle Sipariş Geç
            </Text>
          </TouchableOpacity>
        )}
      </LinearGradient>

      {isLoading ? (
        <ActivityIndicator size="large" color="#EF4444" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={parts}
          keyExtractor={i => i.id}
          contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: 80, gap: Spacing.sm }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#EF4444" />}
          renderItem={({ item }) => {
            const level = getStockLevel(item.quantity, item.minQuantity);
            const percentage = item.minQuantity > 0
              ? Math.min(100, Math.round((item.quantity / item.minQuantity) * 100))
              : 0;
            return (
              <TouchableOpacity
                style={{ backgroundColor: theme.surface, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: theme.border, overflow: 'hidden', ...Shadows.sm }}
                onPress={() => router.push(`/parts/${item.id}` as any)}
              >
                <View style={{ height: 4, backgroundColor: theme.border }}>
                  <View style={{ height: 4, width: `${percentage}%`, backgroundColor: level.color }} />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.sm }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: Typography.fontSize.base, fontWeight: '700', color: theme.textPrimary }}>{item.name}</Text>
                    {item.brand && <Text style={{ color: theme.textMuted, fontSize: Typography.fontSize.xs }}>{item.brand}</Text>}
                    {item.category && <Text style={{ color: theme.textMuted, fontSize: Typography.fontSize.xs }}>{item.category}</Text>}
                    {item.warehouseStocks && item.warehouseStocks.length > 0 && (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                        {item.warehouseStocks.filter((ws: any) => ws.quantity > 0).map((ws: any) => (
                          <View key={ws.id} style={{ backgroundColor: theme.surfaceElevated, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                            <Text style={{ fontSize: 10, color: theme.textSecondary }}>
                              <Text style={{ fontWeight: '600' }}>{ws.warehouse?.name || 'Depo'}:</Text> {ws.quantity}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <View style={{ backgroundColor: level.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full, marginBottom: 4 }}>
                      <Text style={{ color: level.color, fontWeight: '800', fontSize: Typography.fontSize.lg }}>
                        {item.quantity}
                      </Text>
                    </View>
                    <Text style={{ color: theme.textMuted, fontSize: Typography.fontSize.xs }}>/ min {item.minQuantity} {item.unit}</Text>
                    <View style={{ backgroundColor: level.bg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: BorderRadius.full, marginTop: 4 }}>
                      <Text style={{ color: level.color, fontSize: 10, fontWeight: '700' }}>{level.label}</Text>
                    </View>
                  </View>
                  <ChevronRight size={16} color={theme.textMuted} />
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Text style={{ fontSize: 64, marginBottom: Spacing.md }}>✅</Text>
              <Text style={{ fontSize: Typography.fontSize.lg, fontWeight: '700', color: theme.textPrimary }}>Kritik stok yok!</Text>
              <Text style={{ color: theme.textMuted, marginTop: 4 }}>Tüm ürünler yeterli stokta.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
