import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Medic } from './entities/medic.entity';
import { VerificationStatus } from './entities/verification-status.enum';
import { RegisterMedicDto } from './dto/register-medic.dto';
import { LoginMedicDto } from './dto/login-medic.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { VerifyMedicDto } from './dto/verify-medic.dto';

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
    if (medic.isBlocked) throw new ForbiddenException('Your account has been blocked. Contact support.');
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
        verificationStatus: medic.verificationStatus,
        facePhotoUrl: medic.facePhotoUrl,
        licensePhotoUrl: medic.licensePhotoUrl,
        verificationRejectedReason: medic.verificationRejectedReason,
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
      isBlocked: medic.isBlocked,
      verificationStatus: medic.verificationStatus,
      facePhotoUrl: medic.facePhotoUrl,
      licensePhotoUrl: medic.licensePhotoUrl,
      verificationRejectedReason: medic.verificationRejectedReason,
      latitude: medic.latitude,
      longitude: medic.longitude,
      telegramChatId: medic.telegramChatId,
    };
  }

  // ── Documents upload ──────────────────────────────────────────────────────

  async saveDocumentUrls(
    id: string,
    facePhotoUrl: string | null,
    licensePhotoUrl: string | null,
  ): Promise<void> {
    const update: Partial<Medic> = {};
    if (facePhotoUrl) update.facePhotoUrl = facePhotoUrl;
    if (licensePhotoUrl) update.licensePhotoUrl = licensePhotoUrl;
    if (!Object.keys(update).length) throw new BadRequestException('No files provided');

    // Re-set status to PENDING whenever documents are (re-)uploaded
    update.verificationStatus = VerificationStatus.PENDING;
    update.verificationRejectedReason = null;
    await this.medicRepo.update(id, update);
  }

  // ── Admin: verify / block ─────────────────────────────────────────────────

  async verifyMedic(id: string, dto: VerifyMedicDto): Promise<Medic> {
    const medic = await this.findById(id);
    if (!medic) throw new NotFoundException('Medic not found');

    medic.verificationStatus = dto.status;
    medic.verificationRejectedReason =
      dto.status === VerificationStatus.REJECTED ? (dto.reason ?? null) : null;

    return this.medicRepo.save(medic);
  }

  async blockMedic(id: string, isBlocked: boolean): Promise<void> {
    const medic = await this.findById(id);
    if (!medic) throw new NotFoundException('Medic not found');
    await this.medicRepo.update(id, { isBlocked });
  }

  /** Returns pending medics awaiting review (for admin dashboard) */
  async getPendingVerifications(): Promise<Partial<Medic>[]> {
    return this.medicRepo.find({
      where: { verificationStatus: VerificationStatus.PENDING },
      select: ['id', 'name', 'phone', 'facePhotoUrl', 'licensePhotoUrl', 'created_at'],
      order: { created_at: 'ASC' },
    });
  }

  async updateLocation(id: string, dto: UpdateLocationDto): Promise<void> {
    await this.medicRepo.update(id, {
      isOnline: dto.isOnline,
      ...(dto.latitude != null ? { latitude: dto.latitude } : {}),
      ...(dto.longitude != null ? { longitude: dto.longitude } : {}),
    });
  }

  async savePushToken(id: string, token: string): Promise<void> {
    await this.medicRepo.update(id, { pushToken: token });
  }

  async updateRating(id: string, rating: number, reviewCount: number): Promise<void> {
    await this.medicRepo.update(id, { rating, reviewCount });
  }

  async addBalance(id: string, amount: number): Promise<void> {
    await this.medicRepo.increment({ id }, 'balance', amount);
  }

  async getOnlinePushTokens(): Promise<string[]> {
    const medics = await this.medicRepo.find({
      where: { isOnline: true },
      select: ['pushToken'],
    });
    return medics
      .map((m) => m.pushToken)
      .filter((t): t is string => !!t);
  }

  /** Save Telegram chat_id for the medic (called after /start in bot) */
  async saveTelegramChatId(id: string, chatId: string | null): Promise<void> {
    await this.medicRepo.update(id, { telegramChatId: chatId });
  }

  /** Returns chat_ids of all online medics (for new order broadcast) */
  async getOnlineTelegramChatIds(): Promise<string[]> {
    const medics = await this.medicRepo.find({
      where: { isOnline: true },
      select: ['telegramChatId'],
    });
    return medics
      .map((m) => m.telegramChatId)
      .filter((t): t is string => !!t);
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
