import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

function getApiBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // If running in Expo Go or dev client, hostUri contains the IP of the dev machine
  const hostUri = Constants.expoConfig?.hostUri || (Constants as any)?.manifest2?.extra?.expoGo?.debuggerHost;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      return `http://${ip}:3000/api`;
    }
  }

  return 'http://localhost:3000/api';
}

export const API_BASE_URL = getApiBaseUrl();

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const isValidToken = (t: any): t is string =>
  typeof t === 'string' &&
  t.trim().length > 10 &&
  t !== 'undefined' &&
  t !== 'null' &&
  t.split('.').length === 3;

const setAuthHeader = (headers: any, token: string) => {
  if (headers && typeof headers.set === 'function') {
    headers.set('Authorization', `Bearer ${token}`);
  } else if (headers) {
    headers.Authorization = `Bearer ${token}`;
  }
};

// Request interceptor — token ekle
apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('accessToken');
    if (isValidToken(token)) {
      setAuthHeader(config.headers, token);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let onUnauthorizedListener: (() => void) | null = null;

export const setOnUnauthorizedListener = (listener: () => void) => {
  onUnauthorizedListener = listener;
};

const notifyUnauthorized = () => {
  if (onUnauthorizedListener) {
    try {
      onUnauthorizedListener();
    } catch {}
  }
};

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

// Response interceptor — token yenile
apiClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;
    const isAuthEndpoint =
      originalRequest?.url?.includes('/auth/login') ||
      originalRequest?.url?.includes('/auth/refresh') ||
      originalRequest?.url?.includes('/auth/register');

    // Only attempt token refresh on actual 401 responses for non-auth endpoints
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            setAuthHeader(originalRequest.headers, token);
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err?.response?.data || err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        if (!isValidToken(refreshToken)) {
          processQueue(error, null);
          await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
          notifyUnauthorized();
          return Promise.reject(error.response?.data || error);
        }

        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
        const resData = response.data?.data;
        const accessToken = resData?.accessToken;
        const newRefreshToken = resData?.refreshToken;

        if (!isValidToken(accessToken)) {
          throw new Error('Geçersiz access token');
        }

        await AsyncStorage.setItem('accessToken', accessToken);
        if (isValidToken(newRefreshToken)) {
          await AsyncStorage.setItem('refreshToken', newRefreshToken);
        }

        processQueue(null, accessToken);
        setAuthHeader(originalRequest.headers, accessToken);
        return apiClient(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
        notifyUnauthorized();
        return Promise.reject(error.response?.data || error);
      } finally {
        isRefreshing = false;
      }
    }

    // For non-401 errors, just reject with the error data without clearing auth
    return Promise.reject(error.response?.data || error);
  }
);

// API fonksiyonları
export const authAPI = {
  register: (data: any) => apiClient.post('/auth/register', data),
  login: (email: string, password: string) => apiClient.post('/auth/login', { email, password }),
  logout: (refreshToken: string) => apiClient.post('/auth/logout', { refreshToken }),
  getMe: () => apiClient.get('/auth/me'),
  refresh: (refreshToken: string) => apiClient.post('/auth/refresh', { refreshToken }),
};

export const motorsAPI = {
  getAll: (params?: any) => apiClient.get('/motors', { params }),
  getById: (id: string) => apiClient.get(`/motors/${id}`),
  getStats: () => apiClient.get('/motors/stats'),
  create: (data: any) => apiClient.post('/motors', data),
  update: (id: string, data: any) => apiClient.put(`/motors/${id}`, data),
  delete: (id: string) => apiClient.delete(`/motors/${id}`),
  getParts: (id: string) => apiClient.get(`/motors/${id}/parts`),
  getMaintenance: (id: string, params?: any) => apiClient.get(`/motors/${id}/maintenance`, { params }),
  scanQR: (qrCode: string) => apiClient.post('/motors/scan-qr', { qrCode }),
};

