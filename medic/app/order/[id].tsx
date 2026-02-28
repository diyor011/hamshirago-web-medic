import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { io, Socket } from 'socket.io-client';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Theme } from '@/constants/Theme';
import { API_BASE, apiFetch } from '@/constants/api';
import { useAuth } from '@/context/AuthContext';

async function openInMaps(latitude: number, longitude: number) {
  const lat = latitude;
  const lng = longitude;

  const yandexApp = Platform.OS === 'ios'
    ? `yandexmaps://maps.yandex.ru/?pt=${lng},${lat}&z=16&l=map`
    : `yandexmaps://maps.yandex.ru/?pt=${lng},${lat}&z=16`;

  const yandexWeb = `https://maps.yandex.ru/?pt=${lng},${lat}&z=16&l=map`;
  const googleWeb = `https://maps.google.com/?q=${lat},${lng}`;

  try {
    const canYandex = await Linking.canOpenURL(yandexApp);
    if (canYandex) {
      await Linking.openURL(yandexApp);
      return;
    }
  } catch {}

  // fallback: Yandex Maps web, then Google Maps
  Alert.alert(
    'Открыть в картах',
    '',
    [
      { text: 'Яндекс Карты', onPress: () => Linking.openURL(yandexWeb) },
      { text: 'Google Maps', onPress: () => Linking.openURL(googleWeb) },
      { text: 'Отмена', style: 'cancel' },
    ],
  );
}

type OrderStatus =
  | 'CREATED' | 'ASSIGNED' | 'ACCEPTED' | 'ON_THE_WAY'
  | 'ARRIVED' | 'SERVICE_STARTED' | 'DONE' | 'CANCELED';

interface OrderLocation {
  house: string;
  floor: string | null;
  apartment: string | null;
  phone: string;
  latitude: number;
  longitude: number;
}

interface OrderDetail {
  id: string;
  serviceTitle: string;
  serviceId: string;
  priceAmount: number;
  discountAmount: number;
  platformFee: number;
  status: OrderStatus;
  location: OrderLocation | null;
  created_at: string;
}

const STATUS_LABEL: Record<OrderStatus, string> = {
  CREATED: 'Создан',
  ASSIGNED: 'Назначен',
  ACCEPTED: 'Принят',
  ON_THE_WAY: 'В пути',
  ARRIVED: 'Прибыл',
  SERVICE_STARTED: 'Оказывается услуга',
  DONE: 'Выполнен',
  CANCELED: 'Отменён',
};

const STATUS_COLOR: Record<OrderStatus, string> = {
  CREATED: Theme.primary,
  ASSIGNED: Theme.warning,
  ACCEPTED: Theme.warning,
  ON_THE_WAY: Theme.warning,
  ARRIVED: Theme.warning,
  SERVICE_STARTED: Theme.accent,
  DONE: Theme.success,
  CANCELED: Theme.error,
};

