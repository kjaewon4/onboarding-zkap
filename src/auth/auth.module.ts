import { Module, forwardRef } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { GoogleAuthService } from './services/google-auth.service';
import { TokenService } from './services/token.service';
import { UserModule } from '../user/user.module';
import { RedisConfigModule } from '../config/redis.module';

@Module({
  imports: [PassportModule, forwardRef(() => UserModule), RedisConfigModule],
  controllers: [AuthController],
  providers: [GoogleAuthService, TokenService],
  exports: [TokenService, GoogleAuthService],
})
export class AuthModule {}
