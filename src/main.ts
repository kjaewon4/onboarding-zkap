import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupSwagger } from './config/swagger/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  console.log('애플리케이션 시작 중...');

  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
  });

  if (process.env.IS_SWAGGER_ENABLED === 'true') {
    setupSwagger(app);
    console.log('📚 Swagger 문서 설정 완료');
    console.log(
      `📖 Swagger: http://localhost:${process.env.PORT ?? 3000}/api/docs`,
    );
  }

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  console.log('애플리케이션 시작 완료!');
  console.log(`🌐 서버 주소: http://localhost:${port}`);
  console.log(`📊 헬스 체크: http://localhost:${port}/api/health`);
  console.log(`🔐 Google OAuth: http://localhost:${port}/api/auth/google`);
}
bootstrap();
