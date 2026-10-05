import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { useAuthStore } from '../src/store/auth.store';
import { useSubscriptionStore } from '../src/store/subscription.store';
import { useAppTheme } from '../src/hooks/useAppTheme';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 dakika
    },
  },
});

export default function RootLayout() {
  const restoreSession = useAuthStore((s) => s.restoreSession);
  const isLoading = useAuthStore((s) => s.isLoading);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const segments = useSegments();
  const router = useRouter();
  const { colors, isDark } = useAppTheme();
  const initSubscription = useSubscriptionStore((s) => s.initialize);

  useEffect(() => {
    restoreSession().finally(() => SplashScreen.hideAsync());
  }, []);

  // RevenueCat'i kullanıcı giriş yaptığında başlat
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      initSubscription(user.id);
    }
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    if (isLoading) return;
    const inAuthGroup = segments[0] === '(auth)';
    const isPublicScreen = inAuthGroup || segments[0] === 'paywall';
    if (!isAuthenticated && !isPublicScreen) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, segments]);

  if (isLoading) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style={isDark ? "light" : "dark"} />
          <Stack screenOptions={{ 
            headerShown: false, 
            contentStyle: { backgroundColor: colors.background },
            gestureEnabled: true,
            fullScreenGestureEnabled: true,
            animation: 'slide_from_right'
          }}>
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="paywall"
              options={{
                headerShown: false,
                presentation: 'fullScreenModal',
                animation: 'slide_from_bottom',
                gestureEnabled: false,
              }}
            />
            <Stack.Screen name="users" options={{ headerShown: false }} />
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
