import { create } from 'zustand';
import { PurchasesOffering, PurchasesPackage, CustomerInfo } from 'react-native-purchases';
import {
  initRevenueCat,
  loginRevenueCat,
  logoutRevenueCat,
  getCustomerInfo,
  checkEntitlement,
  getOfferings,
  purchasePackage,
  restorePurchases,
} from '../services/revenuecat.service';
import { ENTITLEMENT_ID } from '../services/revenuecat.config';

interface SubscriptionState {
  // Durum
  isProUser: boolean;
  isLoading: boolean;
  customerInfo: CustomerInfo | null;
  currentOffering: PurchasesOffering | null;

  // Aksiyonlar
  initialize: (userId?: string) => Promise<void>;
  loginUser: (userId: string) => Promise<void>;
  logoutUser: () => Promise<void>;
  checkSubscription: () => Promise<boolean>;
  fetchOfferings: () => Promise<void>;
  purchase: (pkg: PurchasesPackage) => Promise<{ success: boolean; error?: string }>;
  restore: () => Promise<{ success: boolean; error?: string }>;
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  isProUser: false,
  isLoading: true,
  customerInfo: null,
  currentOffering: null,

  initialize: async (userId?: string) => {
    try {
      set({ isLoading: true });
      await initRevenueCat(userId);

      if (userId) {
        await loginRevenueCat(userId);
      }

      // Abonelik durumunu kontrol et
      const customerInfo = await getCustomerInfo();
      const isProUser = customerInfo ? checkEntitlement(customerInfo) : false;

      // Teklifleri yükle
      const offering = await getOfferings();

      set({
        isProUser,
        customerInfo,
        currentOffering: offering,
        isLoading: false,
      });
    } catch (error) {
      console.error('Subscription initialize hatası:', error);
      set({ isLoading: false, isProUser: false });
    }
  },

  loginUser: async (userId: string) => {
    const customerInfo = await loginRevenueCat(userId);
    if (customerInfo) {
      const isProUser = checkEntitlement(customerInfo);
      set({ customerInfo, isProUser });
    }
  },

  logoutUser: async () => {
    await logoutRevenueCat();
    set({ isProUser: false, customerInfo: null });
  },

  checkSubscription: async () => {
    const customerInfo = await getCustomerInfo();
    if (customerInfo) {
      const isProUser = checkEntitlement(customerInfo);
      set({ customerInfo, isProUser });
      return isProUser;
    }
    set({ isProUser: false });
    return false;
  },

  fetchOfferings: async () => {
    const offering = await getOfferings();
    set({ currentOffering: offering });
  },

  purchase: async (pkg: PurchasesPackage) => {
    set({ isLoading: true });
    const result = await purchasePackage(pkg);

    if (result.success && result.customerInfo) {
      set({
        isProUser: true,
        customerInfo: result.customerInfo,
        isLoading: false,
      });
      return { success: true };
    }

    set({ isLoading: false });
    return { success: false, error: result.error };
  },

  restore: async () => {
    set({ isLoading: true });
    const result = await restorePurchases();

    if (result.success && result.customerInfo) {
      set({
        isProUser: true,
        customerInfo: result.customerInfo,
        isLoading: false,
      });
      return { success: true };
    }

    set({ isLoading: false });
    return { success: false, error: result.error };
  },
}));
