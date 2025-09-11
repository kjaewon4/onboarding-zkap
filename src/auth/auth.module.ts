import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { GoogleAuthService } from './services/google-auth.service';
import { TokenService } from './services/token.service';
import { UserModule } from '../user/user.module';
import { RedisConfigModule } from '../config/redis.module';
import authConfig from '../config/auth.config';

@Module({
  imports: [
    ConfigModule.forFeature(authConfig),
    JwtModule.registerAsync({
      imports: [ConfigModule.forFeature(authConfig)],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('auth.jwt.secret'),
        signOptions: {
          expiresIn: configService.get<string>('auth.jwt.expiresIn'),
        },
      }),
      inject: [ConfigService],
    }),
    PassportModule,
    forwardRef(() => UserModule),
    RedisConfigModule,
  ],
  controllers: [AuthController],
  providers: [GoogleAuthService, TokenService],
  exports: [TokenService, GoogleAuthService],
})
export class AuthModule {}