export const partsAPI = {
  getAll: (params?: any) => apiClient.get('/parts', { params }),
  getById: (id: string) => apiClient.get(`/parts/${id}`),
  getStats: () => apiClient.get('/parts/stats'),
  getLowStock: () => apiClient.get('/parts/low-stock'),
  create: (data: any) => apiClient.post('/parts', data),
  update: (id: string, data: any) => apiClient.put(`/parts/${id}`, data),
  delete: (id: string) => apiClient.delete(`/parts/${id}`),
  addMovement: (id: string, data: any) => apiClient.post(`/parts/${id}/movement`, data),
  getMovements: (id: string, params?: any) => apiClient.get(`/parts/${id}/movements`, { params }),
  getExportUrl: (token?: string) => `${API_BASE_URL}/parts/export-excel${token ? `?token=${token}` : ''}`,
};

export const maintenanceAPI = {
  getAll: (params?: any) => apiClient.get('/maintenance', { params }),
  getUpcoming: (days?: number) => apiClient.get('/maintenance/upcoming', { params: { days } }),
  getById: (id: string) => apiClient.get(`/maintenance/${id}`),
  create: (data: any) => apiClient.post('/maintenance', data),
  update: (id: string, data: any) => apiClient.put(`/maintenance/${id}`, data),
  delete: (id: string) => apiClient.delete(`/maintenance/${id}`),
};

export const subscriptionsAPI = {
  getPlans: () => apiClient.get('/subscriptions/plans'),
  getStatus: () => apiClient.get('/subscriptions/status'),
  createCheckout: (planId: string) => apiClient.post('/subscriptions/checkout', { planId }),
  createPortal: () => apiClient.post('/subscriptions/portal'),
  cancel: () => apiClient.post('/subscriptions/cancel'),
};

export const companiesAPI = {
  getProfile: () => apiClient.get('/companies/profile'),
  updateProfile: (data: any) => apiClient.put('/companies/profile', data),
  getUsers: () => apiClient.get('/companies/users'),
  inviteUser: (data: { email: string; fullName: string; role?: string; password?: string }) =>
    apiClient.post('/companies/users', data),
  createUser: (data: { email: string; fullName: string; role?: string; password?: string }) =>
    apiClient.post('/companies/users', data),
  updateUser: (id: string, data: { fullName?: string; role?: string; isActive?: boolean; password?: string; newPassword?: string }) =>
    apiClient.put(`/companies/users/${id}`, data),
  resetPassword: (id: string, newPassword: string) =>
    apiClient.post(`/companies/users/${id}/reset-password`, { newPassword }),
  deleteUser: (id: string) => apiClient.delete(`/companies/users/${id}`),
};

export const warehouseAPI = {
  getAll: () => apiClient.get('/warehouses'),
  getById: (id: string) => apiClient.get(`/warehouses/${id}`),
  getStats: () => apiClient.get('/warehouses/stats'),
  getCriticalStock: () => apiClient.get('/warehouses/critical-stock'),
  create: (data: any) => apiClient.post('/warehouses', data),
  update: (id: string, data: any) => apiClient.put(`/warehouses/${id}`, data),
  updateShelfLocation: (data: { warehouseId: string; partId: string; shelfLocation?: string }) =>
    apiClient.patch('/warehouses/stock-shelf', data),
  delete: (id: string) => apiClient.delete(`/warehouses/${id}`),
  getExportUrl: (id: string, token?: string) =>
    `${API_BASE_URL}/warehouses/${id}/export${token ? `?token=${token}` : ''}`,
  getExportAllUrl: (token?: string) =>
    `${API_BASE_URL}/warehouses/export/all${token ? `?token=${token}` : ''}`,
};

export const supplierAPI = {
  getAll: (params?: any) => apiClient.get('/suppliers', { params }),
  getById: (id: string) => apiClient.get(`/suppliers/${id}`),
  getSummary: () => apiClient.get('/suppliers/summary'),
  getTransactions: (id: string, params?: any) => apiClient.get(`/suppliers/${id}/transactions`, { params }),
  recordPayment: (id: string, data: any) => apiClient.post(`/suppliers/${id}/payments`, data),
  create: (data: any) => apiClient.post('/suppliers', data),
  update: (id: string, data: any) => apiClient.put(`/suppliers/${id}`, data),
  delete: (id: string) => apiClient.delete(`/suppliers/${id}`),
};

