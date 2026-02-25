import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MedicsService } from './medics.service';
import { RegisterMedicDto } from './dto/register-medic.dto';
import { LoginMedicDto } from './dto/login-medic.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { MedicAuthGuard } from '../auth/guards/medic-auth.guard';
import { MedicId } from '../auth/decorators/medic-id.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
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
  register(@Body() dto: RegisterMedicDto) {
    return this.medicsService.register(dto);
  }

  @Post('login')
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
