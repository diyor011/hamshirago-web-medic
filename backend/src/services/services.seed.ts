import { DataSource } from 'typeorm';
import { Service } from './entities/service.entity';

export const SERVICES_SEED: Partial<Service>[] = [
  // ── Уколы ──────────────────────────────────────────────────────────────────
  {
    title: 'Внутримышечный укол',
    description: 'Введение лекарства внутримышечно',
    category: 'Уколы',
    price: 35000,
    durationMinutes: 15,
    sortOrder: 1,
  },
  {
    title: 'Внутривенный укол',
    description: 'Введение лекарства внутривенно (струйно)',
    category: 'Уколы',
    price: 50000,
    durationMinutes: 20,
    sortOrder: 2,
  },
  // ── Капельницы ─────────────────────────────────────────────────────────────
  {
    title: 'Капельница (1 флакон)',
    description: 'Внутривенное капельное введение, 1 флакон',
    category: 'Капельницы',
    price: 80000,
    durationMinutes: 60,
    sortOrder: 1,
  },
  {
    title: 'Капельница (2 флакона)',
    description: 'Внутривенное капельное введение, 2 флакона',
    category: 'Капельницы',
    price: 140000,
    durationMinutes: 120,
    sortOrder: 2,
  },
  // ── Анализы ────────────────────────────────────────────────────────────────
  {
    title: 'Забор крови из вены',
    description: 'Венозная кровь на анализы',
    category: 'Анализы',
    price: 40000,
    durationMinutes: 10,
    sortOrder: 1,
  },
  {
    title: 'Забор крови из пальца',
    description: 'Капиллярная кровь на общий анализ',
    category: 'Анализы',
    price: 25000,
    durationMinutes: 10,
    sortOrder: 2,
  },
  // ── Перевязки ──────────────────────────────────────────────────────────────
  {
    title: 'Перевязка',
    description: 'Смена повязки, обработка раны',
    category: 'Перевязки',
    price: 60000,
    durationMinutes: 20,
    sortOrder: 1,
  },
  // ── Измерения ──────────────────────────────────────────────────────────────
  {
    title: 'Измерение давления и пульса',
    description: 'Тонометрия + ЧСС',
    category: 'Измерения',
    price: 20000,
    durationMinutes: 10,
    sortOrder: 1,
  },
  {
    title: 'ЭКГ на дому',
    description: 'Электрокардиограмма с расшифровкой',
    category: 'Измерения',
    price: 150000,
    durationMinutes: 30,
    sortOrder: 2,
  },
  // ── Уход ───────────────────────────────────────────────────────────────────
  {
    title: 'Уход за лежачим пациентом (1 час)',
    description: 'Гигиенические процедуры, помощь с питанием',
    category: 'Уход',
    price: 100000,
    durationMinutes: 60,
    sortOrder: 1,
  },
];

export async function seedServices(dataSource: DataSource): Promise<void> {
  const repo = dataSource.getRepository(Service);
  for (const item of SERVICES_SEED) {
    const exists = await repo.findOne({ where: { title: item.title } });
    if (!exists) {
      await repo.save(repo.create(item));
    }
  }
  console.log(`[Seed] Services table seeded (${SERVICES_SEED.length} entries)`);
}
