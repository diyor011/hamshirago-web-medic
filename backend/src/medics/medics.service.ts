import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Medic } from './entities/medic.entity';

@Injectable()
export class MedicsService {
  constructor(
    @InjectRepository(Medic)
    private medicRepo: Repository<Medic>,
  ) {}

  /** Simple distance approx (degrees). MVP: no PostGIS */
  private distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  async findNearby(latitude: number, longitude: number, limit = 10): Promise<Medic[]> {
    const medics = await this.medicRepo.find({
      where: { isOnline: true },
      select: ['id', 'name', 'rating', 'reviewCount', 'experienceYears', 'latitude', 'longitude'],
    });
    const withDistance = medics
      .filter((m) => m.latitude != null && m.longitude != null)
      .map((m) => ({
        ...m,
        distanceKm: this.distanceKm(
          latitude,
          longitude,
          Number(m.latitude),
          Number(m.longitude),
        ),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, limit);
    return withDistance as (Medic & { distanceKm: number })[];
  }
}
