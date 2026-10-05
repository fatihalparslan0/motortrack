import { Platform } from 'react-native';

// RevenueCat API anahtarlarınızı buraya girin
// RevenueCat Dashboard → Project → API Keys
const REVENUECAT_API_KEYS = {
  apple: 'appl_YOUR_REVENUECAT_IOS_API_KEY',
  google: 'goog_YOUR_REVENUECAT_ANDROID_API_KEY',
};

// RevenueCat'te tanımladığınız Entitlement ID
export const ENTITLEMENT_ID = 'pro';

// RevenueCat'te tanımladığınız paket (offering) ID'leri
export const PACKAGE_IDENTIFIERS = {
  STARTER: '$rc_monthly',       // Başlangıç aylık
  PROFESSIONAL: 'professional', // Profesyonel aylık
  ENTERPRISE: 'enterprise',     // İşletme aylık
} as const;

// Paket detayları (UI için)
export interface PlanDetails {
  id: string;
  name: string;
  price: string;
  priceValue: number;
  period: string;
  features: string[];
  color: string;
  popular?: boolean;
  maxMotors: number | null;
  maxUsers: number | null;
}

export const PLANS: PlanDetails[] = [
  {
    id: 'starter',
    name: 'Başlangıç',
    price: '₺299',
    priceValue: 299,
    period: '/ay',
    maxMotors: 10,
    maxUsers: 3,
    color: '#6366F1',
    features: [
      '10 motor kaydı',
      '3 kullanıcı',
      'Stok & parça yönetimi',
      'İş emri takibi',
      'Temel raporlama',
      'QR kod tarama',
    ],
  },
  {
    id: 'professional',
    name: 'Profesyonel',
    price: '₺699',
    priceValue: 699,
    period: '/ay',
    maxMotors: 50,
    maxUsers: 10,
    color: '#10B981',
    popular: true,
    features: [
      '50 motor kaydı',
      '10 kullanıcı',
      'Gelişmiş analitik & grafikler',
      'Çoklu depo yönetimi',
      'Tedarikçi & cari takibi',
      'Kasa & Z-raporu',
      'Fotoğraflı iş emri',
      'E-posta bildirimleri',
    ],
  },
  {
    id: 'enterprise',
    name: 'İşletme',
    price: '₺1.499',
    priceValue: 1499,
    period: '/ay',
    maxMotors: null,
    maxUsers: null,
    color: '#F59E0B',
    features: [
      'Sınırsız motor kaydı',
      'Sınırsız kullanıcı',
      'Tüm Profesyonel özellikler',
      'Öncelikli teknik destek',
      'API erişimi',
      'Özel entegrasyonlar',
      'Çoklu şube yönetimi',
      'Beyaz etiket desteği',
    ],
  },
];

/**
 * RevenueCat API Key'ini platform bazında döndürür
 */
export function getRevenueCatApiKey(): string {
  return Platform.OS === 'ios'
    ? REVENUECAT_API_KEYS.apple
    : REVENUECAT_API_KEYS.google;
}

/**
 * RevenueCat'i initialize etmek için gerekli konfigürasyon
 */
export const REVENUECAT_CONFIG = {
  apiKey: getRevenueCatApiKey(),
  entitlementId: ENTITLEMENT_ID,
  trialDays: 3,
};
