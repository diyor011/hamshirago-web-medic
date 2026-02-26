import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

/**
 * Simple admin guard — checks the X-Admin-Secret header against
 * the ADMIN_SECRET environment variable.
 *
 * For a production setup this should be replaced with a proper
 * admin role inside the JWT, but this is sufficient for MVP operator usage.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const secret = this.config.get<string>('ADMIN_SECRET');

    if (!secret) {
      throw new UnauthorizedException('Admin access is not configured (ADMIN_SECRET missing)');
    }

    const provided = req.headers['x-admin-secret'];
    if (!provided || provided !== secret) {
      throw new UnauthorizedException('Invalid admin secret');
    }

    return true;
  }
}
