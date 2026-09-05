import { Stack } from 'expo-router';
import { useAppTheme } from '../../src/hooks/useAppTheme';

export default function MaintenanceLayout() {
  const { colors } = useAppTheme();
  return (
    <Stack screenOptions={{ 
      headerShown: false,
      contentStyle: { backgroundColor: colors.background },
      gestureEnabled: true,
      fullScreenGestureEnabled: true,
      animation: 'slide_from_right'
    }} />
  );
}
