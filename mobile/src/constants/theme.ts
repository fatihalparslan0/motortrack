export type ThemeColors = {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  secondary: string;
  accent: string;
  danger: string;
  warning: string;
  success: string;
  background: string;
  surface: string;
  surfaceElevated: string;
  border: string;
  borderLight: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  statusActive: string;
  statusMaintenance: string;
  statusRetired: string;
  statusSold: string;
};

export const themes: Record<'light' | 'dark' | 'navy', ThemeColors> = {
  light: {
    primary: '#4F46E5', // Indigo
    primaryDark: '#3730A3',
    primaryLight: '#818CF8',
    secondary: '#059669', // Emerald
    accent: '#D97706',
    danger: '#DC2626',
    warning: '#D97706',
    success: '#059669',
    background: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceElevated: '#F1F5F9',
    border: '#E2E8F0',
    borderLight: '#CBD5E1',
    textPrimary: '#0F172A',
    textSecondary: '#475569',
    textMuted: '#94A3B8',
    textInverse: '#FFFFFF',
    statusActive: '#059669',
    statusMaintenance: '#D97706',
    statusRetired: '#64748B',
    statusSold: '#4F46E5',
  },
  dark: {
    primary: '#6366F1',
    primaryDark: '#4F46E5',
    primaryLight: '#818CF8',
    secondary: '#10B981',
    accent: '#F59E0B',
    danger: '#EF4444',
    warning: '#F59E0B',
    success: '#10B981',
    background: '#0F1117',
    surface: '#1A1D27',
    surfaceElevated: '#232736',
    border: '#2D3149',
    borderLight: '#3D4466',
    textPrimary: '#F1F5F9',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    textInverse: '#0F1117',
    statusActive: '#10B981',
    statusMaintenance: '#F59E0B',
    statusRetired: '#64748B',
    statusSold: '#6366F1',
  },
  navy: {
    primary: '#3B82F6', // Brighter blue
    primaryDark: '#2563EB',
    primaryLight: '#60A5FA',
    secondary: '#10B981',
    accent: '#FBBF24', // Goldish accent
    danger: '#EF4444',
    warning: '#F59E0B',
    success: '#10B981',
    background: '#0B132B', // Deep navy
    surface: '#152243',
    surfaceElevated: '#1C2C55',
    border: '#2A3C72',
    borderLight: '#3B5299',
    textPrimary: '#F8FAFC',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    textInverse: '#0B132B',
    statusActive: '#10B981',
    statusMaintenance: '#FBBF24',
    statusRetired: '#64748B',
    statusSold: '#3B82F6',
  }
};

// Geriye dönük uyumluluk için varsayılan Colors objesi (Dark)
export const Colors = themes.dark;

export const Typography = {
  fontFamily: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semiBold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
  },
  fontSize: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
};

export const BorderRadius = {
  sm: 6,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const Shadows = {
  sm: {
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  md: {
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 10,
  },
};
