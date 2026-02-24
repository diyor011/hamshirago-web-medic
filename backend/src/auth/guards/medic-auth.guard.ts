import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class MedicAuthGuard extends AuthGuard('jwt') implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    await super.canActivate(context);
    const request = context.switchToHttp().getRequest<{ user?: { id: string; role: string } }>();
    if (!request.user) throw new UnauthorizedException();
    if (request.user.role !== 'medic') throw new ForbiddenException('Medic access only');
    return true;
  }
}
