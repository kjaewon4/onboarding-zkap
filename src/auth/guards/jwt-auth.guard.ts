import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { TokenService, TokenPayload } from '../services/token.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly tokenService: TokenService,
    private readonly reflector: Reflector, // NestJS가 제공하는 유틸. 메타데이터(@Public() 같은 커스텀 데코레이터 값)를 읽어옴.
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true; // @Public() 데코레이터가 있으면 인증 건너뛰기
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: TokenPayload }>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Access token not found');
    }

    try {
      // 서명 검증 + 만료 확인
      const payload = await this.tokenService.validateToken(token);

      // 토큰 타입이 access인지 확인
      if (payload.type !== 'access') {
        throw new UnauthorizedException('Invalid token type');
      }

      // 사용자 정보를 request에 추가
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractTokenFromHeader(
    request: Request & { user?: TokenPayload },
  ): string | undefined {
    // Authorization 헤더에서 토큰 추출
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    if (type === 'Bearer' && token) {
      return token;
    }

    // 쿠키에서 토큰 추출
    return request.cookies?.access_token as string | undefined;
  }
}
