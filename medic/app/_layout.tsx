import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import 'react-native-reanimated';

import { apiFetch } from '@/constants/api';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { registerPushToken } from '@/utils/registerPushToken';

// Show notifications in foreground with sound
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});


export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}

function RootLayoutNav() {
  const { token, medic } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const lastLocationSyncTs = useRef(0);

  useEffect(() => {
    const inAuth = segments[0] === 'auth';
    if (!token && !inAuth) {
      router.replace('/auth');
    } else if (token && inAuth) {
      router.replace('/(tabs)');
    }
  }, [token, segments]);

  // Register push token whenever the medic logs in
  useEffect(() => {
    if (token) registerPushToken(token);
  }, [token]);

  const syncOnlineLocation = useCallback(async () => {
    if (!token || !medic?.isOnline) return;

    const now = Date.now();
    // Avoid spamming endpoint when app rapidly changes state
    if (now - lastLocationSyncTs.current < 60_000) return;
    lastLocationSyncTs.current = now;

    try {
      const permission = await Location.getForegroundPermissionsAsync();
      if (permission.status !== 'granted') return;

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      await apiFetch('/medics/location', {
        method: 'PATCH',
        token,
        body: JSON.stringify({
          isOnline: true,
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        }),
      });
    } catch {
      // silent: location sync is best-effort
    }
  }, [token, medic?.isOnline]);

  useEffect(() => {
    syncOnlineLocation();
  }, [syncOnlineLocation]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') syncOnlineLocation();
    });
    return () => sub.remove();
  }, [syncOnlineLocation]);

  return (
    <ThemeProvider value={DefaultTheme}>
      <Stack>
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="order/[id]"
          options={{ title: 'Детали заказа', headerBackTitle: 'Назад' }}
        />
        <Stack.Screen
          name="verification"
          options={{ title: 'Верификация аккаунта', headerBackTitle: 'Назад' }}
        />
      </Stack>
    </ThemeProvider>
  );
}