/** Next status transition map for medic */
const NEXT_STATUS: Partial<Record<OrderStatus, { status: OrderStatus; label: string }>> = {
  ASSIGNED:       { status: 'ACCEPTED',       label: 'Подтвердить принятие' },
  ACCEPTED:       { status: 'ON_THE_WAY',     label: 'Еду к клиенту' },
  ON_THE_WAY:     { status: 'ARRIVED',        label: 'Я прибыл' },
  ARRIVED:        { status: 'SERVICE_STARTED', label: 'Начать услугу' },
  SERVICE_STARTED:{ status: 'DONE',           label: 'Завершить заказ' },
};

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [locationDeniedWarned, setLocationDeniedWarned] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [lastLocationSentAt, setLastLocationSentAt] = useState<string | null>(null);
  const [sentLocationCount, setSentLocationCount] = useState(0);
  const socketRef = useRef<Socket | null>(null);
  const trackingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchOrder = useCallback(async () => {
    try {
      const data = await apiFetch<OrderDetail>(`/orders/${id}`, {
        token: token ?? undefined,
      });
      setOrder(data);
    } catch {
      Alert.alert('Ошибка', 'Не удалось загрузить заказ');
      router.back();
    }
  }, [id, token]);

  useEffect(() => {
    setLoading(true);
    fetchOrder().finally(() => setLoading(false));
  }, [fetchOrder]);

  useEffect(() => {
    if (!token) return;
    const socket = io(API_BASE, {
      transports: ['websocket'],
      auth: { token },
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });
    socketRef.current = socket;
    socket.on('connect', () => setSocketConnected(true));
    socket.on('disconnect', () => setSocketConnected(false));

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setSocketConnected(false);
    };
  }, [token]);

  const emitCurrentLocation = useCallback(async () => {
    if (!id || !socketRef.current || !socketRef.current.connected) return;
    const perm = await Location.getForegroundPermissionsAsync();
    if (perm.status !== 'granted') {
      if (!locationDeniedWarned) {
        setLocationDeniedWarned(true);
        Alert.alert('Нет доступа к геолокации', 'Разрешите геолокацию, чтобы клиент видел ваш путь.');
      }
      return;
    }
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    socketRef.current.emit('medic_location', {
      orderId: id,
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
    });
    setLastLocationSentAt(new Date().toISOString());
    setSentLocationCount((prev) => prev + 1);
  }, [id, locationDeniedWarned]);

  useEffect(() => {
    const shouldTrack = order?.status === 'ON_THE_WAY';

    if (!shouldTrack) {
      if (trackingTimerRef.current) {
        clearInterval(trackingTimerRef.current);
        trackingTimerRef.current = null;
      }
      return;
    }

    emitCurrentLocation().catch(() => {});
    trackingTimerRef.current = setInterval(() => {
      emitCurrentLocation().catch(() => {});
    }, 5000);

    return () => {
      if (trackingTimerRef.current) {
        clearInterval(trackingTimerRef.current);
        trackingTimerRef.current = null;
      }
    };
  }, [order?.status, emitCurrentLocation]);

  const handleNextStatus = async () => {
    if (!order) return;
    const next = NEXT_STATUS[order.status];
    if (!next) return;

    const isDone = next.status === 'DONE';
    const confirmMsg = isDone
      ? 'Завершить заказ? Подтвердите что услуга оказана.'
      : `Перевести статус: "${STATUS_LABEL[next.status]}"?`;

    Alert.alert('Подтвердите действие', confirmMsg, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Да',
        style: isDone ? 'destructive' : 'default',
        onPress: async () => {
          setUpdating(true);
          try {
            const updated = await apiFetch<OrderDetail>(`/orders/${order.id}/medic-status`, {
              method: 'PATCH',
              token: token ?? undefined,
              body: JSON.stringify({ status: next.status }),
            });
            setOrder(updated);
            if (next.status === 'DONE') {
              const net = updated.priceAmount - (updated.discountAmount ?? 0);
              const fee = updated.platformFee ?? Math.round(net * 0.1);
              const earned = net - fee;
              Alert.alert(
                'Заказ завершён ✓',
                `Заработок зачислен на баланс:\n+${earned.toLocaleString('ru-RU')} UZS`,
                [{ text: 'OK', onPress: () => router.replace('/(tabs)/my-orders') }],
              );
            }
          } catch (e: unknown) {
            Alert.alert('Ошибка', e instanceof Error ? e.message : 'Не удалось обновить статус');
          } finally {
            setUpdating(false);
          }
        },
      },
    ]);
  };

  if (loading || !order) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Theme.primary} />
      </View>
    );
  }

  const statusColor = STATUS_COLOR[order.status];
  const nextStep = NEXT_STATUS[order.status];
  const netPrice = order.priceAmount - (order.discountAmount ?? 0);
  const platformFee = order.platformFee ?? Math.round(netPrice * 0.1);
  const medicEarnings = netPrice - platformFee;
  const date = new Date(order.created_at).toLocaleDateString('ru-RU', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {/* Status */}
      <View style={[styles.statusBlock, { backgroundColor: `${statusColor}12`, borderColor: `${statusColor}30` }]}>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        <Text style={[styles.statusLabel, { color: statusColor }]}>
          {STATUS_LABEL[order.status]}
        </Text>
      </View>

      {order.status === 'ON_THE_WAY' && (
        <View style={styles.liveTrackingCard}>
          <View style={styles.liveTrackingRow}>
            <View style={[styles.liveTrackingDot, { backgroundColor: socketConnected ? Theme.success : Theme.warning }]} />
            <Text style={styles.liveTrackingText}>
              {socketConnected ? 'Передаём геолокацию клиенту' : 'Подключаем live-трекинг...'}
            </Text>
          </View>
          {lastLocationSentAt && (
            <Text style={styles.liveTrackingMeta}>
              Последняя отправка: {new Date(lastLocationSentAt).toLocaleTimeString('ru-RU')} · точек: {sentLocationCount}
            </Text>
          )}
        </View>
      )}

      {/* Service info */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Услуга</Text>
        <Text style={styles.serviceTitle}>{order.serviceTitle}</Text>
        <View style={styles.divider} />
        <Row label="Дата создания" value={date} />
        <Row
          label="Стоимость услуги"
          value={`${order.priceAmount.toLocaleString('ru-RU')} UZS`}
        />
        {order.discountAmount > 0 && (
          <Row
            label="Скидка клиента"
            value={`−${order.discountAmount.toLocaleString('ru-RU')} UZS`}
            valueColor={Theme.success}
          />
        )}
        <Row
          label="Комиссия платформы (10%)"
          value={`−${platformFee.toLocaleString('ru-RU')} UZS`}
          valueColor={Theme.textSecondary}
        />
        <View style={styles.finalRow}>
          <Text style={styles.finalLabel}>Ваш заработок</Text>
          <Text style={styles.finalValue}>
            {medicEarnings.toLocaleString('ru-RU')} UZS
          </Text>
        </View>
      </View>

      {/* Address */}
      {order.location && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Адрес клиента</Text>
          <View style={styles.locationRow}>
            <FontAwesome name="map-marker" size={16} color={Theme.primary} />
            <Text style={styles.locationText}>
              {order.location.house}
              {order.location.floor ? `, этаж ${order.location.floor}` : ''}
              {order.location.apartment ? `, кв. ${order.location.apartment}` : ''}
            </Text>
          </View>
          <View style={styles.locationRow}>
            <FontAwesome name="phone" size={16} color={Theme.primary} />
            <Text style={styles.locationText}>{order.location.phone}</Text>
          </View>
          {order.location.latitude != null && order.location.longitude != null && (
            <Pressable
              style={({ pressed }) => [styles.mapsBtn, pressed && styles.mapsBtnPressed]}
              onPress={() => openInMaps(
                Number(order.location!.latitude),
                Number(order.location!.longitude),
              )}
            >
              <FontAwesome name="location-arrow" size={15} color="#fff" />
              <Text style={styles.mapsBtnText}>Открыть маршрут</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Next action button */}
      {nextStep && (
        <Pressable
          style={({ pressed }) => [
            styles.actionBtn,
            nextStep.status === 'DONE' && styles.actionBtnDone,
            pressed && styles.actionBtnPressed,
            updating && styles.actionBtnDisabled,
          ]}
          onPress={handleNextStatus}
          disabled={updating}
        >
          {updating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <FontAwesome
                name={nextStep.status === 'DONE' ? 'check-circle' : 'arrow-right'}
                size={18}
                color="#fff"
              />
              <Text style={styles.actionBtnText}>{nextStep.label}</Text>
            </>
          )}
        </Pressable>
      )}

      {(order.status === 'DONE' || order.status === 'CANCELED') && (
        <View style={styles.completedNote}>
          <FontAwesome
            name={order.status === 'DONE' ? 'check-circle' : 'times-circle'}
            size={20}
            color={statusColor}
          />
          <Text style={[styles.completedText, { color: statusColor }]}>
            {order.status === 'DONE' ? 'Заказ выполнен' : 'Заказ отменён'}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

function Row({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, valueColor ? { color: valueColor } : {}]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Theme.background },
  content: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Theme.background },
  statusBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusLabel: { fontSize: 16, fontWeight: '700' },
  liveTrackingCard: {
    marginBottom: 14,
    padding: 12,
    borderRadius: 12,
    backgroundColor: `${Theme.primary}10`,
    borderWidth: 1,
    borderColor: `${Theme.primary}25`,
  },
  liveTrackingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveTrackingDot: { width: 8, height: 8, borderRadius: 4 },
  liveTrackingText: { fontSize: 13, fontWeight: '600', color: Theme.text },
  liveTrackingMeta: { marginTop: 6, fontSize: 12, color: Theme.textSecondary },
  card: {
    backgroundColor: Theme.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Theme.border,
    marginBottom: 12,
  },
  cardTitle: { fontSize: 12, fontWeight: '700', color: Theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  serviceTitle: { fontSize: 18, fontWeight: '700', color: Theme.text },
  divider: { height: 1, backgroundColor: Theme.border, marginVertical: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  rowLabel: { fontSize: 14, color: Theme.textSecondary },
  rowValue: { fontSize: 14, fontWeight: '600', color: Theme.text },
  finalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Theme.border,
    marginTop: 4,
  },
  finalLabel: { fontSize: 14, fontWeight: '600', color: Theme.text },
  finalValue: { fontSize: 17, fontWeight: '700', color: Theme.primary },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  locationText: { fontSize: 15, color: Theme.text, flex: 1 },
  mapsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Theme.primary,
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 4,
  },
  mapsBtnPressed: { opacity: 0.9 },
  mapsBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  actionBtn: {
    backgroundColor: Theme.primary,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 8,
  },
  actionBtnDone: { backgroundColor: Theme.success },
  actionBtnPressed: { opacity: 0.9 },
  actionBtnDisabled: { opacity: 0.7 },
  actionBtnText: { fontSize: 17, fontWeight: '700', color: '#fff' },
  completedNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 16,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: Theme.surface,
    borderWidth: 1,
    borderColor: Theme.border,
  },
  completedText: { fontSize: 16, fontWeight: '600' },
});
