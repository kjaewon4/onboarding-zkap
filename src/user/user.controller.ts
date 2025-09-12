import {
  Controller,
  Get,
  Post,
  Body,
  Res,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { TokenService } from '../auth/services/token.service';
import type { TokenPayload } from '../auth/services/token.service';
import type { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('user')
@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly tokenService: TokenService,
  ) {}

  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: '사용자 프로필 조회' })
  @ApiResponse({ status: 200, description: '사용자 프로필 정보' })
  async getProfile(@CurrentUser() user: TokenPayload) {
    const userInfo = await this.userService.findById(user.sub);
    if (!userInfo) {
      throw new Error('User not found');
    }
    return {
      success: true,
      data: {
        id: userInfo.id,
        email: userInfo.email,
        provider: userInfo.provider,
        termAgreed: userInfo.termAgreed,
        agreedAt: userInfo.agreedAt,
        createdAt: userInfo.createdAt,
        updatedAt: userInfo.updatedAt,
      },
    };
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

      // JWT 토큰 발급 및 대시보드 리다이렉트
      await this.tokenService.setJwtTokensAndRedirect(
        this.userService,
        userId,
        res,
        `${process.env.FRONTEND_URL}/dashboard.html`,
      );
    } catch (error) {
      console.error('Terms agreement error:', error);
      res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Failed to agree terms',
      });
    }
  }

  @Post('logout')
  @ApiBearerAuth()
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
