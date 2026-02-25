import { Throttle } from '@nestjs/throttler';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { MedicsService } from './medics.service';
import { RegisterMedicDto } from './dto/register-medic.dto';
import { LoginMedicDto } from './dto/login-medic.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { VerifyMedicDto } from './dto/verify-medic.dto';
import { MedicAuthGuard } from '../auth/guards/medic-auth.guard';
import { MedicId } from '../auth/decorators/medic-id.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { WebPushService } from '../realtime/web-push.service';

interface WebPushSubscriptionBody {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

@Controller('medics')
export class MedicsController {
  constructor(
    private readonly medicsService: MedicsService,
    private readonly webPushService: WebPushService,
  ) {}

  // ── Auth ──────────────────────────────────────────────────────────────────

  @Post('register')
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  register(@Body() dto: RegisterMedicDto) {
    return this.medicsService.register(dto);
  }

  @Post('login')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginMedicDto) {
    return this.medicsService.login(dto);
  }

  // ── Profile ───────────────────────────────────────────────────────────────

  @Get('me')
  @UseGuards(MedicAuthGuard)
  getProfile(@MedicId() medicId: string) {
    return this.medicsService.getProfile(medicId);
  }

  // ── Location & online status ──────────────────────────────────────────────

  @Patch('location')
  @UseGuards(MedicAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async updateLocation(@MedicId() medicId: string, @Body() dto: UpdateLocationDto) {
    await this.medicsService.updateLocation(medicId, dto);
  }

  // ── Documents upload ──────────────────────────────────────────────────────

  @Post('documents')
  @UseGuards(MedicAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'facePhoto', maxCount: 1 },
        { name: 'licensePhoto', maxCount: 1 },
      ],
      {
        storage: diskStorage({
          destination: (_req, _file, cb) => {
            const uploadDir = join(process.cwd(), 'uploads', 'medic-docs');
            if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });
            cb(null, uploadDir);
          },
          filename: (_req, file, cb) => {
            const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
            cb(null, `${unique}${extname(file.originalname)}`);
          },
        }),
        limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max per file
        fileFilter: (_req, file, cb) => {
          const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
          if (!allowed.includes(extname(file.originalname).toLowerCase())) {
            return cb(new BadRequestException('Only jpg/jpeg/png/webp files are allowed'), false);
          }
          cb(null, true);
        },
      },
    ),
  )
  async uploadDocuments(
    @MedicId() medicId: string,
    @UploadedFiles() files: { facePhoto?: Express.Multer.File[]; licensePhoto?: Express.Multer.File[] },
  ) {
    const faceUrl = files.facePhoto?.[0]
      ? `/uploads/medic-docs/${files.facePhoto[0].filename}`
      : null;
    const licenseUrl = files.licensePhoto?.[0]
      ? `/uploads/medic-docs/${files.licensePhoto[0].filename}`
      : null;
    await this.medicsService.saveDocumentUrls(medicId, faceUrl, licenseUrl);
  }

  // ── Admin endpoints ───────────────────────────────────────────────────────

  /** List all medics with PENDING verification — for operator dashboard */
  @Get('admin/pending')
  @UseGuards(AdminGuard)
  getPendingVerifications() {
    return this.medicsService.getPendingVerifications();
  }

  @Patch('admin/:id/verify')
  @UseGuards(AdminGuard)
  verifyMedic(@Param('id') id: string, @Body() dto: VerifyMedicDto) {
    return this.medicsService.verifyMedic(id, dto);
  }

  @Patch('admin/:id/block')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  blockMedic(@Param('id') id: string, @Body() body: { isBlocked: boolean }) {
    return this.medicsService.blockMedic(id, body.isBlocked ?? true);
  }

  // ── Push token (Expo) ────────────────────────────────────────────────────

  @Patch('push-token')
  @UseGuards(MedicAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async savePushToken(@MedicId() medicId: string, @Body() body: { token: string }) {
    if (body?.token) await this.medicsService.savePushToken(medicId, body.token);
  }

  // ── Web Push ──────────────────────────────────────────────────────────────

  @Post('web-push-subscription')
  @UseGuards(MedicAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async saveWebPushSubscription(
    @MedicId() medicId: string,
    @Body() body: WebPushSubscriptionBody,
    @Headers('user-agent') userAgent?: string,
  ) {
    await this.webPushService.saveSubscription({
      subscriberType: 'medic',
      subscriberId: medicId,
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
      userAgent,
    });
  }

  @Delete('web-push-subscription')
  @UseGuards(MedicAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteWebPushSubscription(@Body() body: { endpoint: string }) {
    if (body?.endpoint) await this.webPushService.removeSubscription(body.endpoint);
  }

  // ── Nearby (used by client app) ───────────────────────────────────────────

  @Get('nearby')
  @UseGuards(JwtAuthGuard)
  nearby(
    @Query('latitude') latitude: string,
    @Query('longitude') longitude: string,
    @Query('limit') limit?: string,
  ) {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return [];
    return this.medicsService.findNearby(lat, lng, limit ? parseInt(limit, 10) : 10);
  }
}
