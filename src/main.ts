import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupSwagger } from './config/swagger/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  console.log('애플리케이션 시작 중...');

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix('api');

  // 정적 파일 서빙 설정
  app.useStaticAssets(join(__dirname, '..', 'public'));
  app.setBaseViewsDir(join(__dirname, '..', 'public'));

  app.use(helmet());
  app.use(cookieParser());

  // 세션 미들웨어 추가
  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'dev-secret-key',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 10 * 60 * 1000, // 10분
        httpOnly: true,
      },
    }),
  );

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
