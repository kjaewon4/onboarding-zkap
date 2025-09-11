import { Controller, Get, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { TokenPayload } from '../auth/services/token.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('user')
@Controller('user')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

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
}
