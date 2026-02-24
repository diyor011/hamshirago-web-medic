import {
  Body,
  Controller,
  Get,
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

@Controller('medics')
export class MedicsController {
  constructor(private readonly medicsService: MedicsService) {}

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
