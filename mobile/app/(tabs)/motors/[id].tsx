import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { motorsAPI, maintenanceAPI } from '../../../src/api/client';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../../src/constants/theme';

const STATUS_CONFIG: Record<string, { label: string; color: string; emoji: string }> = {
  ACTIVE: { label: 'Aktif', color: Colors.success, emoji: '✅' },
  MAINTENANCE: { label: 'Bakımda', color: Colors.warning, emoji: '🔧' },
  RETIRED: { label: 'Emekli', color: Colors.textMuted, emoji: '📦' },
  SOLD: { label: 'Satıldı', color: Colors.primary, emoji: '💰' },
};

export default function MotorDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['motor', id],
    queryFn: () => motorsAPI.getById(id),
  });

  const { data: maintenanceData } = useQuery({
    queryKey: ['motorMaintenance', id],
    queryFn: () => motorsAPI.getMaintenance(id, { limit: 5 }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => motorsAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['motors'] });
      router.back();
    },
  });

  const motor: any = (data as any)?.data;
  const maintenance: any[] = (maintenanceData as any)?.data || [];
  const status = motor ? STATUS_CONFIG[motor.status] || STATUS_CONFIG.ACTIVE : null;

  const handleDelete = () => {
    Alert.alert(
      'Motoru Sil',
      `"${motor?.brand} ${motor?.model}" motorunu silmek istediğinize emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil', style: 'destructive',
          onPress: () => deleteMutation.mutate(),
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!motor) {
    return (
      <View style={styles.loading}>
        <Text style={styles.errorText}>Motor bulunamadı.</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: Colors.primary, marginTop: 16 }}>Geri Dön</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient colors={['#1A1D27', '#0F1117']} style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backText}>← Geri</Text>
          </TouchableOpacity>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => router.push(`/(tabs)/motors/edit?id=${id}` as any)}
            >
              <Text style={styles.actionBtnText}>✏️ Düzenle</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={handleDelete}>
              <Text style={[styles.actionBtnText, { color: Colors.danger }]}>🗑️</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Motor Kartı */}
        <View style={styles.motorCard}>
          <View style={styles.motorIconLarge}>
            <Text style={styles.motorIconText}>⚙️</Text>
          </View>
          <Text style={styles.motorName}>{motor.brand} {motor.model}</Text>
          <Text style={styles.serialNumber}>Seri No: {motor.serialNumber}</Text>
          <View style={[styles.statusBadge, { backgroundColor: status!.color + '20', borderColor: status!.color + '40' }]}>
            <Text style={[styles.statusText, { color: status!.color }]}>
              {status!.emoji} {status!.label}
            </Text>
          </View>
        </View>

        {/* Detay Bilgiler */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detaylar</Text>
          <View style={styles.detailsCard}>
            {[
              { label: 'Marka', value: motor.brand },
              { label: 'Model', value: motor.model },
              { label: 'Tür', value: motor.motorType },
              { label: 'Üretim Yılı', value: motor.manufactureYear },
              { label: 'Konum', value: motor.location || '—' },
              { label: 'Satın Alma', value: motor.purchaseDate ? new Date(motor.purchaseDate).toLocaleDateString('tr-TR') : '—' },
            ].map((item, i) => (
              <View key={i} style={[styles.detailRow, i > 0 && styles.detailRowBorder]}>
                <Text style={styles.detailLabel}>{item.label}</Text>
                <Text style={styles.detailValue}>{item.value || '—'}</Text>
              </View>
            ))}
            {motor.notes && (
              <View style={[styles.detailRow, styles.detailRowBorder]}>
                <Text style={styles.detailLabel}>Notlar</Text>
                <Text style={[styles.detailValue, { flex: 1, textAlign: 'right' }]}>{motor.notes}</Text>
              </View>
            )}
          </View>
        </View>

        {/* İstatistikler */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{motor._count?.parts || 0}</Text>
            <Text style={styles.statLbl}>Parça</Text>
          </View>
          <View style={[styles.statBox, { borderLeftWidth: 1, borderRightWidth: 1, borderColor: Colors.border }]}>
            <Text style={styles.statNum}>{motor._count?.maintenanceRecords || 0}</Text>
            <Text style={styles.statLbl}>Bakım</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>
              {motor.purchaseDate ? `${new Date().getFullYear() - new Date(motor.purchaseDate).getFullYear()} yıl` : '—'}
            </Text>
            <Text style={styles.statLbl}>Yaş</Text>
          </View>
        </View>

        {/* Hızlı Eylemler */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>İşlemler</Text>
          <View style={styles.actionsGrid}>
            {[
              { emoji: '🔩', label: 'Parçalar', onPress: () => router.push(`/(tabs)/parts/index?motorId=${id}` as any) },
              { emoji: '🛠️', label: 'Bakım Ekle', onPress: () => router.push(`/(tabs)/maintenance/create?motorId=${id}` as any) },
              { emoji: '📢', label: 'İlan Aç', onPress: () => router.push(`/(tabs)/marketplace/create?motorId=${id}` as any) },
              { emoji: '📷', label: 'QR Kod', onPress: () => Alert.alert('QR Kod', motor.qrCode || 'QR kod yok') },
            ].map((a) => (
              <TouchableOpacity key={a.label} style={styles.actionCard} onPress={a.onPress} activeOpacity={0.8}>
                <Text style={styles.actionEmoji}>{a.emoji}</Text>
                <Text style={styles.actionLabel}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Son Bakımlar */}
        {maintenance.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Son Bakımlar</Text>
              <TouchableOpacity onPress={() => router.push(`/(tabs)/maintenance/index?motorId=${id}` as any)}>
                <Text style={styles.seeAll}>Tümü →</Text>
              </TouchableOpacity>
            </View>
            {maintenance.map((m: any) => (
              <View key={m.id} style={styles.maintenanceItem}>
                <Text style={styles.maintTitle}>{m.title}</Text>
                <Text style={styles.maintDate}>
                  {new Date(m.performedAt).toLocaleDateString('tr-TR')} — {m.user?.fullName}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  errorText: { color: Colors.textSecondary, fontSize: Typography.fontSize.base },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg },
  backBtn: {}, backText: { color: Colors.primary, fontSize: Typography.fontSize.base },
  headerActions: { flexDirection: 'row', gap: Spacing.sm },
  actionBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border },
  deleteBtn: { borderColor: Colors.danger + '40' },
  actionBtnText: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm },
  motorCard: { alignItems: 'center', padding: Spacing.xl, borderBottomWidth: 1, borderBottomColor: Colors.border },
  motorIconLarge: { width: 100, height: 100, backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.xl, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md, ...Shadows.md },
  motorIconText: { fontSize: 50 },
  motorName: { fontSize: Typography.fontSize['2xl'], fontWeight: '800', color: Colors.textPrimary, textAlign: 'center' },
  serialNumber: { fontSize: Typography.fontSize.sm, color: Colors.textMuted, marginTop: 4, marginBottom: Spacing.md },
  statusBadge: { paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: BorderRadius.full, borderWidth: 1 },
  statusText: { fontSize: Typography.fontSize.sm, fontWeight: '700' },
  section: { padding: Spacing.lg, paddingBottom: 0 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  sectionTitle: { fontSize: Typography.fontSize.base, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.md },
  seeAll: { color: Colors.primary, fontSize: Typography.fontSize.sm },
  detailsCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', padding: Spacing.md },
  detailRowBorder: { borderTopWidth: 1, borderTopColor: Colors.border },
  detailLabel: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm },
  detailValue: { color: Colors.textPrimary, fontSize: Typography.fontSize.sm, fontWeight: '600' },
  statsRow: { flexDirection: 'row', marginHorizontal: Spacing.lg, marginVertical: Spacing.lg, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md },
  statNum: { fontSize: Typography.fontSize.xl, fontWeight: '800', color: Colors.textPrimary },
  statLbl: { fontSize: Typography.fontSize.xs, color: Colors.textMuted, marginTop: 2 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  actionCard: { flex: 1, minWidth: '45%', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  actionEmoji: { fontSize: 28, marginBottom: 6 },
  actionLabel: { color: Colors.textSecondary, fontSize: Typography.fontSize.xs },
  maintenanceItem: { backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  maintTitle: { color: Colors.textPrimary, fontWeight: '600', fontSize: Typography.fontSize.sm },
  maintDate: { color: Colors.textMuted, fontSize: Typography.fontSize.xs, marginTop: 2 },
});
