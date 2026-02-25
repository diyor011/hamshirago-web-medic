import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UseGuards,
  Headers,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterClientDto } from './dto/register-client.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
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
  registerClient(@Body() dto: RegisterClientDto) {
    return this.authService.registerClient(dto);
  }

  @Post('login')
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
}
