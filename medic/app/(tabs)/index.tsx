import {
  ActivityIndicator,
  Alert,
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

interface OrderLocation {
  house: string;
  floor: string | null;
  apartment: string | null;
  phone: string;
  latitude: number;
  longitude: number;
}

interface AvailableOrder {
  id: string;
  serviceTitle: string;
  priceAmount: number;
  discountAmount: number;
  location: OrderLocation | null;
  created_at: string;
}

export default function AvailableOrdersScreen() {
  const { token, medic } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<AvailableOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [accepting, setAccepting] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      const data = await apiFetch<AvailableOrder[]>('/orders/medic/available', {
        token: token ?? undefined,
      });
      setOrders(data);
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

  const handleAccept = async (orderId: string) => {
    if (!medic?.isOnline) {
      Alert.alert('Вы офлайн', 'Перейдите в профиль и включите онлайн-режим.');
      return;
    }
    Alert.alert('Принять заказ?', 'Вы будете назначены на этот заказ.', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Принять',
        style: 'default',
        onPress: async () => {
          setAccepting(orderId);
          try {
            await apiFetch(`/orders/${orderId}/accept`, {
              method: 'POST',
              token: token ?? undefined,
            });
            setOrders((prev) => prev.filter((o) => o.id !== orderId));
            router.push(`/order/${orderId}`);
          } catch (e: unknown) {
            Alert.alert('Ошибка', e instanceof Error ? e.message : 'Не удалось принять заказ');
          } finally {
            setAccepting(null);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Theme.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!medic?.isOnline && (
        <View style={styles.offlineBanner}>
          <FontAwesome name="power-off" size={14} color="#854d0e" />
          <Text style={styles.offlineText}>
            Вы офлайн — новые заказы не поступают. Включите онлайн в Профиле.
          </Text>
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
          <View style={styles.empty}>
            <FontAwesome name="inbox" size={48} color={Theme.border} />
            <Text style={styles.emptyTitle}>Нет доступных заказов</Text>
            <Text style={styles.emptyHint}>Потяните вниз чтобы обновить</Text>
          </View>
        }
        renderItem={({ item }) => (
          <AvailableOrderCard
            order={item}
            onAccept={() => handleAccept(item.id)}
            accepting={accepting === item.id}
          />
        )}
      />
    </View>
  );
}

function AvailableOrderCard({
  order,
  onAccept,
  accepting,
}: {
  order: AvailableOrder;
  onAccept: () => void;
  accepting: boolean;
}) {
  const finalPrice = order.priceAmount - (order.discountAmount ?? 0);
  const date = new Date(order.created_at);
  const timeStr = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.serviceTitle}>{order.serviceTitle}</Text>
        <Text style={styles.price}>{finalPrice.toLocaleString('ru-RU')} UZS</Text>
      </View>

      {order.location && (
        <View style={styles.locationRow}>
          <FontAwesome name="map-marker" size={13} color={Theme.textSecondary} />
          <Text style={styles.locationText} numberOfLines={2}>
            {order.location.house}
            {order.location.floor ? `, эт. ${order.location.floor}` : ''}
            {order.location.apartment ? `, кв. ${order.location.apartment}` : ''}
          </Text>
        </View>
      )}

      {order.location && (
        <View style={styles.locationRow}>
          <FontAwesome name="phone" size={13} color={Theme.textSecondary} />
          <Text style={styles.locationText}>{order.location.phone}</Text>
        </View>
      )}

      <View style={styles.cardFooter}>
        <Text style={styles.time}>{timeStr}</Text>
        <Pressable
          style={({ pressed }) => [
            styles.acceptBtn,
            pressed && styles.acceptBtnPressed,
            accepting && styles.acceptBtnDisabled,
          ]}
          onPress={onAccept}
          disabled={accepting}
        >
          {accepting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.acceptBtnText}>Принять</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Theme.background },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#eab30820',
    borderBottomWidth: 1,
    borderBottomColor: '#eab30840',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  offlineText: { flex: 1, fontSize: 13, color: '#854d0e', fontWeight: '500' },
  listContent: { padding: 16, gap: 12 },
  emptyContainer: { flexGrow: 1 },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    paddingTop: 80,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Theme.text },
  emptyHint: { fontSize: 14, color: Theme.textSecondary },
  card: {
    backgroundColor: Theme.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Theme.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  serviceTitle: { fontSize: 16, fontWeight: '700', color: Theme.text, flex: 1 },
  price: { fontSize: 15, fontWeight: '700', color: Theme.primary, marginLeft: 8 },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 6,
  },
  locationText: { flex: 1, fontSize: 13, color: Theme.textSecondary },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Theme.border,
  },
  time: { fontSize: 13, color: Theme.textSecondary },
  acceptBtn: {
    backgroundColor: Theme.primary,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 10,
    minWidth: 100,
    alignItems: 'center',
  },
  acceptBtnPressed: { opacity: 0.9 },
  acceptBtnDisabled: { opacity: 0.7 },
  acceptBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
