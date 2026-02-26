import { useLocalSearchParams, useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Pressable } from 'react-native';
import { useEffect, useState } from 'react';
import { Text } from '@/components/Themed';
import { Theme } from '@/constants/Theme';
import { formatEta } from '@/types/nurse';
import { apiFetch } from '@/constants/api';
import { useAuth } from '@/context/AuthContext';

interface CatalogService {
  id: string;
  title: string;
  price: number;
  durationMinutes: number | null;
  category: string | null;
}

export default function OrderConfirmScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [service, setService] = useState<CatalogService | null>(null);
  const [loadingService, setLoadingService] = useState(true);

  const params = useLocalSearchParams<{
    serviceId: string;
    lat: string;
    lng: string;
    house: string;
    floor?: string;
    apartment?: string;
    phone: string;
    nurseName?: string;
    nurseRating?: string;
    nurseEta?: string;
    nurseDistance?: string;
  }>();

  useEffect(() => {
    if (!params.serviceId) return;
    apiFetch<CatalogService>(`/services/${params.serviceId}`)
      .then(setService)
      .catch(() => setService(null))
      .finally(() => setLoadingService(false));
  }, [params.serviceId]);

  // Nurse data comes directly from params (real API data from location screen)
  const nurse = params.nurseName
    ? {
        name: params.nurseName,
        rating: params.nurseRating ? parseFloat(params.nurseRating) : null,
        etaMinutes: params.nurseEta ? parseInt(params.nurseEta, 10) : null,
        distanceKm: params.nurseDistance ? parseFloat(params.nurseDistance) : null,
      }
    : null;

  const finalPrice = service ? service.price : 0;

  const handleSubmit = async () => {
    if (!service) return;
    setLoading(true);
    try {
      const order = await apiFetch<{ id: string }>('/orders', {
        method: 'POST',
        token: token ?? undefined,
        body: JSON.stringify({
          serviceId: service.id,
          // price is now determined server-side from catalog — no priceAmount/serviceTitle needed
          location: {
            latitude: parseFloat(params.lat),
            longitude: parseFloat(params.lng),
            house: params.house,
            floor: params.floor ?? null,
            apartment: params.apartment ?? null,
            phone: params.phone,
          },
        }),
      });
      router.replace({ pathname: '/order/track', params: { orderId: order.id } });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Ошибка при создании заказа';
      Alert.alert('Ошибка', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  if (loadingService) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Theme.primary} />
      </View>
    );
  }

  if (!service) {
    return (
      <View style={styles.centered}>
        <Text>Услуга не найдена</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Подтверждение заказа</Text>

      <View style={styles.card}>
        <View style={styles.serviceRow}>
          <FontAwesome name="medkit" size={24} color={Theme.primary} />
          <Text style={styles.serviceName}>{service.title}</Text>
        </View>
        <View style={styles.divider} />
        <Row
          label="Адрес"
          value={`${params.house}${params.floor ? `, этаж ${params.floor}` : ''}${params.apartment ? `, кв. ${params.apartment}` : ''}`}
        />
        <Row label="Телефон" value={params.phone ?? ''} />
        {service.durationMinutes && (
          <Row label="Длительность" value={`~${service.durationMinutes} мин`} />
        )}
        {nurse && (
          <>
            <View style={styles.divider} />
            <Row
              label="Медсестра"
              value={nurse.rating ? `${nurse.name} · ${nurse.rating} ★` : nurse.name}
            />
            {nurse.etaMinutes != null && (
              <Row label="Время подачи" value={formatEta(nurse.etaMinutes)} />
            )}
            {nurse.distanceKm != null && (
              <Row label="Расстояние" value={`${nurse.distanceKm} км`} />
            )}
          </>
        )}
      </View>

      <View style={styles.priceBlock}>
        <View style={styles.finalRow}>
          <Text style={styles.finalLabel}>Итого</Text>
          <Text style={styles.finalPrice}>{finalPrice.toLocaleString('ru-RU')} UZS</Text>
        </View>
      </View>

      <View style={styles.buttons}>
        <Pressable
          style={({ pressed }) => [
            styles.button,
            styles.primaryButton,
            pressed && styles.buttonPressed,
            loading && styles.buttonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>Подтвердить заказ</Text>
          )}
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.button, styles.cancelButton, pressed && styles.buttonPressed]}
          onPress={handleCancel}
          disabled={loading}
        >
          <Text style={styles.cancelButtonText}>Отмена</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function Row({
  label,
  value,
  valueGreen,
}: {
  label: string;
  value: string;
  valueGreen?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel} lightColor={Theme.textSecondary} darkColor={Theme.textSecondary}>
        {label}
      </Text>
      <Text style={[styles.rowValue, valueGreen && styles.rowValueGreen]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Theme.background },
  content: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Theme.text,
    marginBottom: 16,
  },
  card: {
    backgroundColor: Theme.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Theme.border,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: '600',
    color: Theme.text,
  },
  divider: {
    height: 1,
    backgroundColor: Theme.border,
    marginVertical: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  rowLabel: { fontSize: 14 },
  rowValue: { fontSize: 14, fontWeight: '600', color: Theme.text },
  rowValueGreen: { color: Theme.success },
  priceBlock: {
    backgroundColor: Theme.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Theme.border,
  },
  finalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Theme.border,
  },
  finalLabel: { fontSize: 16, fontWeight: '700', color: Theme.text },
  finalPrice: { fontSize: 18, fontWeight: '700', color: Theme.primary },
  buttons: { gap: 12 },
  button: { paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  buttonPressed: { opacity: 0.9 },
  buttonDisabled: { opacity: 0.7 },
  primaryButton: { backgroundColor: Theme.primary },
  primaryButtonText: { fontSize: 18, fontWeight: '700', color: '#fff' },
  cancelButton: { backgroundColor: Theme.surface, borderWidth: 1, borderColor: Theme.border },
  cancelButtonText: { fontSize: 16, fontWeight: '600', color: Theme.text },
});
