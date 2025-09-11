import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { TokenService } from './token.service';

export interface GoogleUserInfo {
  sub: string;
  email: string;
  name: string;
  picture?: string;
  email_verified: boolean;
}

@Injectable()
export class GoogleAuthService {
  private readonly oauth2Client: OAuth2Client;

  constructor(
    private readonly configService: ConfigService,
    private readonly tokenService: TokenService,
  ) {
    this.oauth2Client = new OAuth2Client(
      this.configService.get<string>('auth.google.clientId'),
      this.configService.get<string>('auth.google.clientSecret'),
      this.configService.get<string>('auth.google.redirectUri'),
    );
  }

  /**
   * Google OAuth 인증 URL 생성
   */
  generateAuthUrl(state: string, nonce: string): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['openid', 'email', 'profile'],
      state,
      nonce,
      prompt: 'consent',
      redirect_uri: this.configService.get<string>('auth.google.redirectUri'),
    });
  }

  /**
   * Authorization Code를 Access Token으로 교환
   */
  async exchangeCodeForTokens(code: string): Promise<{
    accessToken: string;
    idToken: string;
    refreshToken?: string;
  }> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);

      if (!tokens.access_token || !tokens.id_token) {
        throw new UnauthorizedException('Failed to get tokens from Google');
      }

      return {
        accessToken: tokens.access_token,
        idToken: tokens.id_token,
        refreshToken: tokens.refresh_token || undefined,
      };
    } catch (error) {
      throw new UnauthorizedException('Failed to exchange code for tokens');
    }
  }

  /**
   * ID Token 검증 및 사용자 정보 추출
   */
  async verifyIdToken(idToken: string, nonce: string): Promise<GoogleUserInfo> {
    try {
      const ticket = await this.oauth2Client.verifyIdToken({
        idToken,
        audience: this.configService.get<string>('auth.google.clientId'),
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new UnauthorizedException('Invalid ID token payload');
      }

      // Nonce 검증
      if (payload.nonce !== nonce) {
        throw new UnauthorizedException('Invalid nonce');
      }

      // 필수 필드 검증
      if (!payload.sub || !payload.email) {
        throw new UnauthorizedException('Missing required user information');
      }

      return {
        sub: payload.sub,
        email: payload.email,
        name: payload.name || '',
        picture: payload.picture,
        email_verified: payload.email_verified || false,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Failed to verify ID token');
    }
  }

  /**
   * Access Token으로 사용자 정보 조회
   */
  async getUserInfo(accessToken: string): Promise<GoogleUserInfo> {
    try {
      this.oauth2Client.setCredentials({ access_token: accessToken });

      const response = await this.oauth2Client.request({
        url: 'https://www.googleapis.com/oauth2/v2/userinfo',
      });

      const userInfo = response.data as any;

      if (!userInfo.id || !userInfo.email) {
        throw new UnauthorizedException('Invalid user information from Google');
      }

      return {
        sub: userInfo.id,
        email: userInfo.email,
        name: userInfo.name || '',
        picture: userInfo.picture,
        email_verified: userInfo.verified_email || false,
      };
    } catch (error) {
      throw new UnauthorizedException(
        'Failed to get user information from Google',
      );
    }
  }
}
