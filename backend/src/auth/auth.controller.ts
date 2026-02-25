import { Body, Controller, Post, Patch, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterClientDto } from './dto/register-client.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ClientId } from './decorators/client-id.decorator';
import { UsersService } from '../users/users.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
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
}
