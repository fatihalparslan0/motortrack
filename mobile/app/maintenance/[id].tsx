import React, { useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { maintenanceAPI } from '../../src/api/client';
import { Typography, Spacing, BorderRadius, Shadows } from '../../src/constants/theme';
import { useAppTheme } from '../../src/hooks/useAppTheme';

const TYPE_CONFIG: Record<string, { label: string; emoji: string }> = {
  PREVENTIVE: { label: 'Önleyici', emoji: '🛡️' },
  CORRECTIVE: { label: 'Düzeltici', emoji: '🔧' },
  INSPECTION: { label: 'Muayene', emoji: '🔍' },
  EMERGENCY: { label: 'Acil', emoji: '🚨' },
  OTHER: { label: 'Diğer', emoji: '📝' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PLANNED: { label: 'Planlı', color: '#4F46E5' }, // will override with theme
  IN_PROGRESS: { label: 'Devam Ediyor', color: '#F59E0B' },
  COMPLETED: { label: 'Tamamlandı', color: '#10B981' },
  CANCELLED: { label: 'İptal', color: '#6B7280' },
};

export default function MaintenanceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  
  const { colors: theme } = useAppTheme();
  const dynamicStyles = useMemo(() => styles(theme), [theme]);

  // Update status colors with actual theme colors
  STATUS_CONFIG.PLANNED.color = theme.primary;
  STATUS_CONFIG.IN_PROGRESS.color = theme.warning;
  STATUS_CONFIG.COMPLETED.color = theme.success;
  STATUS_CONFIG.CANCELLED.color = theme.textMuted;

  const { data, isLoading } = useQuery({
    queryKey: ['maintenance', id],
    queryFn: () => maintenanceAPI.getById(id),
  });

  const deleteMutation = useMutation({
    mutationFn: () => maintenanceAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      queryClient.invalidateQueries({ queryKey: ['upcomingMaintenance'] });
      router.back();
    },
  });

  const record: any = (data as any)?.data;

  const handleDelete = () => {
    Alert.alert(
      'Kaydı Sil',
      `Bu tamir kaydını silmek istediğinize emin misiniz?`,
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
      <View style={dynamicStyles.loading}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!record) {
    return (
      <View style={dynamicStyles.loading}>
        <Text style={dynamicStyles.errorText}>Kayıt bulunamadı.</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: theme.primary, marginTop: 16 }}>Geri Dön</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const type = TYPE_CONFIG[record.maintenanceType] || TYPE_CONFIG.OTHER;
  const status = STATUS_CONFIG[record.status] || STATUS_CONFIG.COMPLETED;

  return (
    <SafeAreaView style={dynamicStyles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient colors={['#1A1D27', '#0F1117']} style={dynamicStyles.header}>
          <TouchableOpacity style={dynamicStyles.backBtn} onPress={() => router.back()}>
            <Text style={dynamicStyles.backText}>← Geri</Text>
          </TouchableOpacity>
          <View style={dynamicStyles.headerActions}>
            <TouchableOpacity
              style={dynamicStyles.actionBtn}
              onPress={() => router.push(`/maintenance/edit?id=${id}` as any)}
            >
              <Text style={dynamicStyles.actionBtnText}>✏️ Düzenle</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[dynamicStyles.actionBtn, dynamicStyles.deleteBtn]} onPress={handleDelete}>
              <Text style={[dynamicStyles.actionBtnText, { color: theme.danger }]}>🗑️ Sil</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Maintenance Card */}
        <View style={dynamicStyles.partCard}>
          <View style={dynamicStyles.partIconLarge}>
            <Text style={dynamicStyles.partIconText}>{type.emoji}</Text>
          </View>
          <Text style={dynamicStyles.partName}>{record.title}</Text>
          <View style={[dynamicStyles.statusBadge, { backgroundColor: status.color + '20', borderColor: status.color + '40' }]}>
            <Text style={[dynamicStyles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>

        {/* Details */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>Detaylar</Text>
          <View style={dynamicStyles.detailsCard}>
            {[
              { label: 'Müşteri', value: record.customerInfo },
              { label: 'Araç Bilgisi', value: record.vehicleInfo },
              { label: 'Alınan Tarih', value: new Date(record.performedAt).toLocaleDateString('tr-TR') },
              { label: 'Teslim Edilecek Tarih', value: record.nextMaintenanceDate ? new Date(record.nextMaintenanceDate).toLocaleDateString('tr-TR') : '—' },
              { label: 'Maliyet', value: record.cost ? `₺${parseFloat(record.cost).toLocaleString('tr-TR')}` : '—' },
            ].map((item, i) => (
              <View key={i} style={[dynamicStyles.detailRow, i > 0 && dynamicStyles.detailRowBorder]}>
                <Text style={dynamicStyles.detailLabel}>{item.label}</Text>
                <Text style={dynamicStyles.detailValue}>{item.value || '—'}</Text>
              </View>
            ))}
            {record.description && (
              <View style={[dynamicStyles.detailRow, dynamicStyles.detailRowBorder]}>
                <Text style={dynamicStyles.detailLabel}>Açıklama</Text>
                <Text style={[dynamicStyles.detailValue, { flex: 1, textAlign: 'right', fontStyle: 'italic', color: theme.textSecondary }]}>
                  {record.description}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Technician */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>Sisteme Giren</Text>
          <View style={dynamicStyles.detailsCard}>
            <View style={dynamicStyles.detailRow}>
              <Text style={dynamicStyles.detailLabel}>Teknisyen</Text>
              <Text style={dynamicStyles.detailValue}>{record.user?.fullName}</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background },
  errorText: { color: theme.textSecondary, fontSize: Typography.fontSize.base },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg },
  backBtn: {}, backText: { color: theme.primary, fontSize: Typography.fontSize.base },
  headerActions: { flexDirection: 'row', gap: Spacing.sm },
  actionBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, backgroundColor: theme.surface, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: theme.border },
  deleteBtn: { borderColor: theme.danger + '40' },
  actionBtnText: { color: theme.textSecondary, fontSize: Typography.fontSize.sm },
  partCard: { alignItems: 'center', padding: Spacing.xl, borderBottomWidth: 1, borderBottomColor: theme.border },
  partIconLarge: { width: 80, height: 80, backgroundColor: theme.surfaceElevated, borderRadius: BorderRadius.xl, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md, ...Shadows.md },
  partIconText: { fontSize: 40 },
  partName: { fontSize: Typography.fontSize['2xl'], fontWeight: '800', color: theme.textPrimary, textAlign: 'center', marginBottom: Spacing.sm },
  statusBadge: { paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: BorderRadius.full, borderWidth: 1 },
  statusText: { fontSize: Typography.fontSize.sm, fontWeight: '700' },
  section: { padding: Spacing.lg, paddingBottom: 0 },
  sectionTitle: { fontSize: Typography.fontSize.base, fontWeight: '700', color: theme.textPrimary, marginBottom: Spacing.md },
  detailsCard: { backgroundColor: theme.surface, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: theme.border, overflow: 'hidden' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', padding: Spacing.md },
  detailRowBorder: { borderTopWidth: 1, borderTopColor: theme.border },
  detailLabel: { color: theme.textSecondary, fontSize: Typography.fontSize.sm },
  detailValue: { color: theme.textPrimary, fontSize: Typography.fontSize.sm, fontWeight: '600' },
});
