import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — token ekle
apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — token yenile
apiClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
        const { accessToken, refreshToken: newRefreshToken } = response.data.data;

        await AsyncStorage.setItem('accessToken', accessToken);
        await AsyncStorage.setItem('refreshToken', newRefreshToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch {
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
        // Navigate to login
        return Promise.reject(error);
      }
    }

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
};

export const listingsAPI = {
  getMarketplace: (params?: any) => apiClient.get('/listings/marketplace', { params }),
  getMy: (params?: any) => apiClient.get('/listings/my', { params }),
  getById: (id: string) => apiClient.get(`/listings/${id}`),
  create: (data: any) => apiClient.post('/listings', data),
  update: (id: string, data: any) => apiClient.put(`/listings/${id}`, data),
  delete: (id: string) => apiClient.delete(`/listings/${id}`),
  getMessages: (id: string) => apiClient.get(`/listings/${id}/messages`),
  sendMessage: (id: string, message: string) => apiClient.post(`/listings/${id}/messages`, { message }),
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
  inviteUser: (data: any) => apiClient.post('/companies/users', data),
  updateUser: (id: string, data: any) => apiClient.put(`/companies/users/${id}`, data),
};
