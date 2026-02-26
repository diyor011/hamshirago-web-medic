import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Theme } from '@/constants/Theme';
import { apiFetch } from '@/constants/api';
import { useAuth } from '@/context/AuthContext';

type OrderStatus =
  | 'CREATED' | 'ASSIGNED' | 'ACCEPTED' | 'ON_THE_WAY'
  | 'ARRIVED' | 'SERVICE_STARTED' | 'DONE' | 'CANCELED';

interface Order {
  id: string;
  serviceTitle: string;
  priceAmount: number;
  discountAmount: number;
  status: OrderStatus;
  location: { house: string; floor: string | null; apartment: string | null } | null;
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

const ACTIVE_STATUSES: OrderStatus[] = [
  'ASSIGNED', 'ACCEPTED', 'ON_THE_WAY', 'ARRIVED', 'SERVICE_STARTED',
];

export default function MyOrdersScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await apiFetch<{ data: Order[] }>('/orders/medic/my?limit=50', {
        token: token ?? undefined,
      });
      setOrders(res.data);
    } catch {
      // ignore
    }
  }, [token]);

  useEffect(() => {
    setLoading(true);
    fetchOrders().finally(() => setLoading(false));
  }, [fetchOrders]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  }, [fetchOrders]);

  const active = orders.filter((o) => ACTIVE_STATUSES.includes(o.status));
  const history = orders.filter((o) => !ACTIVE_STATUSES.includes(o.status));

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Theme.primary} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={orders.length === 0 ? styles.emptyContainer : styles.listContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Theme.primary} />
      }
      data={[...active, ...history]}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        active.length > 0 ? (
          <Text style={styles.sectionTitle}>Активные</Text>
        ) : null
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <FontAwesome name="briefcase" size={48} color={Theme.border} />
          <Text style={styles.emptyTitle}>Нет заказов</Text>
          <Text style={styles.emptyHint}>Принятые заказы появятся здесь</Text>
        </View>
      }
      renderItem={({ item, index }) => (
        <>
          {index === active.length && history.length > 0 && (
            <Text style={[styles.sectionTitle, { marginTop: 16 }]}>История</Text>
          )}
          <Pressable
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            onPress={() => router.push(`/order/${item.id}`)}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.serviceTitle}>{item.serviceTitle}</Text>
              <View style={[styles.statusBadge, { backgroundColor: `${STATUS_COLOR[item.status]}18` }]}>
                <Text style={[styles.statusText, { color: STATUS_COLOR[item.status] }]}>
                  {STATUS_LABEL[item.status]}
                </Text>
              </View>
            </View>
            {item.location && (
              <View style={styles.locationRow}>
                <FontAwesome name="map-marker" size={12} color={Theme.textSecondary} />
                <Text style={styles.locationText}>
                  {item.location.house}
                  {item.location.floor ? `, эт. ${item.location.floor}` : ''}
                </Text>
              </View>
            )}
            <View style={styles.cardFooter}>
              <Text style={styles.price}>
                {(item.priceAmount - (item.discountAmount ?? 0)).toLocaleString('ru-RU')} UZS
              </Text>
              <FontAwesome name="chevron-right" size={13} color={Theme.textSecondary} />
            </View>
          </Pressable>
        </>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Theme.background },
  listContent: { padding: 16, gap: 10 },
  emptyContainer: { flexGrow: 1 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10, paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Theme.text },
  emptyHint: { fontSize: 14, color: Theme.textSecondary },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: Theme.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  card: {
    backgroundColor: Theme.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Theme.border,
  },
  cardPressed: { opacity: 0.9 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  serviceTitle: { fontSize: 15, fontWeight: '600', color: Theme.text, flex: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '700' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  locationText: { fontSize: 13, color: Theme.textSecondary, flex: 1 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  price: { fontSize: 15, fontWeight: '700', color: Theme.primary },
});
