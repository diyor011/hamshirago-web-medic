import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Text } from '@/components/Themed';
import { Theme } from '@/constants/Theme';
import { apiFetch } from '@/constants/api';
import { ServiceCard } from '@/components/ServiceCard';

interface CatalogService {
  id: string;
  title: string;
  price: number;
  durationMinutes: number | null;
  category: string | null;
}

export default function HomeScreen() {
  const [services, setServices] = useState<CatalogService[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<CatalogService[]>('/services')
      .then(setServices)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Group by category
  const categories = [...new Set(services.map((s) => s.category ?? 'Прочее'))];

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={Theme.bannerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.banner}
      >
        <Text style={styles.bannerTitle}>HamshiraGo</Text>
        <Text style={styles.bannerSubtitle}>Медсёстры с опытом 3+ лет</Text>
      </LinearGradient>

      {loading ? (
        <ActivityIndicator color={Theme.primary} style={{ marginTop: 32 }} />
      ) : (
        categories.map((cat) => (
          <View key={cat}>
            <Text style={styles.sectionTitle}>{cat}</Text>
            {services
              .filter((s) => (s.category ?? 'Прочее') === cat)
              .map((service) => (
                <ServiceCard
                  key={service.id}
                  service={{
                    id: service.id,
                    title: service.title,
                    price: service.price,
                    durationMinutes: service.durationMinutes,
                  }}
                />
              ))}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: Theme.background,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  banner: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
  },
  bannerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  bannerSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },
  discountBadge: {
    backgroundColor: `${Theme.warning}20`,
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: `${Theme.warning}40`,
  },
  discountText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#854d0e',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Theme.text,
    marginBottom: 12,
  },
});
