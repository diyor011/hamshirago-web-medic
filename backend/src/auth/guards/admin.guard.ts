import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();

    // ── Option 1: Bearer JWT with role "admin" ─────────────────────────────
    const authHeader = req.headers['authorization'];
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      try {
        const payload = this.jwtService.verify<{ sub: string; role: string }>(token, {
          secret: this.config.get<string>('JWT_SECRET'),
        });
        if (payload.role === 'admin') return true;
      } catch {
        throw new UnauthorizedException('Invalid or expired admin token');
      }
      throw new UnauthorizedException('Token does not have admin role');
    }

    // ── Option 2: Legacy X-Admin-Secret header (kept for backward compat) ──
    const secret = this.config.get<string>('ADMIN_SECRET');
    if (secret) {
      const provided = req.headers['x-admin-secret'];
      if (provided === secret) return true;
    }

    throw new UnauthorizedException('Admin authentication required');
  }
}
