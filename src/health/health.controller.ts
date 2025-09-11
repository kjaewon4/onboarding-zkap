import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
  HealthIndicatorStatus,
} from '@nestjs/terminus';
import type { HealthCheckResult } from '@nestjs/terminus';
import * as redis from 'redis';
import { Public } from '../auth/decorators/public.decorator';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
  ) {}

  @Get()
  @Public()
  @HealthCheck()
  async check(): Promise<HealthCheckResult> {
    const result = await this.health.check([
      // 기본 애플리케이션 상태 체크 - 가장 간단
      () => ({
        application: {
          status: 'up',
          timestamp: new Date().toISOString(),
        },
      }),
      // 데이터베이스 연결 체크
      () => this.db.pingCheck('database'),
      // Redis 연결 체크
      () => this.checkRedis(),
    ]);

    // 헬스 체크 결과를 콘솔에 로그
    console.log('📊 헬스 체크 결과:', JSON.stringify(result, null, 2));

    return result;
  }

  @Get('liveness')
  @Public()
  @HealthCheck()
  async liveness(): Promise<HealthCheckResult> {
    return this.health.check([
      // Liveness 체크 - 애플리케이션이 살아있는지만 확인 (빠름)
      () => ({
        liveness: {
          status: 'up',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
        },
      }),
    ]);
  }

  @Get('readiness')
  @Public()
  @HealthCheck()
  async readiness(): Promise<HealthCheckResult> {
    return this.health.check([
      // Readiness 체크 - 모든 의존성이 준비되었는지 확인 (느림)
      () => ({
        readiness: {
          status: 'up',
          timestamp: new Date().toISOString(),
        },
      }),
      // 데이터베이스 연결 체크
      () => this.db.pingCheck('database'),
      // Redis 연결 체크 (간단한 ping)
      () => this.checkRedis(),
    ]);
  }

  // Redis 헬스 체크 메서드
  private async checkRedis() {
    try {
      // 실제 Redis 연결 체크
      const client = redis.createClient({
        url: 'redis://localhost:6379',
      });

      await client.connect(); // 연결 시도
      await client.ping(); // 연결 확인
      await client.disconnect(); // 연결 해제

      return {
        redis: {
          status: 'up' as HealthIndicatorStatus,
          message: 'Redis connection is healthy',
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        redis: {
          status: 'down' as HealthIndicatorStatus,
          message: 'Redis connection failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        },
      };
    }
  }
}