export const workOrderAPI = {
  getAll: (params?: any) => apiClient.get('/work-orders', { params }),
  getById: (id: string) => apiClient.get(`/work-orders/${id}`),
  getStats: () => apiClient.get('/work-orders/stats'),
  getPlateHistory: (plate: string) => apiClient.get('/work-orders/plate-history', { params: { plate } }),
  getReceivables: (params?: any) => apiClient.get('/work-orders/receivables', { params }),
  create: (data: any) => apiClient.post('/work-orders', data),
  update: (id: string, data: any) => apiClient.put(`/work-orders/${id}`, data),
  delete: (id: string) => apiClient.delete(`/work-orders/${id}`),
  updatePayment: (id: string, data: { paymentStatus?: string; paidAmount?: number; amountCollected?: number; paymentMethod?: string; paymentNotes?: string }) =>
    apiClient.patch(`/work-orders/${id}/payment`, data),
  addPhoto: (id: string, data: { type: 'before' | 'after'; imageUrl: string }) =>
    apiClient.post(`/work-orders/${id}/photos`, data),
  removePhoto: (id: string, data: { type: 'before' | 'after'; imageUrl: string }) =>
    apiClient.delete(`/work-orders/${id}/photos`, { data }),
  addItem: (orderId: string, data: any) => apiClient.post(`/work-orders/${orderId}/items`, data),
  addBatchItems: (orderId: string, items: any[]) => apiClient.post(`/work-orders/${orderId}/items/batch`, { items }),
  updateItemStatus: (orderId: string, itemId: string, status: string) =>
    apiClient.patch(`/work-orders/${orderId}/items/${itemId}/status`, { status }),
  removeItem: (orderId: string, itemId: string) =>
    apiClient.delete(`/work-orders/${orderId}/items/${itemId}`),
  assign: (id: string, userId: string) => apiClient.patch(`/work-orders/${id}/assign`, { userId }),
  approve: (id: string) => apiClient.patch(`/work-orders/${id}/approve`),
  claim: (id: string) => apiClient.post(`/work-orders/${id}/claim`),
  requestTakeover: (id: string) => apiClient.post(`/work-orders/${id}/takeover-request`),
  respondTakeover: (id: string, action: 'APPROVE' | 'REJECT') => apiClient.post(`/work-orders/${id}/takeover-respond`, { action }),
};

export const uploadAPI = {
  uploadImage: (formData: FormData) =>
    apiClient.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  uploadBase64: (data: { base64: string; filename?: string }) =>
    apiClient.post('/upload/base64', data),
};

export const stockAPI = {
  purchase: (data: any) => apiClient.post('/stock/purchase', data),
  out: (data: any) => apiClient.post('/stock/out', data),
  stockOut: (data: any) => apiClient.post('/stock/out', data),
  batchConsume: (data: { items: { partId: string; quantity: number }[]; warehouseId?: string; notes?: string }) =>
    apiClient.post('/stock/batch-consume', data),
  transfer: (data: any) => apiClient.post('/stock/transfer', data),
  adjustWarehouses: (data: any) => apiClient.post('/stock/adjust-warehouses', data),
  findByBarcode: (barcode: string) => apiClient.get(`/stock/barcode/${barcode}`),
  getMovements: (params?: any) => apiClient.get('/stock/movements', { params }),
};


export const cashAPI = {
  getDaily: (params?: { date?: string }) => apiClient.get('/cash/daily', { params }),
  addTransaction: (data: {
    type: 'IN' | 'OUT';
    category: string;
    amount: number;
    paymentMethod?: string;
    documentNo?: string;
    description?: string;
    date?: string;
    supplierId?: string;
  }) => apiClient.post('/cash/transactions', data),
  deleteTransaction: (id: string) => apiClient.delete(`/cash/transactions/${id}`),
  closeDay: (data: {
    date?: string;
    actualCash?: number;
    transferredToNextDay?: number;
    takenByOwner?: number;
    notes?: string;
  }) => apiClient.post('/cash/close-day', data),
  getZReports: (params?: any) => apiClient.get('/cash/reports', { params }),
};

export const analyticsAPI = {
  getExecutiveSummary: (params?: {
    period?: 'today' | 'week' | 'month' | 'year' | 'custom';
    startDate?: string;
    endDate?: string;
    technicianId?: string;
  }) => apiClient.get('/analytics/executive-summary', { params }),
};

