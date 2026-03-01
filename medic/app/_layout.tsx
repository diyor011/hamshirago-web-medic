import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useRef } from 'react';
import { Alert, AppState, Linking } from 'react-native';
import 'react-native-reanimated';

import { apiFetch } from '@/constants/api';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import {
  hasBackgroundLocationPermission,
  setBackgroundLocationToken,
  stopBackgroundLocationUpdates,
} from '@/utils/backgroundLocation';
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
  const lastPermissionReminderTs = useRef(0);
  const lastAutoOfflineAlertTs = useRef(0);

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

  useEffect(() => {
    setBackgroundLocationToken(token ?? null);
    if (!token || !medic?.isOnline) {
      stopBackgroundLocationUpdates().catch(() => {});
    }
  }, [token, medic?.isOnline]);

  const remindBackgroundPermission = useCallback(async () => {
    if (!token || !medic?.isOnline) return;
    const now = Date.now();
    if (now - lastPermissionReminderTs.current < 5 * 60_000) return;

    try {
      const hasPermission = await hasBackgroundLocationPermission();
      if (hasPermission) return;
      lastPermissionReminderTs.current = now;
      Alert.alert(
        'Нужно разрешение "Всегда"',
        'Чтобы клиенты видели вашу актуальную геолокацию, разрешите доступ к локации "Всегда".',
        [
          { text: 'Позже', style: 'cancel' },
          {
            text: 'Открыть настройки',
            onPress: () => {
              Linking.openSettings().catch(() => {});
            },
          },
        ],
      );
    } catch {
      // ignore
    }
  }, [token, medic?.isOnline]);

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
    remindBackgroundPermission();
  }, [remindBackgroundPermission]);

  useEffect(() => {
    if (!token || !medic) return;
    if (medic.onlineDisabledReason !== 'INACTIVE_5H') return;
    const now = Date.now();
    if (now - lastAutoOfflineAlertTs.current < 60_000) return;
    lastAutoOfflineAlertTs.current = now;
    Alert.alert(
      'Онлайн отключён автоматически',
      'Вы были неактивны более 5 часов. Войдите заново и включите онлайн-режим.',
      [{ text: 'Понятно' }],
    );
  }, [token, medic?.onlineDisabledReason]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        syncOnlineLocation();
        remindBackgroundPermission();
      }
    });
    return () => sub.remove();
  }, [syncOnlineLocation, remindBackgroundPermission]);

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
