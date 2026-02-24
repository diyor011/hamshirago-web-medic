/**
 * Mock nearby nurse/medic for Phase 2 — real data from backend later
 */
export interface NearbyNurse {
  id: string;
  name: string;
  rating: number;
  reviewCount: number;
  etaMinutes: number;
  experienceYears: number;
  distanceKm: number;
  photoUri?: string;
}

/** Mock list: 5–10 km, different ratings/ETA for dispatch logic demo */
export const MOCK_NEARBY_NURSES: NearbyNurse[] = [
  { id: '1', name: 'Мария К.', rating: 4.9, reviewCount: 124, etaMinutes: 12, experienceYears: 5, distanceKm: 2.1 },
  { id: '2', name: 'Анна С.', rating: 4.7, reviewCount: 89, etaMinutes: 18, experienceYears: 4, distanceKm: 4.5 },
  { id: '3', name: 'Елена В.', rating: 5.0, reviewCount: 56, etaMinutes: 22, experienceYears: 6, distanceKm: 6.2 },
  { id: '4', name: 'Ольга П.', rating: 4.5, reviewCount: 201, etaMinutes: 8, experienceYears: 3, distanceKm: 1.8 },
  { id: '5', name: 'Ирина Л.', rating: 4.8, reviewCount: 67, etaMinutes: 15, experienceYears: 7, distanceKm: 3.4 },
];

export function formatEta(minutes: number): string {
  if (minutes < 60) return `~${minutes} мин`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `~${h} ч ${m} мин` : `~${h} ч`;
}
