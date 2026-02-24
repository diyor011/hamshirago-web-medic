import { useLocalSearchParams, useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Themed';
import { Theme } from '@/constants/Theme';
import {
  getServiceById,
  formatPriceRange,
  type ServiceId,
} from '@/types/services';

export default function ServiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const service = id ? getServiceById(id as ServiceId) : null;

  if (!service) {
    return (
      <View style={styles.centered}>
        <Text>Услуга не найдена</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.iconLarge}>
        <FontAwesome name={service.icon as 'medkit'} size={40} color={Theme.primary} />
      </View>
      <Text style={styles.title}>{service.title}</Text>
      <View style={styles.priceBlock}>
        <Text style={styles.priceLabel}>Стоимость</Text>
        <Text style={styles.price}>
          {formatPriceRange(service.priceMin, service.priceMax, service.currency)}
        </Text>
      </View>
      <Text style={styles.desc}>{service.description}</Text>
      {service.estimatedMinutes != null && (
        <Text style={styles.eta} lightColor={Theme.textSecondary} darkColor={Theme.textSecondary}>
          Примерно {service.estimatedMinutes} мин.
        </Text>
      )}
      <View style={styles.footer}>
        <Text
          style={styles.discountHint}
          lightColor={Theme.textSecondary}
          darkColor={Theme.textSecondary}
        >
          Первый заказ — скидка 10%
        </Text>
        <Pressable
          style={({ pressed }) => [styles.orderButton, pressed && styles.orderButtonPressed]}
          onPress={() => router.push({ pathname: '/order/location', params: { serviceId: service.id } })}
        >
          <Text style={styles.orderButtonText}>Заказать</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: Theme.background,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${Theme.primary}18`,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Theme.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  priceBlock: {
    backgroundColor: Theme.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Theme.border,
  },
  priceLabel: {
    fontSize: 13,
    color: Theme.textSecondary,
    marginBottom: 4,
  },
  price: {
    fontSize: 20,
    fontWeight: '700',
    color: Theme.primary,
  },
  desc: {
    fontSize: 15,
    lineHeight: 22,
    color: Theme.text,
    marginBottom: 12,
  },
  eta: {
    fontSize: 14,
    marginBottom: 24,
  },
  footer: {
    marginTop: 16,
  },
  discountHint: {
    fontSize: 13,
    marginBottom: 12,
  },
  orderButton: {
    backgroundColor: Theme.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderButtonPressed: {
    opacity: 0.9,
  },
  orderButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
});
