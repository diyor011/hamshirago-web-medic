import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { API_BASE } from '@/constants/api';

/**
 * Registers for Expo push notifications and saves the token to the backend.
 * Must be called after the medic is authenticated (token available).
 * Works with Expo Go (uses shared Expo credentials) and production builds.
 */
export async function registerPushToken(authToken: string): Promise<void> {
  try {
    // Push notifications require a physical device
    if (!Device.isDevice) return;

    // Android needs a notification channel before registering
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('new_orders', {
        name: 'Новые заказы',
        importance: Notifications.AndroidImportance.MAX,
        sound: 'default',
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return;

    // projectId is required in Expo SDK 50+
    // In Expo Go it comes from Constants; in a dev/prod build it comes from app.json via EAS
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    if (!projectId) {
      // Without projectId push tokens are not available — log and bail out gracefully
      console.warn('[push] No EAS projectId found. Run "eas init" to enable background push notifications.');
      return;
    }

    const { data: pushToken } = await Notifications.getExpoPushTokenAsync({ projectId });

    // Save token to backend
    await fetch(`${API_BASE}/medics/push-token`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ token: pushToken }),
    });
  } catch (err) {
    // Non-fatal — the app still works without push
    console.warn('[push] registerPushToken failed:', err);
  }
}
