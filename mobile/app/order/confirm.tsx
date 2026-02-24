import { useLocalSearchParams, useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Pressable } from 'react-native';
import { useState } from 'react';
import { Text } from '@/components/Themed';
import { Theme } from '@/constants/Theme';
import { getServiceById, formatPriceRange, type ServiceId } from '@/types/services';
import { MOCK_NEARBY_NURSES, formatEta } from '@/types/nurse';
import { apiFetch } from '@/constants/api';
import { useAuth } from '@/context/AuthContext';

const FIRST_ORDER_DISCOUNT_PERCENT = 10;

export default function OrderConfirmScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const params = useLocalSearchParams<{
    serviceId: string;
    lat: string;
    lng: string;
    house: string;
    floor?: string;
    apartment?: string;
    phone: string;
    nurseId: string;
    autoAssign: string;
  }>();

  const service = params.serviceId ? getServiceById(params.serviceId as ServiceId) : null;
  const nurse = params.nurseId ? MOCK_NEARBY_NURSES.find((n) => n.id === params.nurseId) : null;
  const isFirstOrder = true;
  const price = service
    ? Math.round((service.priceMin + service.priceMax) / 2)
    : 0;
  const discount = isFirstOrder ? Math.round((price * FIRST_ORDER_DISCOUNT_PERCENT) / 100) : 0;
  const finalPrice = price - discount;

  const handleSubmit = async () => {
    if (!service) return;
    setLoading(true);
    try {
      await apiFetch('/orders', {
        method: 'POST',
        token: token ?? undefined,
        body: JSON.stringify({
          serviceId: service.id,
          serviceTitle: service.title,
          priceAmount: price,
          discountAmount: discount,
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
      router.replace('/(tabs)/two');
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
          <FontAwesome name={service.icon as 'medkit'} size={24} color={Theme.primary} />
          <Text style={styles.serviceName}>{service.title}</Text>
        </View>
        <View style={styles.divider} />
        <Row
          label="Адрес"
          value={`${params.house}${params.floor ? `, этаж ${params.floor}` : ''}${params.apartment ? `, кв. ${params.apartment}` : ''}`}
        />
        <Row label="Телефон" value={params.phone ?? ''} />
        {nurse && (
          <>
            <View style={styles.divider} />
            <Row label="Медсестра" value={`${nurse.name} · ${nurse.rating} ★`} />
            <Row label="Время подачи" value={formatEta(nurse.etaMinutes)} />
            <Row label="Расстояние" value={`${nurse.distanceKm} км`} />
          </>
        )}
      </View>

      <View style={styles.priceBlock}>
        <Row label="Стоимость" value={formatPriceRange(service.priceMin, service.priceMax, service.currency)} />
        {isFirstOrder && discount > 0 && (
          <Row label="Скидка 10% (первый заказ)" value={`−${discount.toLocaleString('ru-RU')} UZS`} valueGreen />
        )}
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
