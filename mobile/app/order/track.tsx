import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { io, Socket } from 'socket.io-client';
import { Text } from '@/components/Themed';
import { Theme } from '@/constants/Theme';
import { API_BASE, apiFetch } from '@/constants/api';
import { useAuth } from '@/context/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────

type OrderStatus =
  | 'CREATED'
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'ON_THE_WAY'
  | 'ARRIVED'
  | 'SERVICE_STARTED'
  | 'DONE'
  | 'CANCELED';

interface Medic {
  id: string;
  name: string;
  phone: string;
}

interface Order {
  id: string;
  serviceTitle: string;
  priceAmount: number;
  discountAmount: number;
  status: OrderStatus;
  clientRating: number | null;
  medic?: Medic | null;
  location: {
    house: string;
    floor?: string | null;
    apartment?: string | null;
    phone: string;
  } | null;
  created_at: string;
}

// ─── Step definitions ─────────────────────────────────────────────────────────

const STEPS: { status: OrderStatus; label: string; icon: string }[] = [
  { status: 'CREATED', label: 'Заказ создан', icon: 'file-text-o' },
  { status: 'ASSIGNED', label: 'Медик найден', icon: 'user' },
  { status: 'ACCEPTED', label: 'Медик принял', icon: 'check-circle-o' },
  { status: 'ON_THE_WAY', label: 'Медик едет', icon: 'car' },
  { status: 'ARRIVED', label: 'Медик прибыл', icon: 'map-marker' },
  { status: 'SERVICE_STARTED', label: 'Услуга начата', icon: 'heartbeat' },
  { status: 'DONE', label: 'Завершено', icon: 'check-circle' },
];

