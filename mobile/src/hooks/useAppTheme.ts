import { useThemeStore } from '../store/theme.store';
import { themes, ThemeColors } from '../constants/theme';

export function useAppTheme(): { colors: ThemeColors; isDark: boolean; themeMode: 'light' | 'dark' | 'navy' } {
  const themeMode = useThemeStore((state) => state.themeMode);
  
  const colors = themes[themeMode] || themes.dark;
  const isDark = themeMode === 'dark' || themeMode === 'navy';

  return {
    colors,
    isDark,
    themeMode,
  };
}
