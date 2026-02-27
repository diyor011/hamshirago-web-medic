import { Injectable, ConflictException, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { RegisterClientDto } from './dto/register-client.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async registerClient(dto: RegisterClientDto) {
    const existing = await this.usersService.findByPhone(dto.phone);
    if (existing) {
      throw new ConflictException('User with this phone already exists');
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create({
      phone: dto.phone,
      passwordHash,
      name: dto.name ?? null,
    });
    return { access_token: this.jwtService.sign({ sub: user.id, role: 'client' }), user: { id: user.id, phone: user.phone, name: user.name } };
  }

  async loginClient(dto: LoginDto) {
    const user = await this.usersService.findByPhone(dto.phone);
    if (!user) {
      throw new UnauthorizedException('Invalid phone or password');
    }
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid phone or password');
    }
    if (user.isBlocked) throw new ForbiddenException('Your account has been blocked. Contact support.');
    return { access_token: this.jwtService.sign({ sub: user.id, role: 'client' }), user: { id: user.id, phone: user.phone, name: user.name } };
  }

  /** Validates ADMIN_USERNAME + ADMIN_PASSWORD from env, returns a JWT with role "admin" */
  async adminLogin(username: string, password: string): Promise<{ access_token: string }> {
    const adminUsername = this.config.get<string>('ADMIN_USERNAME');
    const adminPassword = this.config.get<string>('ADMIN_PASSWORD');

    if (!adminUsername || !adminPassword) {
      throw new UnauthorizedException('Admin credentials are not configured on the server.');
    }

    if (username !== adminUsername || password !== adminPassword) {
      throw new UnauthorizedException('Invalid username or password');
    }

    const token = this.jwtService.sign(
      { sub: 'admin', role: 'admin' },
      { expiresIn: '12h' },
    );
    return { access_token: token };
  }
}
