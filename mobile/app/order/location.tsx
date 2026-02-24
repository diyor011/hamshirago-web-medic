import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Location from 'expo-location';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useCallback, useEffect, useState } from 'react';
import { Text } from '@/components/Themed';
import { Theme } from '@/constants/Theme';
import type { OrderAddress } from '@/types/order';
import {
  MOCK_NEARBY_NURSES,
  formatEta,
  type NearbyNurse,
} from '@/types/nurse';
import { getServiceById, type ServiceId } from '@/types/services';
import { apiFetch } from '@/constants/api';
import { useAuth } from '@/context/AuthContext';

interface ApiMedic {
  id: string;
  name: string;
  rating: number;
  reviewCount: number;
  experienceYears: number;
  distanceKm: number;
}

function medicToNurse(m: ApiMedic): NearbyNurse {
  return {
    id: m.id,
    name: m.name,
    rating: m.rating ?? 4.8,
    reviewCount: m.reviewCount ?? 0,
    experienceYears: m.experienceYears ?? 3,
    distanceKm: Math.round(m.distanceKm * 10) / 10,
    etaMinutes: Math.max(5, Math.round((m.distanceKm / 0.4) * 60 / 60)),
  };
}

const LocationMapComponent =
  Platform.OS === 'web'
    ? () => null
    : require('@/components/LocationMap').LocationMap;

const WEAK_GPS_ACCURACY_METERS = 25;

