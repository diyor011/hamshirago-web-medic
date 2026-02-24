/**
 * Service types for HamshiraGo — client order flow
 */
export type ServiceId = 'injection' | 'iv_drip' | 'blood_pressure' | 'long_term_care';

export interface ServiceItem {
  id: ServiceId;
  title: string;
  titleRu?: string;
  description: string;
  priceMin: number;
  priceMax: number;
  currency: string;
  icon: string; // FontAwesome name
  estimatedMinutes?: number;
}

export const SERVICES: ServiceItem[] = [
  {
    id: 'injection',
    title: 'Injection',
    titleRu: 'Укол',
    description: 'Professional injection at home — intramuscular or subcutaneous. Sterile materials, experienced nurse.',
    priceMin: 80000,
    priceMax: 120000,
    currency: 'UZS',
    icon: 'medkit',
    estimatedMinutes: 15,
  },
  {
    id: 'iv_drip',
    title: 'IV drip',
    titleRu: 'Капельница',
    description: 'IV infusion at home. We bring everything needed. Safe and comfortable.',
    priceMin: 150000,
    priceMax: 250000,
    currency: 'UZS',
    icon: 'tint',
    estimatedMinutes: 45,
  },
  {
    id: 'blood_pressure',
    title: 'Blood pressure',
    titleRu: 'Давление',
    description: 'Blood pressure measurement, basic check-up, recommendations.',
    priceMin: 50000,
    priceMax: 80000,
    currency: 'UZS',
    icon: 'heartbeat',
    estimatedMinutes: 20,
  },
  {
    id: 'long_term_care',
    title: 'Long-term care',
    titleRu: 'Долговременный уход',
    description: 'Regular visits, wound care, injections, monitoring. For elderly or post-hospital care.',
    priceMin: 200000,
    priceMax: 400000,
    currency: 'UZS',
    icon: 'user',
    estimatedMinutes: 60,
  },
];

export function getServiceById(id: ServiceId): ServiceItem | undefined {
  return SERVICES.find((s) => s.id === id);
}

export function formatPrice(value: number, currency: string): string {
  return `${value.toLocaleString('ru-RU')} ${currency}`;
}

export function formatPriceRange(min: number, max: number, currency: string): string {
  return `${min.toLocaleString('ru-RU')} – ${max.toLocaleString('ru-RU')} ${currency}`;
}
