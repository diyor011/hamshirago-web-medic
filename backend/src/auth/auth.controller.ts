import {
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
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterClientDto } from './dto/register-client.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AdminGuard } from './guards/admin.guard';
import { ClientId } from './decorators/client-id.decorator';
import { UsersService } from '../users/users.service';
import { WebPushService } from '../realtime/web-push.service';

interface WebPushSubscriptionBody {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly webPushService: WebPushService,
  ) {}

  @Post('register')
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  registerClient(@Body() dto: RegisterClientDto) {
    return this.authService.registerClient(dto);
  }

  @Post('login')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @HttpCode(HttpStatus.OK)
  loginClient(@Body() dto: LoginDto) {
    return this.authService.loginClient(dto);
  }

  @Patch('push-token')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async savePushToken(@ClientId() clientId: string, @Body() body: { token: string }) {
    if (body?.token) await this.usersService.savePushToken(clientId, body.token);
  }

  /** Returns the VAPID public key — must be called by the frontend before subscribing */
  @Get('vapid-public-key')
  getVapidPublicKey() {
    return { publicKey: this.webPushService.getVapidPublicKey() ?? null };
  }

  /** Save or refresh a Web Push subscription for a logged-in client */
  @Post('web-push-subscription')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async saveWebPushSubscription(
    @ClientId() clientId: string,
    @Body() body: WebPushSubscriptionBody,
    @Headers('user-agent') userAgent?: string,
  ) {
    await this.webPushService.saveSubscription({
      subscriberType: 'client',
      subscriberId: clientId,
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
      userAgent,
    });
  }

  /** Remove a Web Push subscription (called when the browser unsubscribes) */
  @Delete('web-push-subscription')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteWebPushSubscription(@Body() body: { endpoint: string }) {
    if (body?.endpoint) await this.webPushService.removeSubscription(body.endpoint);
  }

  // ── Admin ─────────────────────────────────────────────────────────────────

  /**
   * POST /auth/admin/login
   * Validates ADMIN_USERNAME + ADMIN_PASSWORD from env,
   * returns a short-lived JWT with role "admin".
   */
  @Post('admin/login')
  @HttpCode(HttpStatus.OK)
  adminLogin(@Body() body: { username: string; password: string }) {
    return this.authService.adminLogin(body.username, body.password);
  }

  @Patch('admin/users/:id/block')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  blockUser(@Param('id') id: string, @Body() body: { isBlocked: boolean }) {
    return this.usersService.blockUser(id, body.isBlocked ?? true);
  }
}
