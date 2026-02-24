import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { RegisterClientDto } from './dto/register-client.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
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
    return { access_token: this.jwtService.sign({ sub: user.id }), user: { id: user.id, phone: user.phone, name: user.name } };
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
    return { access_token: this.jwtService.sign({ sub: user.id }), user: { id: user.id, phone: user.phone, name: user.name } };
  }
}
