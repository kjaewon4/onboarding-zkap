import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import redisConfig from './redis.config';
import Redis from 'ioredis';

@Module({
  imports: [ConfigModule.forFeature(redisConfig)],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: (configService: ConfigService) => {
        const redisConfig = {
          host: configService.get<string>('redis.host'),
          port: configService.get<number>('redis.port'),
          password: configService.get<string>('redis.password'),
        };

        console.log('Redis 연결 설정:', redisConfig);

        const redis = new Redis(redisConfig);

        redis.on('connect', () => {
          console.log('Redis 연결 성공');
        });

        redis.on('error', (err) => {
          console.error('Redis 연결 오류:', err);
        });

        return redis;
      },
      inject: [ConfigService],
    },
  ],
  exports: ['REDIS_CLIENT'],
})
export class RedisConfigModule {}
