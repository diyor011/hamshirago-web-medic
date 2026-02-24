import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Medic } from './entities/medic.entity';
import { RegisterMedicDto } from './dto/register-medic.dto';
import { LoginMedicDto } from './dto/login-medic.dto';
import { UpdateLocationDto } from './dto/update-location.dto';

@Injectable()
export class MedicsService {
  constructor(
    @InjectRepository(Medic)
    private medicRepo: Repository<Medic>,
    private jwtService: JwtService,
  ) {}

  // ── Auth ──────────────────────────────────────────────────────────────────

  async register(dto: RegisterMedicDto) {
    const existing = await this.medicRepo.findOne({ where: { phone: dto.phone } });
    if (existing) throw new ConflictException('Medic with this phone already exists');
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const medic = this.medicRepo.create({
      phone: dto.phone,
      name: dto.name,
      passwordHash,
      experienceYears: dto.experienceYears ?? 0,
    });
    const saved = await this.medicRepo.save(medic);
    return this.toAuthResponse(saved);
  }

  async login(dto: LoginMedicDto) {
    const medic = await this.medicRepo.findOne({ where: { phone: dto.phone } });
    if (!medic) throw new UnauthorizedException('Invalid phone or password');
    const ok = await bcrypt.compare(dto.password, medic.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid phone or password');
    return this.toAuthResponse(medic);
  }

  private toAuthResponse(medic: Medic) {
    const access_token = this.jwtService.sign({ sub: medic.id, role: 'medic' });
    return {
      access_token,
      medic: {
        id: medic.id,
        phone: medic.phone,
        name: medic.name,
        experienceYears: medic.experienceYears,
        rating: medic.rating,
        balance: medic.balance,
        isOnline: medic.isOnline,
      },
    };
  }

  // ── Profile & location ────────────────────────────────────────────────────

  async findById(id: string): Promise<Medic | null> {
    return this.medicRepo.findOne({ where: { id } });
  }

  async getProfile(id: string) {
    const medic = await this.findById(id);
    if (!medic) throw new UnauthorizedException();
    return {
      id: medic.id,
      phone: medic.phone,
      name: medic.name,
      experienceYears: medic.experienceYears,
      rating: medic.rating,
      reviewCount: medic.reviewCount,
      balance: medic.balance,
      isOnline: medic.isOnline,
      latitude: medic.latitude,
      longitude: medic.longitude,
    };
  }

  async updateLocation(id: string, dto: UpdateLocationDto): Promise<void> {
    await this.medicRepo.update(id, {
      isOnline: dto.isOnline,
      ...(dto.latitude != null ? { latitude: dto.latitude } : {}),
      ...(dto.longitude != null ? { longitude: dto.longitude } : {}),
    });
  }

  // ── Nearby (used by client app) ───────────────────────────────────────────

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
