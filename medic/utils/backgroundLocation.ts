import { Platform } from 'react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { API_BASE } from '@/constants/api';

const MEDIC_LOCATION_TASK = 'hamshirago-medic-location-task';
const TRACKING_DISTANCE_METERS = 100;
const TRACKING_INTERVAL_MS = 60_000;

let authToken: string | null = null;

type LocationTaskPayload = {
  locations?: Location.LocationObject[];
};

if (!TaskManager.isTaskDefined(MEDIC_LOCATION_TASK)) {
  TaskManager.defineTask(MEDIC_LOCATION_TASK, async ({ data, error }) => {
    if (error || !authToken) return;
    const payload = data as LocationTaskPayload | undefined;
    const latest = payload?.locations?.[payload.locations.length - 1];
    if (!latest) return;

    try {
      await fetch(`${API_BASE}/medics/location`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          isOnline: true,
          latitude: latest.coords.latitude,
          longitude: latest.coords.longitude,
        }),
      });
    } catch {
      // best effort: next background update will retry
    }
  });
}

export function setBackgroundLocationToken(token: string | null) {
  authToken = token;
}

export async function hasBackgroundLocationPermission(): Promise<boolean> {
  const bg = await Location.getBackgroundPermissionsAsync() as Location.LocationPermissionResponse;
  if (Platform.OS === 'ios') {
    return bg.status === 'granted' && bg.ios?.scope === 'always';
  }
  return bg.status === 'granted';
}

export async function requestBackgroundLocationPermission(): Promise<boolean> {
  const requested = await Location.requestBackgroundPermissionsAsync() as Location.LocationPermissionResponse;
  if (Platform.OS === 'ios') {
    return requested.status === 'granted' && requested.ios?.scope === 'always';
  }
  return requested.status === 'granted';
}

export async function startBackgroundLocationUpdates(): Promise<void> {
  const fg = await Location.getForegroundPermissionsAsync();
  if (fg.status !== 'granted') {
    const fgRequested = await Location.requestForegroundPermissionsAsync();
    if (fgRequested.status !== 'granted') {
      throw new Error('Нет разрешения на геолокацию');
    }
  }

  const hasBgPermission = await hasBackgroundLocationPermission();
  if (!hasBgPermission) {
    const granted = await requestBackgroundLocationPermission();
    if (!granted) {
      throw new Error('Нет разрешения на фоновую геолокацию (разрешите "Всегда").');
    }
  }

  const alreadyStarted = await Location.hasStartedLocationUpdatesAsync(MEDIC_LOCATION_TASK);
  if (alreadyStarted) return;

  await Location.startLocationUpdatesAsync(MEDIC_LOCATION_TASK, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: TRACKING_INTERVAL_MS,
    distanceInterval: TRACKING_DISTANCE_METERS,
    pausesUpdatesAutomatically: true,
    showsBackgroundLocationIndicator: true,
    foregroundService: Platform.OS === 'android'
      ? {
          notificationTitle: 'HamshiraGo Medic',
          notificationBody: 'Обновляем вашу геолокацию для новых заказов',
          notificationColor: '#0d9488',
          killServiceOnDestroy: false,
        }
      : undefined,
  });
}

export async function stopBackgroundLocationUpdates(): Promise<void> {
  const alreadyStarted = await Location.hasStartedLocationUpdatesAsync(MEDIC_LOCATION_TASK);
  if (!alreadyStarted) return;
  await Location.stopLocationUpdatesAsync(MEDIC_LOCATION_TASK);
}
