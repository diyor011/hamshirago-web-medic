import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { MedicsService } from './medics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('medics')
export class MedicsController {
  constructor(private readonly medicsService: MedicsService) {}

  @Get('nearby')
  @UseGuards(JwtAuthGuard)
  nearby(
    @Query('latitude') latitude: string,
    @Query('longitude') longitude: string,
    @Query('limit') limit?: string,
  ) {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return [];
    }
    return this.medicsService.findNearby(lat, lng, limit ? parseInt(limit, 10) : 10);
  }
}
