import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Res,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response } from 'express';
import { GoogleAuthService } from './services/google-auth.service';
import { TokenService } from './services/token.service';
import { UserService } from '../user/user.service';
import { ulid } from 'ulid';
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
  async googleAuth(@Res() res: Response) {
    const state = ulid();
    const nonce = ulid();

    // State와 Nonce를 Redis에 저장
    await this.tokenService.storeStateNonce(state, nonce);

    const authUrl = this.googleAuthService.generateAuthUrl(state, nonce);

    res.redirect(authUrl);
  }

  @Get('callback')
  @Public()
  @ApiOperation({ summary: 'Google OAuth 콜백 처리' })
  @ApiResponse({ status: 200, description: '인증 성공' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  async googleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    try {
      if (!code || !state) {
        throw new UnauthorizedException('Missing authorization code or state');
      }

      // State 검증
      const nonce = await this.tokenService.validateStateNonce(state, state);
      if (!nonce) {
        throw new UnauthorizedException('Invalid state parameter');
      }

      // Authorization Code를 토큰으로 교환
      const { accessToken, idToken } =
        await this.googleAuthService.exchangeCodeForTokens(code);

      // ID Token 검증 및 사용자 정보 추출
      const googleUser = await this.googleAuthService.verifyIdToken(
        idToken,
        state,
      );

      // 사용자 조회 또는 생성
      let user = await this.userService.findByProviderAndSub(
        'google',
        googleUser.sub,
      );

      if (!user) {
        // 신규 사용자 - 약관 동의 필요
        const isLocked = await this.tokenService.lockUserAuth(
          'google',
          googleUser.sub,
        );
        if (!isLocked) {
          throw new UnauthorizedException('Authentication in progress');
        }

        user = await this.userService.create({
          email: googleUser.email,
          provider: 'google',
          sub: googleUser.sub,
          termAgreed: false,
          agreedAt: null,
        });

        // 약관 동의 페이지로 리다이렉트
        res.redirect(`${process.env.FRONTEND_URL}/terms?user_id=${user.id}`);
        return;
      }

      // 기존 사용자 - 토큰 발급
      if (!user.termAgreed) {
        // 약관 미동의 사용자
        res.redirect(`${process.env.FRONTEND_URL}/terms?user_id=${user.id}`);
        return;
      }

      // 사용자 정보 업데이트
      await this.userService.updateLastLogin(user.id);

      // JWT 토큰 발급
      const { accessToken: jwtAccessToken, refreshToken } =
        await this.tokenService.generateTokenPair(user.id);

      // HttpOnly 쿠키로 토큰 설정
      res.cookie('access_token', jwtAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000, // 15분
      });

      res.cookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7일
      });

      // 프론트엔드로 리다이렉트
      res.redirect(`${process.env.FRONTEND_URL}/dashboard`);
    } catch (error) {
      console.error('Google OAuth callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
    }
  }

  @Post('terms')
  @Public()
  @ApiOperation({ summary: '약관 동의 처리' })
  @ApiResponse({ status: 200, description: '약관 동의 완료' })
  @ApiResponse({ status: 400, description: '잘못된 요청' })
  async agreeTerms(@Body('user_id') userId: string, @Res() res: Response) {
    try {
      if (!userId) {
        throw new UnauthorizedException('User ID is required');
      }

      // 사용자 약관 동의 처리
      await this.userService.agreeTerms(userId);

      // JWT 토큰 발급
      const { accessToken, refreshToken } =
        await this.tokenService.generateTokenPair(userId);

      // HttpOnly 쿠키로 토큰 설정
      res.cookie('access_token', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000, // 15분
      });

      res.cookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7일
      });

      res.status(HttpStatus.OK).json({
        success: true,
        message: 'Terms agreed successfully',
      });
    } catch (error) {
      console.error('Terms agreement error:', error);
      res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Failed to agree terms',
      });
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

      const { accessToken } =
        await this.tokenService.refreshAccessToken(refreshToken);

      res.cookie('access_token', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000, // 15분
      });

      res.status(HttpStatus.OK).json({
        success: true,
        accessToken,
      });
    } catch (error) {
      console.error('Token refresh error:', error);
      res.status(HttpStatus.UNAUTHORIZED).json({
        success: false,
        message: 'Failed to refresh token',
      });
    }
  }

  @Post('logout')
  @ApiOperation({ summary: '로그아웃' })
  @ApiResponse({ status: 200, description: '로그아웃 성공' })
  async logout(
    @Body('access_token') accessToken: string,
    @Body('refresh_token') refreshToken: string,
    @Res() res: Response,
  ) {
    try {
      if (accessToken && refreshToken) {
        // 토큰에서 JTI 추출하여 무효화
        const accessPayload =
          await this.tokenService.validateToken(accessToken);
        const refreshPayload =
          await this.tokenService.validateToken(refreshToken);

        await this.tokenService.revokeTokens(
          accessPayload.jti,
          refreshPayload.jti,
        );
      }

      // 쿠키 삭제
      res.clearCookie('access_token');
      res.clearCookie('refresh_token');

      res.status(HttpStatus.OK).json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(HttpStatus.OK).json({
        success: true,
        message: 'Logged out successfully',
      });
    }
  }
}
