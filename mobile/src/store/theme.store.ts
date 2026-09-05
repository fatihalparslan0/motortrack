import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark' | 'navy';

interface ThemeState {
  themeMode: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      themeMode: 'dark', // Varsayılan olarak dark
      setTheme: (mode: ThemeMode) => set({ themeMode: mode }),
    }),
    {
      name: 'motortrack-theme-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
