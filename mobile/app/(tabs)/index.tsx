import { ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/Themed';
import { ServiceCard } from '@/components/ServiceCard';
import { Theme } from '@/constants/Theme';
import { SERVICES } from '@/types/services';

export default function HomeScreen() {
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Banner: 3+ years experienced nurses */}
      <LinearGradient
        colors={Theme.bannerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.banner}
      >
        <Text style={styles.bannerTitle}>HamshiraGo</Text>
        <Text style={styles.bannerSubtitle}>Медсёстры с опытом 3+ лет</Text>
      </LinearGradient>

      {/* First order discount */}
      <View style={styles.discountBadge}>
        <Text style={styles.discountText}>Скидка 10% на первый заказ</Text>
      </View>

      {/* Service cards */}
      <Text style={styles.sectionTitle}>Услуги</Text>
      {SERVICES.map((service) => (
        <ServiceCard key={service.id} service={service} />
      ))}
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
