import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Medic } from './entities/medic.entity';
import { VerificationStatus } from './entities/verification-status.enum';
import { RegisterMedicDto } from './dto/register-medic.dto';
import { LoginMedicDto } from './dto/login-medic.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { VerifyMedicDto } from './dto/verify-medic.dto';
import { Order } from '../orders/entities/order.entity';
import { OrderStatus } from '../orders/entities/order-status.enum';
import { OrderEventsGateway } from '../realtime/order-events.gateway';

const ONLINE_IDLE_LIMIT_MS = 5 * 60 * 60 * 1000; // 5 hours

@Injectable()
export class MedicsService {
  constructor(
    @InjectRepository(Medic)
    private medicRepo: Repository<Medic>,
    @InjectRepository(Order)
    private orderRepo: Repository<Order>,
    private jwtService: JwtService,
    private readonly orderEventsGateway: OrderEventsGateway,
  ) {}

  private onlineCutoffDate(): Date {
    return new Date(Date.now() - ONLINE_IDLE_LIMIT_MS);
  }

  private isMedicOnlineStale(medic: Medic): boolean {
    if (!medic.isOnline) return false;
    if (!medic.lastSeenAt) return true;
    return new Date(medic.lastSeenAt).getTime() < this.onlineCutoffDate().getTime();
  }

  private async autoDisableStaleOnlineMedics(): Promise<void> {
    await this.medicRepo
      .createQueryBuilder()
      .update(Medic)
      .set({ isOnline: false })
      .where('isOnline = :isOnline', { isOnline: true })
      .andWhere('(lastSeenAt IS NULL OR lastSeenAt < :cutoff)', { cutoff: this.onlineCutoffDate() })
      .execute();
  }

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
      lastSeenAt: new Date(),
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

    let onlineDisabledReason: 'INACTIVE_5H' | null = null;
    if (this.isMedicOnlineStale(medic)) {
      await this.medicRepo.update(medic.id, { isOnline: false });
      medic.isOnline = false;
      onlineDisabledReason = 'INACTIVE_5H';
    }

    medic.lastSeenAt = new Date();
    await this.medicRepo.update(medic.id, { lastSeenAt: medic.lastSeenAt });

    return this.toAuthResponse(medic, onlineDisabledReason);
  }

  private toAuthResponse(medic: Medic, onlineDisabledReason: 'INACTIVE_5H' | null = null) {
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
        onlineDisabledReason,
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

    let onlineDisabledReason: 'INACTIVE_5H' | null = null;
    if (this.isMedicOnlineStale(medic)) {
      await this.medicRepo.update(id, { isOnline: false });
      medic.isOnline = false;
      onlineDisabledReason = 'INACTIVE_5H';
    }

    medic.lastSeenAt = new Date();
    await this.medicRepo.update(id, { lastSeenAt: medic.lastSeenAt });

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
      onlineDisabledReason,
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

  async findAllAdmin(
    page = 1,
    limit = 20,
    search?: string,
    verificationStatus?: VerificationStatus,
    isBlocked?: boolean,
    isOnline?: boolean,
  ): Promise<{ data: Partial<Medic>[]; total: number; page: number; totalPages: number }> {
    const take = Math.min(Math.max(limit, 1), 100);
    const skip = (Math.max(page, 1) - 1) * take;

    const qb = this.medicRepo
      .createQueryBuilder('medic')
      .select([
        'medic.id',
        'medic.phone',
        'medic.name',
        'medic.experienceYears',
        'medic.rating',
        'medic.reviewCount',
        'medic.balance',
        'medic.isOnline',
        'medic.isBlocked',
        'medic.verificationStatus',
        'medic.facePhotoUrl',
        'medic.licensePhotoUrl',
        'medic.verificationRejectedReason',
        'medic.latitude',
        'medic.longitude',
        'medic.created_at',
        'medic.updated_at',
      ])
      .orderBy('medic.created_at', 'DESC')
      .take(take)
      .skip(skip);

    if (search?.trim()) {
      qb.andWhere('(medic.phone ILIKE :q OR medic.name ILIKE :q)', {
        q: `%${search.trim()}%`,
      });
    }

    if (verificationStatus) {
      qb.andWhere('medic.verificationStatus = :verificationStatus', { verificationStatus });
    }
    if (typeof isBlocked === 'boolean') {
      qb.andWhere('medic.isBlocked = :isBlocked', { isBlocked });
    }
    if (typeof isOnline === 'boolean') {
      qb.andWhere('medic.isOnline = :isOnline', { isOnline });
    }

    const [data, total] = await qb.getManyAndCount();
    return {
      data,
      total,
      page: Math.max(page, 1),
      totalPages: Math.ceil(total / take),
    };
  }

  async updateLocation(id: string, dto: UpdateLocationDto): Promise<void> {
    await this.medicRepo.update(id, {
      isOnline: dto.isOnline,
      ...(dto.latitude != null ? { latitude: dto.latitude } : {}),
      ...(dto.longitude != null ? { longitude: dto.longitude } : {}),
      lastSeenAt: new Date(),
    });

    if (dto.latitude == null || dto.longitude == null) return;

    const activeOrder = await this.orderRepo.findOne({
      where: {
        medicId: id,
        status: In([
          OrderStatus.ASSIGNED,
          OrderStatus.ACCEPTED,
          OrderStatus.ON_THE_WAY,
          OrderStatus.ARRIVED,
          OrderStatus.SERVICE_STARTED,
        ]),
      },
      order: { updated_at: 'DESC' },
      select: ['id'],
    });

    if (!activeOrder) return;

    this.orderEventsGateway.emitMedicLocation(
      activeOrder.id,
      id,
      dto.latitude,
      dto.longitude,
      'rest',
    );
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
    await this.autoDisableStaleOnlineMedics();
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
    await this.autoDisableStaleOnlineMedics();
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
    await this.autoDisableStaleOnlineMedics();
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
