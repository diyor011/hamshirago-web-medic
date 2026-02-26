import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Theme } from '@/constants/Theme';
import { apiFetch } from '@/constants/api';
import { useAuth } from '@/context/AuthContext';

interface OrderCount { id: string; status: string; }

const VERIFICATION_CONFIG = {
  PENDING:  { label: 'Ожидает проверки', color: '#f59e0b', icon: 'clock-o' as const,     bg: '#fef3c720', border: '#f59e0b40' },
  APPROVED: { label: 'Верифицирован',    color: '#10b981', icon: 'check-circle' as const, bg: '#d1fae520', border: '#10b98140' },
  REJECTED: { label: 'Отклонено',        color: '#ef4444', icon: 'times-circle' as const, bg: '#fee2e220', border: '#ef444440' },
};

export default function ProfileScreen() {
  const { medic, token, updateOnlineStatus, logout } = useAuth();
  const router = useRouter();
  const [togglingOnline, setTogglingOnline] = useState(false);
  const [completedCount, setCompletedCount] = useState<number | null>(null);

  useEffect(() => {
    if (!token) return;
    apiFetch<{ data: OrderCount[] }>('/orders/medic/my?limit=100', { token })
      .then((res) => setCompletedCount(res.data.filter((o) => o.status === 'DONE').length))
      .catch(() => {});
  }, [token]);

  if (!medic) return null;

  const handleToggleOnline = async (value: boolean) => {
    setTogglingOnline(true);
    try {
      let latitude: number | undefined;
      let longitude: number | undefined;

      if (value) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          latitude = loc.coords.latitude;
          longitude = loc.coords.longitude;
        }
      }

      await apiFetch('/medics/location', {
        method: 'PATCH',
        token: token ?? undefined,
        body: JSON.stringify({ isOnline: value, latitude, longitude }),
      });
      updateOnlineStatus(value);
    } catch (e: unknown) {
      Alert.alert('Ошибка', e instanceof Error ? e.message : 'Не удалось обновить статус');
    } finally {
      setTogglingOnline(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Выйти?', 'Вы будете отключены от аккаунта.', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Выйти', style: 'destructive', onPress: logout },
    ]);
  };

  const vStatus = (medic.verificationStatus ?? 'PENDING') as keyof typeof VERIFICATION_CONFIG;
  const vConfig = VERIFICATION_CONFIG[vStatus];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <LinearGradient
        colors={Theme.bannerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{medic.name.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>{medic.name}</Text>
        <Text style={styles.phone}>{medic.phone}</Text>
        {medic.rating != null && (
          <View style={styles.ratingRow}>
            <FontAwesome name="star" size={14} color="#fde68a" />
            <Text style={styles.ratingText}>{Number(medic.rating).toFixed(1)}</Text>
          </View>
        )}
      </LinearGradient>

      {/* Verification status card */}
      <Pressable
        style={[styles.verifyCard, { backgroundColor: vConfig.bg, borderColor: vConfig.border }]}
        onPress={() => router.push('/verification')}
      >
        <FontAwesome name={vConfig.icon} size={20} color={vConfig.color} />
        <View style={styles.verifyTexts}>
          <Text style={[styles.verifyTitle, { color: vConfig.color }]}>{vConfig.label}</Text>
          <Text style={styles.verifyHint}>
            {vStatus === 'APPROVED'
              ? 'Аккаунт подтверждён — вы можете принимать заказы'
              : 'Нажмите чтобы загрузить документы'}
          </Text>
        </View>
        <FontAwesome name="chevron-right" size={13} color={vConfig.color} />
      </Pressable>

      {/* Online toggle */}
      <View style={styles.card}>
        <View style={styles.onlineRow}>
          <View style={styles.onlineInfo}>
            <View style={[styles.dot, { backgroundColor: medic.isOnline ? Theme.success : Theme.textSecondary }]} />
            <View>
              <Text style={styles.onlineLabel}>
                {medic.isOnline ? 'Онлайн' : 'Офлайн'}
              </Text>
              <Text style={styles.onlineHint}>
                {medic.isOnline
                  ? 'Вы получаете новые заказы'
                  : 'Включите чтобы принимать заказы'}
              </Text>
            </View>
          </View>
          {togglingOnline ? (
            <ActivityIndicator color={Theme.primary} />
          ) : (
            <Switch
              value={medic.isOnline}
              onValueChange={handleToggleOnline}
              trackColor={{ false: Theme.border, true: `${Theme.primary}80` }}
              thumbColor={medic.isOnline ? Theme.primary : Theme.textSecondary}
            />
          )}
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{medic.experienceYears}</Text>
          <Text style={styles.statLabel}>лет опыта</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {completedCount ?? '—'}
          </Text>
          <Text style={styles.statLabel}>выполнено</Text>
        </View>
        {medic.rating != null ? (
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{Number(medic.rating).toFixed(1)}</Text>
            <Text style={styles.statLabel}>рейтинг</Text>
          </View>
        ) : (
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {Number(medic.balance).toLocaleString('ru-RU')}
            </Text>
            <Text style={styles.statLabel}>UZS баланс</Text>
          </View>
        )}
      </View>

      {/* Logout */}
      <Pressable
        style={({ pressed }) => [styles.logoutBtn, pressed && styles.logoutBtnPressed]}
        onPress={handleLogout}
      >
        <FontAwesome name="sign-out" size={16} color={Theme.error} />
        <Text style={styles.logoutText}>Выйти из аккаунта</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.background },
  content: { paddingBottom: 40 },
  header: {
    alignItems: 'center',
    paddingTop: 32,
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
  avatarText: { fontSize: 32, fontWeight: '700', color: '#fff' },
  name: { fontSize: 20, fontWeight: '700', color: '#fff' },
  phone: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  ratingText: { fontSize: 15, fontWeight: '700', color: '#fde68a' },
  verifyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  verifyTexts: { flex: 1 },
  verifyTitle: { fontSize: 15, fontWeight: '700' },
  verifyHint: { fontSize: 12, color: Theme.textSecondary, marginTop: 2 },

  card: {
    margin: 16,
    backgroundColor: Theme.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Theme.border,
  },
  onlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  onlineInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  onlineLabel: { fontSize: 16, fontWeight: '700', color: Theme.text },
  onlineHint: { fontSize: 13, color: Theme.textSecondary, marginTop: 2 },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 16,
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
  statValue: { fontSize: 20, fontWeight: '700', color: Theme.primary },
  statLabel: { fontSize: 12, color: Theme.textSecondary, marginTop: 2, textAlign: 'center' },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${Theme.error}40`,
    backgroundColor: `${Theme.error}08`,
  },
  logoutBtnPressed: { opacity: 0.8 },
  logoutText: { fontSize: 16, fontWeight: '600', color: Theme.error },
});
