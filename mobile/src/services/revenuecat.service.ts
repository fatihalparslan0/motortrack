import { Platform } from 'react-native';
import Purchases, {
  PurchasesOffering,
  PurchasesPackage,
  CustomerInfo,
  LOG_LEVEL,
} from 'react-native-purchases';
import { getRevenueCatApiKey, ENTITLEMENT_ID } from './revenuecat.config';

let isConfigured = false;

/**
 * RevenueCat native modülünün ortamda mevcut olup olmadığını kontrol eder.
 * Web veya standart Expo Go'da native modül bulunmayabilir.
 */
function isPurchasesSupported(): boolean {
  if (Platform.OS === 'web') return false;
  try {
    return !!Purchases && typeof Purchases.configure === 'function';
  } catch {
    return false;
  }
}

/**
 * RevenueCat SDK'yı başlatır.
 * App açılışında bir kez çağrılmalıdır.
 */
export async function initRevenueCat(userId?: string): Promise<void> {
  if (!isPurchasesSupported()) {
    console.log('ℹ️ RevenueCat: Native modül bu ortamda (Web veya Expo Go) mevcut değil. Demo modunda çalışılacak.');
    return;
  }

  if (isConfigured) return;

  try {
    const apiKey = getRevenueCatApiKey();

    if (__DEV__ && LOG_LEVEL?.DEBUG !== undefined) {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    }

    Purchases.configure({
      apiKey,
      appUserID: userId || undefined,
    });

    isConfigured = true;
    console.log('✅ RevenueCat başarıyla yapılandırıldı');
  } catch (error) {
    console.warn('RevenueCat yapılandırma uyarısı:', error);
  }
}

/**
 * Kullanıcıyı RevenueCat'e login eder
 */
export async function loginRevenueCat(userId: string): Promise<CustomerInfo | null> {
  if (!isPurchasesSupported() || !isConfigured) return null;
  try {
    const { customerInfo } = await Purchases.logIn(userId);
    return customerInfo;
  } catch (error) {
    console.warn('RevenueCat login hatası:', error);
    return null;
  }
}

/**
 * Kullanıcıyı RevenueCat'ten logout eder
 */
export async function logoutRevenueCat(): Promise<void> {
  if (!isPurchasesSupported() || !isConfigured) return;
  try {
    await Purchases.logOut();
  } catch (error) {
    console.warn('RevenueCat logout hatası:', error);
  }
}

/**
 * Mevcut müşteri bilgilerini alır
 */
export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  if (!isPurchasesSupported() || !isConfigured) return null;
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo;
  } catch (error) {
    console.warn('CustomerInfo hatası:', error);
    return null;
  }
}

/**
 * Kullanıcının aktif bir pro erişim hakkı olup olmadığını kontrol eder
 */
export function checkEntitlement(customerInfo: CustomerInfo | null): boolean {
  if (!customerInfo || !customerInfo.entitlements?.active) return false;
  return customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
}

/**
 * Mevcut teklifleri (offerings) getirir
 */
export async function getOfferings(): Promise<PurchasesOffering | null> {
  if (!isPurchasesSupported() || !isConfigured) return null;
  try {
    const offerings = await Purchases.getOfferings();
    if (offerings?.current) {
      return offerings.current;
    }
    return null;
  } catch (error) {
    console.warn('Offerings hatası:', error);
    return null;
  }
}

/**
 * Paket satın alır
 */
export async function purchasePackage(
  pkg: PurchasesPackage
): Promise<{ success: boolean; customerInfo?: CustomerInfo; error?: string }> {
  if (!isPurchasesSupported() || !isConfigured) {
    return {
      success: true, // Demo modunda başarılı kabul et
    };
  }

  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const hasEntitlement = checkEntitlement(customerInfo);
    
    return {
      success: hasEntitlement,
      customerInfo,
    };
  } catch (error: any) {
    if (error.userCancelled) {
      return { success: false, error: 'Satın alma iptal edildi.' };
    }
    return { success: false, error: error.message || 'Satın alma başarısız oldu.' };
  }
}

/**
 * Aboneliği geri yükler (restore purchases)
 */
export async function restorePurchases(): Promise<{
  success: boolean;
  customerInfo?: CustomerInfo;
  error?: string;
}> {
  if (!isPurchasesSupported() || !isConfigured) {
    return { success: false, error: 'Bu ortamda geri yükleme desteklenmiyor.' };
  }

  try {
    const customerInfo = await Purchases.restorePurchases();
    const hasEntitlement = checkEntitlement(customerInfo);
    
    return {
      success: hasEntitlement,
      customerInfo,
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Geri yükleme başarısız oldu.' };
  }
}
