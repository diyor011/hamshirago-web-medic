import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { useCallback, useEffect, useState } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Text } from '@/components/Themed';
import { Theme } from '@/constants/Theme';
import { apiFetch } from '@/constants/api';
import { useAuth } from '@/context/AuthContext';

type OrderStatus =
  | 'CREATED'
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'ON_THE_WAY'
  | 'ARRIVED'
  | 'SERVICE_STARTED'
  | 'DONE'
  | 'CANCELED';

interface OrderLocation {
  house: string;
  floor: string | null;
  apartment: string | null;
  phone: string;
}

interface Order {
  id: string;
  serviceTitle: string;
  priceAmount: number;
  discountAmount: number;
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

export default function OrdersScreen() {
  const { token, logout } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      const data = await apiFetch<Order[]>('/orders', { token: token ?? undefined });
      setOrders(data);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
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

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Theme.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Мои заказы</Text>
        <Pressable onPress={logout} style={styles.logoutBtn}>
          <FontAwesome name="sign-out" size={18} color={Theme.textSecondary} />
        </Pressable>
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => fetchOrders()} style={styles.retryBtn}>
            <Text style={styles.retryText}>Повторить</Text>
          </Pressable>
        </View>
      )}

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={orders.length === 0 ? styles.emptyContainer : styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Theme.primary} />
        }
        ListEmptyComponent={
          !error ? (
            <View style={styles.empty}>
              <FontAwesome name="clipboard" size={48} color={Theme.border} />
              <Text style={styles.emptyTitle}>Заказов пока нет</Text>
              <Text style={styles.emptyHint} lightColor={Theme.textSecondary} darkColor={Theme.textSecondary}>
                Выберите услугу на главной и оформите первый заказ
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => <OrderCard order={item} />}
      />
    </View>
  );
}

function OrderCard({ order }: { order: Order }) {
  const finalPrice = order.priceAmount - (order.discountAmount ?? 0);
  const statusColor = STATUS_COLOR[order.status] ?? Theme.textSecondary;
  const date = new Date(order.created_at);
  const dateStr = date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.serviceTitle}>{order.serviceTitle}</Text>
        <View style={[styles.statusBadge, { backgroundColor: `${statusColor}18` }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {STATUS_LABEL[order.status]}
          </Text>
        </View>
      </View>

      {order.location && (
        <View style={styles.cardRow}>
          <FontAwesome name="map-marker" size={13} color={Theme.textSecondary} />
          <Text style={styles.cardRowText} lightColor={Theme.textSecondary} darkColor={Theme.textSecondary}>
            {order.location.house}
            {order.location.floor ? `, эт. ${order.location.floor}` : ''}
            {order.location.apartment ? `, кв. ${order.location.apartment}` : ''}
          </Text>
        </View>
      )}

      <View style={styles.cardFooter}>
        <Text style={styles.price}>{finalPrice.toLocaleString('ru-RU')} UZS</Text>
        <Text style={styles.date} lightColor={Theme.textSecondary} darkColor={Theme.textSecondary}>
          {dateStr}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Theme.background,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Theme.text,
  },
  logoutBtn: {
    padding: 8,
  },
  errorBox: {
    margin: 16,
    backgroundColor: `${Theme.error}12`,
    borderRadius: 10,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: Theme.error,
  },
  retryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Theme.error,
    borderRadius: 8,
  },
  retryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Theme.text,
    textAlign: 'center',
  },
  emptyHint: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  card: {
    backgroundColor: Theme.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Theme.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Theme.text,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  cardRowText: {
    fontSize: 13,
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Theme.border,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: Theme.primary,
  },
  date: {
    fontSize: 12,
  },
});
