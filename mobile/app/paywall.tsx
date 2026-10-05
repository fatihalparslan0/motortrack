import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Alert, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAppTheme } from '../src/hooks/useAppTheme';
import { useAuthStore } from '../src/store/auth.store';
import { useSubscriptionStore } from '../src/store/subscription.store';
import { PLANS, PlanDetails } from '../src/services/revenuecat.config';
import { Typography, Spacing, BorderRadius } from '../src/constants/theme';
import { Check, Crown, Sparkles, Shield, X } from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function PaywallScreen() {
  const { colors: theme, themeMode } = useAppTheme();
  const { isAuthenticated } = useAuthStore();
  const [selectedPlan, setSelectedPlan] = useState<string>('professional');
  const [purchasing, setPurchasing] = useState(false);

  const { currentOffering, purchase, restore, isLoading, fetchOfferings } = useSubscriptionStore();

  const dynamicStyles = useMemo(() => styles(theme), [theme]);

  useEffect(() => {
    fetchOfferings();
  }, []);

  const handleClose = () => {
    if (router.canGoBack()) {
      router.back();
    } else if (isAuthenticated) {
      router.replace('/(tabs)');
    } else {
      router.replace('/(auth)/login');
    }
  };

  const handlePurchase = async () => {
    if (!isAuthenticated) {
      Alert.alert(
        'Hesap Oluşturun 🚀',
        '3 günlük ücretsiz denemenizi başlatmak ve planınızı aktifleştirmek için lütfen kayıt olun.',
        [
          { text: 'Kayıt Ol', onPress: () => router.push('/(auth)/register' as any) },
          { text: 'Giriş Yap', onPress: () => router.push('/(auth)/login' as any) },
          { text: 'Vazgeç', style: 'cancel' },
        ]
      );
      return;
    }

    // RevenueCat offering'den paketi bul
    if (currentOffering) {
      const packages = currentOffering.availablePackages;
      const matchedPkg = packages.find((p) => {
        const id = p.identifier.toLowerCase();
        return id.includes(selectedPlan);
      }) || packages[0];

      if (matchedPkg) {
        setPurchasing(true);
        const result = await purchase(matchedPkg);
        setPurchasing(false);
        if (result.success) {
          Alert.alert('Başarılı! 🎉', 'Aboneliğiniz aktifleştirildi.', [
            { text: 'Devam Et', onPress: () => router.replace('/(tabs)') },
          ]);
        } else if (result.error) {
          Alert.alert('Hata', result.error);
        }
        return;
      }
    }

    // RevenueCat yapılandırılmamışsa demo akış
    Alert.alert(
      'Demo Mod',
      'RevenueCat API anahtarları yapılandırıldığında gerçek ödeme işlenecektir.\n\nŞimdilik deneme sürümüyle devam edebilirsiniz.',
      [
        { text: 'Denemeye Devam', onPress: () => router.replace('/(tabs)') },
        { text: 'Tamam', style: 'cancel' },
      ]
    );
  };

  const handleRestore = async () => {
    if (!isAuthenticated) {
      Alert.alert('Bilgi', 'Abonelik geri yüklemek için lütfen önce giriş yapın.');
      return;
    }
    setPurchasing(true);
    const result = await restore();
    setPurchasing(false);
    if (result.success) {
      Alert.alert('Başarılı!', 'Aboneliğiniz geri yüklendi.', [
        { text: 'Devam Et', onPress: () => router.replace('/(tabs)') },
      ]);
    } else {
      Alert.alert('Bilgi', 'Geri yüklenecek aktif abonelik bulunamadı.');
    }
  };

  const gradientColors = themeMode === 'light'
    ? ['#F8FAFC', '#EEF2FF', '#F8FAFC'] as [string, string, string]
    : ['#0F1117', '#1A1D27', '#0F1117'] as [string, string, string];

  const PlanCard = ({ plan, isSelected }: { plan: PlanDetails; isSelected: boolean }) => {
    const cardBg = isSelected
      ? themeMode === 'light' ? '#FFFFFF' : theme.surfaceElevated
      : theme.surface;

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => setSelectedPlan(plan.id)}
        style={[
          dynamicStyles.planCard,
          {
            backgroundColor: cardBg,
            borderColor: isSelected ? plan.color : theme.border,
            borderWidth: isSelected ? 2 : 1,
          },
        ]}
      >
        {/* Popüler badge */}
        {plan.popular && (
          <LinearGradient
            colors={[plan.color, `${plan.color}CC`]}
            style={dynamicStyles.popularBadge}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          >
            <Sparkles size={12} color="#fff" />
            <Text style={dynamicStyles.popularText}>En Popüler</Text>
          </LinearGradient>
        )}

        {/* Plan header */}
        <View style={dynamicStyles.planHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[dynamicStyles.planName, { color: theme.textPrimary }]}>
              {plan.name}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 4 }}>
              <Text style={[dynamicStyles.planPrice, { color: plan.color }]}>
                {plan.price}
              </Text>
              <Text style={[dynamicStyles.planPeriod, { color: theme.textMuted }]}>
                {plan.period}
              </Text>
            </View>
          </View>

          {/* Radio button */}
          <View style={[
            dynamicStyles.radioOuter,
            { borderColor: isSelected ? plan.color : theme.border }
          ]}>
            {isSelected && (
              <View style={[dynamicStyles.radioInner, { backgroundColor: plan.color }]} />
            )}
          </View>
        </View>

        {/* Limitler */}
        <View style={[dynamicStyles.limitsRow, { borderTopColor: theme.border }]}>
          <View style={dynamicStyles.limitItem}>
            <Text style={[dynamicStyles.limitValue, { color: theme.textPrimary }]}>
              {plan.maxMotors ?? '∞'}
            </Text>
            <Text style={[dynamicStyles.limitLabel, { color: theme.textMuted }]}>Motor</Text>
          </View>
          <View style={[dynamicStyles.limitDivider, { backgroundColor: theme.border }]} />
          <View style={dynamicStyles.limitItem}>
            <Text style={[dynamicStyles.limitValue, { color: theme.textPrimary }]}>
              {plan.maxUsers ?? '∞'}
            </Text>
            <Text style={[dynamicStyles.limitLabel, { color: theme.textMuted }]}>Kullanıcı</Text>
          </View>
        </View>

        {/* Features (sadece seçili plana göster) */}
        {isSelected && (
          <View style={dynamicStyles.featuresContainer}>
            {plan.features.map((feature, i) => (
              <View key={i} style={dynamicStyles.featureRow}>
                <View style={[dynamicStyles.checkCircle, { backgroundColor: `${plan.color}20` }]}>
                  <Check size={12} color={plan.color} strokeWidth={3} />
                </View>
                <Text style={[dynamicStyles.featureText, { color: theme.textSecondary }]}>
                  {feature}
                </Text>
              </View>
            ))}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <LinearGradient colors={gradientColors} style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={dynamicStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={dynamicStyles.header}>
          <TouchableOpacity
            style={dynamicStyles.skipBtn}
            onPress={handleClose}
          >
            <X size={20} color={theme.textMuted} />
          </TouchableOpacity>

          <LinearGradient
            colors={['#6366F1', '#818CF8']}
            style={dynamicStyles.crownContainer}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          >
            <Crown size={32} color="#fff" />
          </LinearGradient>

          <Text style={[dynamicStyles.headerTitle, { color: theme.textPrimary }]}>
            Planınızı Seçin
          </Text>
          <Text style={[dynamicStyles.headerSubtitle, { color: theme.textSecondary }]}>
            3 gün ücretsiz deneyin, istediğiniz zaman iptal edin
          </Text>

          {/* Güven badge'leri */}
          <View style={dynamicStyles.trustBadges}>
            <View style={[dynamicStyles.trustBadge, { backgroundColor: `${theme.success}15` }]}>
              <Shield size={14} color={theme.success} />
              <Text style={[dynamicStyles.trustText, { color: theme.success }]}>
                Güvenli Ödeme
              </Text>
            </View>
            <View style={[dynamicStyles.trustBadge, { backgroundColor: '#6366F115' }]}>
              <Text style={[dynamicStyles.trustText, { color: '#6366F1' }]}>
                İstediğiniz zaman iptal
              </Text>
            </View>
          </View>
        </View>

        {/* Plan kartları */}
        <View style={dynamicStyles.plansContainer}>
          {PLANS.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isSelected={selectedPlan === plan.id}
            />
          ))}
        </View>

        {/* Satın al butonu */}
        <View style={dynamicStyles.bottomSection}>
          <TouchableOpacity
            style={dynamicStyles.purchaseBtn}
            onPress={handlePurchase}
            disabled={purchasing}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#6366F1', '#4F46E5']}
              style={dynamicStyles.purchaseBtnGradient}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            >
              {purchasing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={dynamicStyles.purchaseBtnText}>
                    3 Gün Ücretsiz Dene
                  </Text>
                  <Text style={dynamicStyles.purchaseBtnSub}>
                    Sonra {PLANS.find(p => p.id === selectedPlan)?.price}{PLANS.find(p => p.id === selectedPlan)?.period}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Satın alma geri yükle */}
          <TouchableOpacity
            style={dynamicStyles.restoreBtn}
            onPress={handleRestore}
          >
            <Text style={[dynamicStyles.restoreText, { color: theme.textMuted }]}>
              Satın alımları geri yükle
            </Text>
          </TouchableOpacity>

          {/* Yasal bilgi */}
          <Text style={[dynamicStyles.legalText, { color: theme.textMuted }]}>
            Abonelik, seçtiğiniz plana göre otomatik olarak yenilenir.{' '}
            İstediğiniz zaman App Store / Google Play ayarlarından iptal edebilirsiniz.{'\n'}
            <Text style={{ color: theme.primary }}>Kullanım Koşulları</Text>
            {' '}ve{' '}
            <Text style={{ color: theme.primary }}>Gizlilik Politikası</Text>
          </Text>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = (theme: any) => StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },

  // Header
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  skipBtn: {
    position: 'absolute',
    top: 56,
    right: Spacing.lg,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${theme.textMuted}15`,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  crownContainer: {
    width: 72,
    height: 72,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  headerTitle: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: Typography.fontSize.sm,
    marginTop: 6,
    textAlign: 'center',
  },
  trustBadges: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  trustText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Plans
  plansContainer: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  planCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    overflow: 'hidden',
  },
  popularBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.sm,
  },
  popularText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  planName: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '700',
  },
  planPrice: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: '800',
  },
  planPeriod: {
    fontSize: Typography.fontSize.sm,
    marginLeft: 2,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },

  // Limits
  limitsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
  },
  limitItem: {
    flex: 1,
    alignItems: 'center',
  },
  limitValue: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '700',
  },
  limitLabel: {
    fontSize: Typography.fontSize.xs,
    marginTop: 2,
  },
  limitDivider: {
    width: 1,
    height: 30,
  },

  // Features
  featuresContainer: {
    marginTop: Spacing.md,
    gap: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    fontSize: Typography.fontSize.sm,
    flex: 1,
  },

  // Bottom
  bottomSection: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
  },
  purchaseBtn: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  purchaseBtnGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  purchaseBtnText: {
    color: '#fff',
    fontSize: Typography.fontSize.md,
    fontWeight: '800',
  },
  purchaseBtnSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: Typography.fontSize.xs,
    marginTop: 2,
  },
  restoreBtn: {
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  restoreText: {
    fontSize: Typography.fontSize.sm,
    textDecorationLine: 'underline',
  },
  legalText: {
    fontSize: 10,
    textAlign: 'center',
    marginTop: Spacing.md,
    lineHeight: 15,
    paddingHorizontal: Spacing.md,
  },
});
