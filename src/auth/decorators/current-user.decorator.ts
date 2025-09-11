import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TokenPayload } from '../services/token.service';

export const CurrentUser = createParamDecorator(
  (
    data: keyof TokenPayload | undefined,
    ctx: ExecutionContext,
  ): TokenPayload | any => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as TokenPayload;

    return data ? user?.[data] : user;
  },
);
