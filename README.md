# Onboarding ZKAP

NestJS 기반의 소셜 로그인 인증 시스템입니다. Google OAuth를 통한 사용자 인증과 JWT 토큰 기반의 세션 관리를 제공합니다.

## 기술 스택

- **Backend**: NestJS, TypeScript
- **Database**: PostgreSQL
- **Cache**: Redis
- **Authentication**: Google OAuth 2.0, JWT
- **Documentation**: Swagger
- **Container**: Docker Compose

## 사전 요구사항

- Node.js (v18 이상)
- Docker & Docker Compose
- Git

## 환경 설정

### 1. 프로젝트 클론 및 의존성 설치

```bash
# 프로젝트 클론
git clone <repository-url>
cd onboarding-zkap

# 의존성 설치
yarn install
# 또는
npm install
```

### 2. 환경 변수 설정

프로젝트 루트에 `.env.local` 파일을 생성하고 다음 내용을 추가하세요:

```bash
# 애플리케이션 설정
NODE_ENV=development
PORT=3001
IS_SWAGGER_ENABLED=true

# 프론트엔드 URL
FRONTEND_URL=http://localhost:3001

# JWT 설정
JWT_SECRET=your_super_secret_jwt_key_here_change_in_production
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Google OAuth 설정 (실제 값으로 교체 필요)
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_ISS=https://accounts.google.com
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3001/api/auth/callback

# 데이터베이스 설정
DB_HOST=localhost
DB_PORT=5433
DB_USERNAME=postgres
DB_PASSWORD=password
DB_DATABASE=onboarding_zkap

# Redis 설정
REDIS_HOST=localhost
REDIS_PORT=6380
REDIS_PASSWORD=password
REDIS_DB=zkap
```

### 3. Google OAuth 설정

1. [Google Cloud Console](https://console.cloud.google.com/)에 접속
2. 새 프로젝트 생성 또는 기존 프로젝트 선택
3. "API 및 서비스" > "사용자 인증 정보" 이동
4. "사용자 인증 정보 만들기" > "OAuth 클라이언트 ID" 선택
5. 애플리케이션 유형: "웹 애플리케이션"
6. 승인된 리디렉션 URI에 `http://localhost:3000/api/auth/callback` 추가 (환경변수와 일치)
7. 클라이언트 ID와 클라이언트 보안 비밀번호를 `.env` 파일에 설정

## Docker를 사용한 실행 (local 기준)

### 1. 데이터베이스 및 Redis 실행

```bash
# Docker Compose로 PostgreSQL과 Redis 실행
docker-compose --env-file .env.local up -d

# 실행 상태 확인
docker-compose ps
```

### 2. 데이터베이스 마이그레이션

```bash
# 로컬 환경 마이그레이션 실행
yarn run db:local:migrate

# 마이그레이션 상태 확인
yarn run db:local:migrate:show
```

### 3. 애플리케이션 실행

```bash
# local 모드로 실행
yarn run start:local

# 또는 프로덕션 모드로 실행
yarn run build
yarn run start:prod
```

## 테스트

### 자동 테스트 실행

```bash
# 소셜 로그인 테스트
yarn run test:social-login

# 테스트 커버리지
yarn run test:cov
```

### 수동 테스트

1. **Google OAuth 시작**

   ```
   GET http://localhost:3000/api/auth/google
   ```

   브라우저에서 접속하면 Google 로그인 페이지로 리다이렉트됩니다.

2. **Swagger 문서 확인**

   ```
   http://localhost:3000/api/docs
   ```

3. **헬스 체크**
   ```
   GET http://localhost:3000/api/health
   ```

## API 엔드포인트

### 인증 관련

| 메서드 | 엔드포인트           | 설명              |
| ------ | -------------------- | ----------------- |
| GET    | `/api/auth/google`   | Google OAuth 시작 |
| GET    | `/api/auth/callback` | Google OAuth 콜백 |
| POST   | `/api/user/terms`    | 약관 동의         |
| POST   | `/api/auth/refresh`  | 토큰 갱신         |
| POST   | `/api/user/logout`   | 로그아웃          |

### 기타

| 메서드 | 엔드포인트      | 설명         |
| ------ | --------------- | ------------ |
| GET    | `/api/health`   | 헬스 체크    |
| GET    | `/api/docs` | Swagger 문서 |

## 개발 명령어

```bash
# 개발 서버 실행 (watch 모드)
yarn run start:dev

# 디버그 모드로 실행
yarn run start:debug

# 프로덕션 빌드
yarn run build

# 린트 실행
yarn run lint

# 코드 포맷팅
yarn run format

# 데이터베이스 마이그레이션
yarn run db:local:migrate
yarn run db:local:migrate:revert
yarn run db:local:migrate:show
```

## 문제 해결

### 일반적인 문제들

1. **"Missing authorization code or state" 오류**
   - Google OAuth 설정이 올바른지 확인
   - 리디렉션 URI가 정확한지 확인

2. **"Invalid state parameter" 오류**
   - Redis 서버가 실행 중인지 확인
   - Redis 연결 설정 확인

3. **데이터베이스 연결 오류**
   - PostgreSQL 서버 실행 상태 확인
   - 데이터베이스 연결 정보 확인

4. **환경 변수 오류**
   - `.env.local` 파일이 프로젝트 루트에 있는지 확인
   - 모든 필수 환경 변수가 설정되었는지 확인

### 로그 확인

애플리케이션 실행 시 콘솔에서 다음 로그를 확인할 수 있습니다:

- 데이터베이스 연결 상태
- Redis 연결 상태
- 서버 시작 포트
- Swagger 문서 URL
- 헬스 체크 URL

## 프로젝트 구조

```
src/
├── auth/                    # 인증 관련 모듈
│   ├── decorators/         # 커스텀 데코레이터
│   ├── guards/             # 인증 가드
│   └── services/           # 인증 서비스
├── config/                 # 설정 파일
│   ├── database/          # 데이터베이스 설정
│   ├── redis/             # Redis 설정
│   └── swagger/           # Swagger 설정
├── health/                # 헬스 체크 모듈
├── user/                  # 사용자 관련 모듈
│   ├── dto/               # 데이터 전송 객체
│   ├── entity/            # 엔티티
│   └── repository/        # 리포지토리
└── main.ts                # 애플리케이션 진입점
```

## 보안 고려사항

- JWT 토큰은 HttpOnly 쿠키로 저장됩니다
- 액세스 토큰 유효기간: 15분
- 리프레시 토큰 유효기간: 7일
- 모든 인증 엔드포인트는 CORS가 설정되어 있습니다
- 프로덕션 환경에서는 반드시 JWT_SECRET을 안전한 값으로 변경하세요

## 📝 추가 정보

- [NestJS 공식 문서](https://docs.nestjs.com/)
- [Google OAuth 2.0 가이드](https://developers.google.com/identity/protocols/oauth2)
- [TypeORM 문서](https://typeorm.io/)

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 `LICENSE` 파일을 참조하세요.
