import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Res,
  Req,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { GoogleAuthService } from './services/google-auth.service';
import { TokenService } from './services/token.service';
import { UserService } from '../user/user.service';
import * as crypto from 'crypto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from './decorators/public.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly googleAuthService: GoogleAuthService,
    private readonly tokenService: TokenService,
    private readonly userService: UserService,
  ) {}

  @Get('google')
  @Public()
  @ApiOperation({ summary: 'Google OAuth 인증 시작' })
  @ApiResponse({ status: 302, description: 'Google OAuth 페이지로 리다이렉트' })
  googleAuth(@Req() req: Request, @Res() res: Response) {
    // 세션 기반으로 state와 nonce 생성
    const state = crypto.randomBytes(32).toString('hex');
    const nonce = crypto.randomBytes(32).toString('hex');

    // 세션에 저장
    req.session.oauthState = state;
    req.session.oauthNonce = nonce;

    // 승인 매개변수 설정
    const authUrl = this.googleAuthService.generateAuthUrl(state, nonce);

    // Google의 OAuth 2.0 서버로 리디렉션
    res.redirect(authUrl);
  }

  @Get('callback')
  @Public()
  @ApiOperation({ summary: 'Google OAuth 콜백 처리' })
  @ApiResponse({ status: 200, description: '인증 성공' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  async googleCallback(
    @Req() req: Request,
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    try {
      if (!code || !state) {
        throw new UnauthorizedException('Missing authorization code or state');
      }

      // 세션에서 state 검증
      if (state !== req.session.oauthState) {
        throw new UnauthorizedException('State mismatch. Possible CSRF attack');
      }

      const nonce = req.session.oauthNonce;
      if (!nonce) {
        throw new UnauthorizedException('Missing nonce in session');
      }

      // Authorization Code를 토큰으로 교환
      const { accessToken: googleAccessToken, idToken: googleIdToken } =
        await this.googleAuthService.exchangeCodeForTokens(code);

      // ID Token 검증(Nonce 검증) 및 사용자 정보 추출
      const googleUser = await this.googleAuthService.verifyIdToken(
        googleIdToken,
        nonce,
      );

      // 세션 정리
      delete req.session.oauthState;
      delete req.session.oauthNonce;

      // 사용자 조회 또는 생성
      let user = await this.userService.findByProviderAndSub(
        'google',
        googleUser.sub,
      );

      if (!user) {
        // 신규 사용자 - 약관 동의 필요
        try {
          user = await this.userService.create({
            email: googleUser.email,
            provider: 'google',
            sub: googleUser.sub,
            termAgreed: false,
            agreedAt: null,
          });
        } catch (error) {
          // 중복 사용자 생성 시도 시 기존 사용자 조회
          if (error.code === '23505') {
            // PostgreSQL unique violation
            user = await this.userService.findByProviderAndSub(
              'google',
              googleUser.sub,
            );
            if (!user) {
              throw new UnauthorizedException(
                'User creation failed. already exists.',
              );
            }
          } else {
            throw error;
          }
        }
      }

      // 약관 미동의 사용자
      if (!user.termAgreed) {
        res.redirect(
          `${process.env.FRONTEND_URL}/terms.html?user_id=${user.id}`,
        );
        return;
      }

      // 약관 동의된 사용자 - JWT 토큰 발급 및 대시보드 리다이렉트
      await this.tokenService.setJwtTokensAndRedirect(
        this.userService,
        user.id,
        res,
        `${process.env.FRONTEND_URL}/dashboard.html`,
      );
    } catch (error) {
      console.error('Google OAuth callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/login.html?error=auth_failed`);
    }
  }

  @Post('refresh')
  @Public()
  @ApiOperation({ summary: '토큰 갱신' })
  @ApiResponse({ status: 200, description: '토큰 갱신 성공' })
  @ApiResponse({ status: 401, description: '토큰 갱신 실패' })
  async refreshToken(
    @Body('refresh_token') refreshToken: string,
    @Res() res: Response,
  ) {
    try {
      if (!refreshToken) {
        throw new UnauthorizedException('Refresh token is required');
      }

      const { jwtAccessToken } =
        await this.tokenService.refreshAccessToken(refreshToken);

      res.cookie('access_token', jwtAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000, // 15분
      });

      res.status(HttpStatus.OK).json({
        success: true,
        accessToken: jwtAccessToken,
      });
    } catch (error) {
      console.error('Token refresh error:', error);
      res.status(HttpStatus.UNAUTHORIZED).json({
        success: false,
        message: 'Failed to refresh token',
      });
    }
  }
}
