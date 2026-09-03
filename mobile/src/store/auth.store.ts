import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../api/client';

interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
  companyId: string;
  companyName: string;
  subscription?: any;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email, password) => {
    const response: any = await authAPI.login(email, password);
    const { accessToken, refreshToken, user } = response.data;

    await AsyncStorage.multiSet([
      ['accessToken', accessToken],
      ['refreshToken', refreshToken],
      ['user', JSON.stringify(user)],
    ]);

    set({ user, accessToken, isAuthenticated: true });
  },

  register: async (data) => {
    const response: any = await authAPI.register(data);
    const { accessToken, refreshToken, user } = response.data;

    await AsyncStorage.multiSet([
      ['accessToken', accessToken],
      ['refreshToken', refreshToken],
      ['user', JSON.stringify(user)],
    ]);

    set({ user, accessToken, isAuthenticated: true });
  },

  logout: async () => {
    try {
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      if (refreshToken) await authAPI.logout(refreshToken);
    } catch {}

    await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
    set({ user: null, accessToken: null, isAuthenticated: false });
  },

  restoreSession: async () => {
    try {
      const [token, userStr] = await AsyncStorage.multiGet(['accessToken', 'user']);
      const accessToken = token[1];
      const userJson = userStr[1];

      if (accessToken && userJson) {
        set({
          accessToken,
          user: JSON.parse(userJson),
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  updateUser: (userData) => {
    const currentUser = get().user;
    if (currentUser) {
      const updatedUser = { ...currentUser, ...userData };
      set({ user: updatedUser });
      AsyncStorage.setItem('user', JSON.stringify(updatedUser));
    }
  },
}));
