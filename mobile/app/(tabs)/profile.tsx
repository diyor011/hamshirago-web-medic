import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useEffect, useState } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/Themed';
import { Theme } from '@/constants/Theme';
import { apiFetch } from '@/constants/api';
import { useAuth } from '@/context/AuthContext';

interface OrderSummary {
  id: string;
  status: string;
}

interface PagedOrders {
  data: OrderSummary[];
  total: number;
}

const STATUS_DONE = ['DONE'];
const STATUS_ACTIVE = ['CREATED', 'ASSIGNED', 'ACCEPTED', 'ON_THE_WAY', 'ARRIVED', 'SERVICE_STARTED'];

export default function ProfileScreen() {
  const { user, token, logout } = useAuth();
  const [orders, setOrders] = useState<OrderSummary[]>([]);

  useEffect(() => {
    if (!token) return;
    apiFetch<PagedOrders>('/orders?limit=100', { token })
      .then((res) => setOrders(res.data))
      .catch(() => {});
  }, [token]);

  const handleLogout = () => {
    Alert.alert('Выйти?', 'Вы будете отключены от аккаунта.', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Выйти', style: 'destructive', onPress: logout },
    ]);
  };

  if (!user) return null;

  const initials = user.name
    ? user.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : user.phone.slice(-2);

  const totalOrders = orders.length;
  const doneOrders = orders.filter((o) => STATUS_DONE.includes(o.status)).length;
  const activeOrders = orders.filter((o) => STATUS_ACTIVE.includes(o.status)).length;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      {/* Header */}
      <LinearGradient
        colors={Theme.bannerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.name}>{user.name ?? 'Клиент'}</Text>
        <Text style={styles.phone}>{user.phone}</Text>
      </LinearGradient>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalOrders}</Text>
          <Text style={styles.statLabel}>всего заказов</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{doneOrders}</Text>
          <Text style={styles.statLabel}>завершено</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, activeOrders > 0 && { color: Theme.warning }]}>
            {activeOrders}
          </Text>
          <Text style={styles.statLabel}>активных</Text>
        </View>
      </View>

      {/* Info card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Данные аккаунта</Text>
        <InfoRow icon="phone" label="Телефон" value={user.phone} />
        {user.name && <InfoRow icon="user" label="Имя" value={user.name} />}
      </View>

      {/* App info */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>О приложении</Text>
        <InfoRow icon="heartbeat" label="HamshiraGo" value="Медсёстры с опытом 3+ лет" />
        <InfoRow icon="star" label="Скидка" value="10% на первый заказ" />
      </View>

      {/* Logout */}
      <Pressable
        style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.8 }]}
        onPress={handleLogout}
      >
        <FontAwesome name="sign-out" size={16} color={Theme.error} />
        <Text style={styles.logoutText}>Выйти из аккаунта</Text>
      </Pressable>

    </ScrollView>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <FontAwesome name={icon as keyof typeof FontAwesome.glyphMap} size={15} color={Theme.textSecondary} style={styles.infoIcon} />
      <View style={styles.infoTexts}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Theme.background },
  content: { paddingBottom: 40 },

  header: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 32,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 30, fontWeight: '700', color: '#fff' },
  name: { fontSize: 20, fontWeight: '700', color: '#fff' },
  phone: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },

  statsRow: {
    flexDirection: 'row',
    gap: 12,
    margin: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: Theme.surface,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.border,
  },
  statValue: { fontSize: 22, fontWeight: '700', color: Theme.primary },
  statLabel: { fontSize: 11, color: Theme.textSecondary, marginTop: 3, textAlign: 'center' },

  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: Theme.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Theme.border,
    gap: 12,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Theme.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoIcon: { width: 20, textAlign: 'center' },
  infoTexts: { flex: 1 },
  infoLabel: { fontSize: 12, color: Theme.textSecondary },
  infoValue: { fontSize: 15, fontWeight: '500', color: Theme.text, marginTop: 1 },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 4,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${Theme.error}40`,
    backgroundColor: `${Theme.error}08`,
  },
  logoutText: { fontSize: 16, fontWeight: '600', color: Theme.error },
});