export default function OrderLocationScreen() {
  const { serviceId } = useLocalSearchParams<{ serviceId?: string }>();
  const router = useRouter();
  const { token } = useAuth();
  const service = serviceId ? getServiceById(serviceId as ServiceId) : null;

  const [locationPermission, setLocationPermission] = useState<boolean | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [accuracyMeters, setAccuracyMeters] = useState<number | null>(null);
  const [pin, setPin] = useState<{ latitude: number; longitude: number } | null>(null);
  const [address, setAddress] = useState<Partial<OrderAddress>>({
    house: '',
    floor: '',
    apartment: '',
    phone: '',
  });
  const [autoAssign, setAutoAssign] = useState(true);
  const [selectedNurseId, setSelectedNurseId] = useState<string | null>(null);
  const [nearbyNurses, setNearbyNurses] = useState<NearbyNurse[]>(MOCK_NEARBY_NURSES);

  const isWeakGps = accuracyMeters != null && accuracyMeters > WEAK_GPS_ACCURACY_METERS;
  const displayCoords = pin ?? coords;
  const selectedNurse = selectedNurseId
    ? nearbyNurses.find((n) => n.id === selectedNurseId)
    : autoAssign
      ? nearbyNurses[0]
      : null;

  const fetchNearbyMedics = useCallback(async (latitude: number, longitude: number) => {
    try {
      const medics = await apiFetch<ApiMedic[]>(
        `/medics/nearby?latitude=${latitude}&longitude=${longitude}&limit=10`,
        { token: token ?? undefined },
      );
      if (medics.length > 0) {
        setNearbyNurses(medics.map(medicToNurse));
      }
    } catch {
      // fallback to mock on error
    }
  }, [token]);

  const fetchLocation = useCallback(async () => {
    setLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
      if (status !== 'granted') {
        setLoadingLocation(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = loc.coords;
      const acc = loc.coords.accuracy ?? null;
      setCoords({ latitude, longitude });
      setAccuracyMeters(acc);
      if (!pin) setPin({ latitude, longitude });
      fetchNearbyMedics(latitude, longitude);
    } catch {
      setLocationPermission(false);
    } finally {
      setLoadingLocation(false);
    }
  }, [pin, fetchNearbyMedics]);

  useEffect(() => {
    fetchLocation();
  }, []);

  const handleConfirm = () => {
    if (!displayCoords || !address.house?.trim() || !address.phone?.trim()) {
      Alert.alert('Заполните адрес', 'Укажите дом и телефон.');
      return;
    }
    router.push({
      pathname: '/order/confirm',
      params: {
        serviceId: serviceId ?? '',
        lat: String(displayCoords.latitude),
        lng: String(displayCoords.longitude),
        house: address.house,
        floor: address.floor ?? '',
        apartment: address.apartment ?? '',
        phone: address.phone,
        nurseId: selectedNurse?.id ?? (autoAssign ? nearbyNurses[0]?.id : ''),
        autoAssign: autoAssign ? '1' : '0',
      },
    });
  };

  if (loadingLocation && locationPermission === null) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Theme.primary} />
        <Text style={styles.loadingText}>Определение местоположения...</Text>
      </View>
    );
  }

  if (locationPermission === false) {
    return (
      <View style={styles.centered}>
        <FontAwesome name="map-marker" size={48} color={Theme.textSecondary} />
        <Text style={styles.errorTitle}>Нет доступа к геолокации</Text>
        <Text style={styles.errorHint} lightColor={Theme.textSecondary} darkColor={Theme.textSecondary}>
          Включите геолокацию в настройках или укажите адрес вручную ниже.
        </Text>
        <Pressable style={styles.retryButton} onPress={fetchLocation}>
          <Text style={styles.retryButtonText}>Повторить</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Accuracy & weak GPS warning */}
        {accuracyMeters != null && (
          <View style={[styles.accuracyRow, isWeakGps && styles.accuracyRowWeak]}>
            <FontAwesome
              name={isWeakGps ? 'exclamation-triangle' : 'crosshairs'}
              size={16}
              color={isWeakGps ? Theme.warning : Theme.primary}
            />
            <Text
              style={[styles.accuracyText, isWeakGps && styles.accuracyTextWeak]}
              lightColor={isWeakGps ? '#854d0e' : undefined}
              darkColor={isWeakGps ? '#ca8a04' : undefined}
            >
              Точность ~{Math.round(accuracyMeters)} м
              {isWeakGps && ' • Слабый сигнал GPS. Подвиньте метку на карте вручную.'}
            </Text>
          </View>
        )}

        {/* Map — only on native; web shows coords text */}
        {Platform.OS !== 'web' && displayCoords ? (
          <LocationMapComponent
            latitude={displayCoords.latitude}
            longitude={displayCoords.longitude}
            onPinChange={setPin}
          />
        ) : displayCoords ? (
          <View style={styles.coordsFallback}>
            <Text style={styles.coordsText}>
              Координаты: {displayCoords.latitude.toFixed(5)}, {displayCoords.longitude.toFixed(5)}
            </Text>
            <Text style={styles.coordsHint} lightColor={Theme.textSecondary} darkColor={Theme.textSecondary}>
              На телефоне откроется карта для уточнения точки.
            </Text>
          </View>
        ) : null}

        {/* Address form */}
        <Text style={styles.sectionTitle}>Адрес</Text>
        <View style={styles.form}>
          <Text style={styles.label}>Дом *</Text>
          <TextInput
            style={styles.input}
            value={address.house ?? ''}
            onChangeText={(house) => setAddress((a) => ({ ...a, house }))}
            placeholder="ул. Примерная, 1"
            placeholderTextColor={Theme.textSecondary}
          />
          <View style={styles.row}>
            <View style={styles.half}>
              <Text style={styles.label}>Этаж</Text>
              <TextInput
                style={styles.input}
                value={address.floor ?? ''}
                onChangeText={(floor) => setAddress((a) => ({ ...a, floor }))}
                placeholder="3"
                placeholderTextColor={Theme.textSecondary}
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.half}>
              <Text style={styles.label}>Квартира</Text>
              <TextInput
                style={styles.input}
                value={address.apartment ?? ''}
                onChangeText={(apartment) => setAddress((a) => ({ ...a, apartment }))}
                placeholder="42"
                placeholderTextColor={Theme.textSecondary}
                keyboardType="number-pad"
              />
            </View>
          </View>
          <Text style={styles.label}>Телефон *</Text>
          <TextInput
            style={styles.input}
            value={address.phone ?? ''}
            onChangeText={(phone) => setAddress((a) => ({ ...a, phone }))}
            placeholder="+998 90 123 45 67"
            placeholderTextColor={Theme.textSecondary}
            keyboardType="phone-pad"
          />
        </View>

        {/* Nearby nurses */}
        <Text style={styles.sectionTitle}>Медсестра</Text>
        <View style={styles.toggleRow}>
          <Pressable
            style={[styles.toggleOption, autoAssign && styles.toggleOptionActive]}
            onPress={() => { setAutoAssign(true); setSelectedNurseId(null); }}
          >
            <Text style={[styles.toggleText, autoAssign && styles.toggleTextActive]}>
              Автоназначение
            </Text>
          </Pressable>
          <Pressable
            style={[styles.toggleOption, !autoAssign && styles.toggleOptionActive]}
            onPress={() => setAutoAssign(false)}
          >
            <Text style={[styles.toggleText, !autoAssign && styles.toggleTextActive]}>
              Выбрать вручную
            </Text>
          </Pressable>
        </View>
        {autoAssign && selectedNurse && (
          <View style={styles.autoAssignHint}>
            <Text style={styles.autoAssignText}>
              Будет назначена: {selectedNurse.name} • {selectedNurse.rating} ★ • {formatEta(selectedNurse.etaMinutes)}
            </Text>
          </View>
        )}
        {!autoAssign && (
          <View style={styles.nurseList}>
            {nearbyNurses.map((nurse) => (
              <NurseCard
                key={nurse.id}
                nurse={nurse}
                selected={selectedNurseId === nurse.id}
                onSelect={() => setSelectedNurseId(nurse.id)}
              />
            ))}
          </View>
        )}

        <Pressable
          style={({ pressed }) => [styles.confirmButton, pressed && styles.confirmButtonPressed]}
          onPress={handleConfirm}
        >
          <Text style={styles.confirmButtonText}>Подтвердить заказ</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function NurseCard({
  nurse,
  selected,
  onSelect,
}: {
  nurse: NearbyNurse;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <Pressable
      style={[styles.nurseCard, selected && styles.nurseCardSelected]}
      onPress={onSelect}
    >
      <View style={styles.nurseAvatar}>
        <Text style={styles.nurseAvatarText}>{nurse.name.charAt(0)}</Text>
      </View>
      <View style={styles.nurseInfo}>
        <Text style={styles.nurseName}>{nurse.name}</Text>
        <Text style={styles.nurseMeta} lightColor={Theme.textSecondary} darkColor={Theme.textSecondary}>
          {nurse.rating} ★ · {nurse.experienceYears} лет опыта · {formatEta(nurse.etaMinutes)} · {nurse.distanceKm} км
        </Text>
      </View>
      {selected && <FontAwesome name="check-circle" size={22} color={Theme.primary} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.background,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: Theme.textSecondary,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Theme.text,
    marginTop: 16,
    textAlign: 'center',
  },
  errorHint: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 24,
  },
  retryButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: Theme.primary,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  accuracyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: `${Theme.primary}12`,
    borderRadius: 10,
    marginBottom: 12,
  },
  accuracyRowWeak: {
    backgroundColor: `${Theme.warning}20`,
  },
  accuracyText: {
    fontSize: 13,
    color: Theme.primary,
    flex: 1,
  },
  accuracyTextWeak: {
    fontSize: 13,
    flex: 1,
  },
  coordsFallback: {
    padding: 16,
    backgroundColor: Theme.surface,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Theme.border,
  },
  coordsText: {
    fontSize: 14,
    color: Theme.text,
  },
  coordsHint: {
    fontSize: 12,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Theme.text,
    marginBottom: 10,
  },
  form: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    color: Theme.textSecondary,
    marginBottom: 4,
  },
  input: {
    backgroundColor: Theme.surface,
    borderWidth: 1,
    borderColor: Theme.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: Theme.text,
    marginBottom: 12,
  },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  toggleOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Theme.surface,
    borderWidth: 2,
    borderColor: Theme.border,
    alignItems: 'center',
  },
  toggleOptionActive: {
    borderColor: Theme.primary,
    backgroundColor: `${Theme.primary}12`,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: Theme.textSecondary,
  },
  toggleTextActive: {
    color: Theme.primary,
  },
  autoAssignHint: {
    padding: 12,
    backgroundColor: `${Theme.primary}12`,
    borderRadius: 10,
    marginBottom: 16,
  },
  autoAssignText: {
    fontSize: 14,
    color: Theme.text,
  },
  nurseList: {
    gap: 8,
    marginBottom: 20,
  },
  nurseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.surface,
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  nurseCardSelected: {
    borderColor: Theme.primary,
    backgroundColor: `${Theme.primary}08`,
  },
  nurseAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  nurseAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  nurseInfo: { flex: 1 },
  nurseName: {
    fontSize: 16,
    fontWeight: '600',
    color: Theme.text,
  },
  nurseMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  confirmButton: {
    backgroundColor: Theme.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonPressed: { opacity: 0.9 },
  confirmButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
});
