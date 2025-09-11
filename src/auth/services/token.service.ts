import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { ulid } from 'ulid';

export interface TokenPayload {
  sub: string; // user id
  jti: string; // jwt id
  type: 'access' | 'refresh';
  iat: number;
  exp: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    private readonly configService: ConfigService,
  ) {}

  /**
   * JWT 토큰 쌍 생성
   */
  async generateTokenPair(userId: string): Promise<TokenPair> {
    const now = Math.floor(Date.now() / 1000);
    const accessJti = ulid();
    const refreshJti = ulid();

    const accessTokenPayload: TokenPayload = {
      sub: userId,
      jti: accessJti,
      type: 'access',
      iat: now,
      exp: now + this.getAccessTokenExpiry(),
    };

    const refreshTokenPayload: TokenPayload = {
      sub: userId,
      jti: refreshJti,
      type: 'refresh',
      iat: now,
      exp: now + this.getRefreshTokenExpiry(),
    };

    const accessToken = this.jwtService.sign(accessTokenPayload);
    const refreshToken = this.jwtService.sign(refreshTokenPayload);

    // Redis에 토큰 저장
    await this.storeTokens(accessJti, refreshJti, userId);

    return { accessToken, refreshToken };
  }

  /**
   * 토큰 검증
   */
  async validateToken(token: string): Promise<TokenPayload> {
    try {
      const payload = this.jwtService.verify(token);

      // Redis에서 토큰 상태 확인
      const isAllowed = await this.redis.get(
        `allow:${payload.type}:${payload.jti}`,
      );
      if (!isAllowed) {
        throw new UnauthorizedException('Token is not allowed');
      }

      return payload as TokenPayload;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }

  /**
   * 토큰 무효화 (로그아웃)
   */
  async revokeTokens(accessJti: string, refreshJti: string): Promise<void> {
    await Promise.all([
      this.redis.del(`allow:access:${accessJti}`),
      this.redis.del(`allow:refresh:${refreshJti}`),
    ]);
  }

  /**
   * Refresh Token으로 새로운 Access Token 발급
   */
  async refreshAccessToken(
    refreshToken: string,
  ): Promise<{ accessToken: string }> {
    const payload = await this.validateToken(refreshToken);

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    // 새로운 Access Token 생성
    const now = Math.floor(Date.now() / 1000);
    const newAccessJti = ulid();

    const accessTokenPayload: TokenPayload = {
      sub: payload.sub,
      jti: newAccessJti,
      type: 'access',
      iat: now,
      exp: now + this.getAccessTokenExpiry(),
    };

    const accessToken = this.jwtService.sign(accessTokenPayload);

    // 새로운 Access Token을 Redis에 저장
    await this.redis.setex(
      `allow:access:${newAccessJti}`,
      this.getAccessTokenExpiry(),
      payload.sub,
    );

    return { accessToken };
  }

  /**
   * State/Nonce 저장 (OAuth 플로우용)
   */
  async storeStateNonce(
    state: string,
    nonce: string,
    expiresIn: number = 600,
  ): Promise<void> {
    await this.redis.setex(`state:${state}`, expiresIn, nonce);
  }

  /**
   * State/Nonce 검증
   */
  async validateStateNonce(state: string, nonce: string): Promise<boolean> {
    const storedNonce = await this.redis.get(`state:${state}`);
    if (!storedNonce) {
      return false;
    }

    await this.redis.del(`state:${state}`);
    return storedNonce === nonce;
  }

  /**
   * 사용자별 토큰 락 (동시 로그인 방지)
   */
  async lockUserAuth(
    provider: string,
    sub: string,
    ttl: number = 30,
  ): Promise<boolean> {
    const lockKey = `lock:auth:${provider}:${sub}`;
    const result = await this.redis.set(lockKey, '1', 'EX', ttl, 'NX');
    return result === 'OK';
  }

  /**
   * 사용자별 토큰 락 해제
   */
  async unlockUserAuth(provider: string, sub: string): Promise<void> {
    await this.redis.del(`lock:auth:${provider}:${sub}`);
  }

  private async storeTokens(
    accessJti: string,
    refreshJti: string,
    userId: string,
  ): Promise<void> {
    const accessExpiry = this.getAccessTokenExpiry();
    const refreshExpiry = this.getRefreshTokenExpiry();

    await Promise.all([
      this.redis.setex(`allow:access:${accessJti}`, accessExpiry, userId),
      this.redis.setex(`allow:refresh:${refreshJti}`, refreshExpiry, userId),
    ]);
  }

  private getAccessTokenExpiry(): number {
    const expiresIn = this.configService.get<string>(
      'auth.jwt.expiresIn',
      '15m',
    );
    return this.parseExpiry(expiresIn);
  }

  private getRefreshTokenExpiry(): number {
    const expiresIn = this.configService.get<string>(
      'auth.jwt.refreshExpiresIn',
      '7d',
    );
    return this.parseExpiry(expiresIn);
  }

  private parseExpiry(expiresIn: string): number {
    const unit = expiresIn.slice(-1);
    const value = parseInt(expiresIn.slice(0, -1), 10);

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 60 * 60 * 24;
      default:
        return 15 * 60; // 15분 기본값
    }
  }
}
