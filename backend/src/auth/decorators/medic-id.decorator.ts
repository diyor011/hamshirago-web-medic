import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const MedicId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<{ user?: { id: string } }>();
    return request.user?.id ?? '';
  },
);