const STATUS_INDEX: Partial<Record<OrderStatus, number>> = Object.fromEntries(
  STEPS.map((s, i) => [s.status, i]),
);

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function TrackOrderScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const router = useRouter();
  const { token } = useAuth();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const [submittingRating, setSubmittingRating] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── REST fetch ──────────────────────────────────────────────────────────────
  const fetchOrder = useCallback(async () => {
    try {
      const data = await apiFetch<Order>(`/orders/${orderId}`, {
        token: token ?? undefined,
      });
      setOrder(data);
    } catch {
      // silent – keep stale data
    }
  }, [orderId, token]);

  // ── WebSocket ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!orderId || !token) return;

    setLoading(true);
    fetchOrder().finally(() => setLoading(false));

    const socket = io(API_BASE, {
      transports: ['websocket'],
      auth: { token },
      reconnectionAttempts: 5,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setWsConnected(true);
      socket.emit('subscribe_order', orderId);
    });

    socket.on('disconnect', () => setWsConnected(false));

    socket.on('order_status', (payload: { orderId: string; status: OrderStatus }) => {
      if (payload.orderId !== orderId) return;
      setOrder((prev) => (prev ? { ...prev, status: payload.status } : prev));
      if (payload.status === 'DONE' || payload.status === 'CANCELED') {
        socket.disconnect();
      }
    });

    // Polling fallback every 20s (in case WS fails)
    pollingRef.current = setInterval(() => {
      if (!wsConnected) fetchOrder();
    }, 20_000);

    return () => {
      socket.emit('unsubscribe_order', orderId);
      socket.disconnect();
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [orderId, token]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Rate order ───────────────────────────────────────────────────────────────
  const handleRate = async (stars: number) => {
    if (!orderId || !token || submittingRating) return;
    setSubmittingRating(true);
    try {
      const updated = await apiFetch<Order>(`/orders/${orderId}/rate`, {
        method: 'POST',
        token,
        body: JSON.stringify({ rating: stars }),
      });
      setOrder(updated);
    } catch (e: unknown) {
      Alert.alert('Ошибка', e instanceof Error ? e.message : 'Не удалось отправить оценку');
    } finally {
      setSubmittingRating(false);
    }
  };

  // ── Cancel order ────────────────────────────────────────────────────────────
  const handleCancel = () => {
    Alert.alert('Отменить заказ?', 'Вы уверены, что хотите отменить заказ?', [
      { text: 'Нет', style: 'cancel' },
      {
        text: 'Отменить',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiFetch(`/orders/${orderId}/cancel`, {
              method: 'POST',
              token: token ?? undefined,
            });
            router.replace('/(tabs)/two');
          } catch (e: unknown) {
            Alert.alert('Ошибка', e instanceof Error ? e.message : 'Не удалось отменить');
          }
        },
      },
    ]);
  };

  // ─────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Theme.primary} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Заказ не найден</Text>
        <Pressable style={styles.backBtn} onPress={() => router.replace('/(tabs)/two')}>
          <Text style={styles.backBtnText}>К заказам</Text>
        </Pressable>
      </View>
    );
  }

  const currentIdx = order.status === 'CANCELED' ? -1 : (STATUS_INDEX[order.status] ?? 0);
  const isDone = order.status === 'DONE';
  const isCanceled = order.status === 'CANCELED';
  const isActive = !isDone && !isCanceled;
  const finalPrice = order.priceAmount - (order.discountAmount ?? 0);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <Text style={styles.serviceTitle}>{order.serviceTitle}</Text>
          {wsConnected && isActive && (
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>Live</Text>
            </View>
          )}
        </View>
        <Text style={styles.priceText}>
          {finalPrice.toLocaleString('ru-RU')} UZS
        </Text>
      </View>

      {/* Canceled banner */}
      {isCanceled && (
        <View style={styles.canceledBanner}>
          <FontAwesome name="times-circle" size={18} color={Theme.error} />
          <Text style={styles.canceledText}>Заказ отменён</Text>
        </View>
      )}

      {/* Progress stepper */}
      {!isCanceled && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Статус заказа</Text>
          {STEPS.map((step, idx) => {
            const done = idx < currentIdx;
            const active = idx === currentIdx;
            const future = idx > currentIdx;

            const lineColor = done ? Theme.primary : Theme.border;
            const circleColor = active
              ? Theme.primary
              : done
              ? Theme.primary
              : Theme.border;
            const labelColor = future ? Theme.textSecondary : Theme.text;

            return (
              <View key={step.status} style={styles.step}>
                {/* Left col: circle + connector */}
                <View style={styles.stepLeft}>
                  <View
                    style={[
                      styles.stepCircle,
                      { borderColor: circleColor, backgroundColor: (done || active) ? circleColor : 'transparent' },
                    ]}
                  >
                    {done ? (
                      <FontAwesome name="check" size={10} color="#fff" />
                    ) : (
                      <FontAwesome
                        name={step.icon as keyof typeof FontAwesome.glyphMap}
                        size={11}
                        color={active ? '#fff' : Theme.border}
                      />
                    )}
                  </View>
                  {idx < STEPS.length - 1 && (
                    <View style={[styles.stepLine, { backgroundColor: lineColor }]} />
                  )}
                </View>

                {/* Right col: label */}
                <View style={styles.stepRight}>
                  <Text
                    style={[
                      styles.stepLabel,
                      { color: labelColor, fontWeight: active ? '700' : '400' },
                    ]}
                  >
                    {step.label}
                  </Text>
                  {active && (
                    <Text style={styles.stepActiveHint}>
                      {getStepHint(step.status)}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Medic card */}
      {order.medic && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Ваш медик</Text>
          <View style={styles.medicRow}>
            <View style={styles.medicAvatar}>
              <FontAwesome name="user-md" size={22} color={Theme.primary} />
            </View>
            <View style={styles.medicInfo}>
              <Text style={styles.medicName}>{order.medic.name}</Text>
              <Text style={styles.medicPhone} lightColor={Theme.textSecondary} darkColor={Theme.textSecondary}>
                {order.medic.phone}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Address */}
      {order.location && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Адрес</Text>
          <View style={styles.addressRow}>
            <FontAwesome name="map-marker" size={14} color={Theme.textSecondary} />
            <Text style={styles.addressText} lightColor={Theme.textSecondary} darkColor={Theme.textSecondary}>
              {order.location.house}
              {order.location.floor ? `, эт. ${order.location.floor}` : ''}
              {order.location.apartment ? `, кв. ${order.location.apartment}` : ''}
            </Text>
          </View>
        </View>
      )}

      {/* Rating block — shown when DONE and not yet rated */}
      {isDone && order.clientRating === null && order.medic && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Оцените медика</Text>
          <Text style={styles.ratingHint} lightColor={Theme.textSecondary} darkColor={Theme.textSecondary}>
            Как прошёл визит?
          </Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Pressable
                key={star}
                style={({ pressed }) => [styles.starBtn, pressed && { opacity: 0.6 }]}
                onPress={() => handleRate(star)}
                disabled={submittingRating}
              >
                <FontAwesome name="star" size={36} color={Theme.primary} />
                <Text style={styles.starLabel}>{star}</Text>
              </Pressable>
            ))}
          </View>
          {submittingRating && <ActivityIndicator color={Theme.primary} style={{ marginTop: 8 }} />}
        </View>
      )}

      {/* Rating already submitted */}
      {isDone && order.clientRating !== null && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Ваша оценка</Text>
          <View style={styles.ratingDoneRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <FontAwesome
                key={star}
                name="star"
                size={28}
                color={star <= order.clientRating! ? Theme.primary : Theme.border}
              />
            ))}
          </View>
        </View>
      )}

      {/* Buttons */}
      {isActive && (order.status === 'CREATED' || order.status === 'ASSIGNED') && (
        <Pressable
          style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.7 }]}
          onPress={handleCancel}
        >
          <Text style={styles.cancelBtnText}>Отменить заказ</Text>
        </Pressable>
      )}

      {(isDone || isCanceled) && (
        <Pressable
          style={({ pressed }) => [styles.doneBtn, pressed && { opacity: 0.85 }]}
          onPress={() => router.replace('/(tabs)/two')}
        >
          <Text style={styles.doneBtnText}>К моим заказам</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

function getStepHint(status: OrderStatus): string {
  switch (status) {
    case 'CREATED': return 'Ожидаем назначения медика...';
    case 'ASSIGNED': return 'Медик получил ваш заказ';
    case 'ACCEPTED': return 'Медик подтвердил выезд';
    case 'ON_THE_WAY': return 'Медик едет к вам';
    case 'ARRIVED': return 'Медик у вашей двери';
    case 'SERVICE_STARTED': return 'Услуга оказывается';
    case 'DONE': return 'Завершено';
    default: return '';
  }
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: Theme.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Theme.background,
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    color: Theme.textSecondary,
  },
  backBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: Theme.primary,
    borderRadius: 12,
  },
  backBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },

  // Header
  headerCard: {
    backgroundColor: Theme.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Theme.border,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  serviceTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Theme.text,
    flex: 1,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: `${Theme.success}18`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Theme.success,
  },
  liveText: {
    fontSize: 12,
    fontWeight: '700',
    color: Theme.success,
  },
  priceText: {
    fontSize: 22,
    fontWeight: '800',
    color: Theme.primary,
  },

  // Section card
  card: {
    backgroundColor: Theme.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Theme.border,
    gap: 14,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Theme.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Stepper
  step: {
    flexDirection: 'row',
    gap: 14,
  },
  stepLeft: {
    alignItems: 'center',
    width: 26,
  },
  stepCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLine: {
    width: 2,
    flex: 1,
    minHeight: 20,
    marginVertical: 3,
  },
  stepRight: {
    flex: 1,
    paddingTop: 3,
    paddingBottom: 12,
    gap: 3,
  },
  stepLabel: {
    fontSize: 15,
  },
  stepActiveHint: {
    fontSize: 13,
    color: Theme.textSecondary,
  },

  // Medic
  medicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  medicAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${Theme.primary}18`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medicInfo: {
    flex: 1,
    gap: 3,
  },
  medicName: {
    fontSize: 16,
    fontWeight: '700',
    color: Theme.text,
  },
  medicPhone: {
    fontSize: 13,
  },

  // Address
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  addressText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },

  // Canceled banner
  canceledBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: `${Theme.error}12`,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: `${Theme.error}30`,
  },
  canceledText: {
    fontSize: 15,
    fontWeight: '700',
    color: Theme.error,
  },

  // Buttons
  cancelBtn: {
    borderWidth: 1.5,
    borderColor: Theme.error,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: Theme.error,
  },
  doneBtn: {
    backgroundColor: Theme.primary,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  doneBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },

  // Rating
  ratingHint: {
    fontSize: 14,
    marginTop: -8,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  starBtn: {
    alignItems: 'center',
    gap: 4,
    padding: 4,
  },
  starLabel: {
    fontSize: 12,
    color: Theme.textSecondary,
  },
  ratingDoneRow: {
    flexDirection: 'row',
    gap: 8,
  },
});
