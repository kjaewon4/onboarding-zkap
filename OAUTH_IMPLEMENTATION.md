# OAuth 2.0 + OpenID Connect 구현

이 프로젝트는 Google OAuth 2.0 + OpenID Connect를 사용한 인증 시스템을 구현합니다.

## 구현된 기능

### 1. OAuth 2.0 플로우

- Google OAuth 2.0 인증 시작 (`GET /api/auth/google`)
- Authorization Code를 Access Token으로 교환
- ID Token 검증 및 사용자 정보 추출

### 2. JWT 토큰 관리

- 자체 JWT Access Token 및 Refresh Token 발급
- Redis를 사용한 토큰 상태 관리
- 토큰 무효화 및 갱신 기능

### 3. 사용자 관리

- 신규 사용자 자동 생성
- 약관 동의 처리
- 사용자별 인증 락 (동시 로그인 방지)

### 4. 보안 기능

- State/Nonce 검증
- HttpOnly 쿠키를 사용한 토큰 저장
- JWT 토큰 검증 가드
- CORS 설정

## API 엔드포인트

### 인증 관련

- `GET /api/auth/google` - Google OAuth 인증 시작
- `GET /api/auth/callback` - Google OAuth 콜백 처리
- `POST /api/auth/terms` - 약관 동의 처리
- `POST /api/auth/refresh` - 토큰 갱신
- `POST /api/auth/logout` - 로그아웃

### 사용자 관련

- `GET /api/user/profile` - 사용자 프로필 조회 (인증 필요)
- `POST /api/user/logout` - 로그아웃 (인증 필요)

## 환경 변수 설정

`.env` 파일을 생성하고 다음 변수들을 설정하세요:

```env
# Database
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5433
DB_USERNAME=postgres
DB_PASSWORD=password
DB_DATABASE=onboarding_zkap

# Redis
REDIS_HOST=localhost
REDIS_PORT=6380
REDIS_PASSWORD=your_redis_password

# JWT
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback

# App
PORT=3000
NODE_ENV=development
IS_SWAGGER_ENABLED=true

# CORS
FRONTEND_URL=http://localhost:3001
```

## 실행 방법

1. 의존성 설치:

```bash
npm install
```

2. Docker Compose로 데이터베이스와 Redis 실행:

```bash
docker-compose up -d
```

3. 데이터베이스 마이그레이션 실행:

```bash
npm run db:local:migrate
```

4. 애플리케이션 실행:

```bash
npm run start:dev
```

## 인증 플로우

1. 사용자가 "구글로 로그인" 버튼 클릭
2. `/api/auth/google`로 리다이렉트
3. Google OAuth 페이지로 리다이렉트
4. 사용자가 Google에서 로그인 및 권한 동의
5. Google이 `/api/auth/callback`으로 Authorization Code 전송
6. 서버가 Authorization Code를 Access Token으로 교환
7. ID Token 검증 및 사용자 정보 추출
8. 신규 사용자면 약관 동의 페이지로 리다이렉트
9. 기존 사용자면 JWT 토큰 발급 후 대시보드로 리다이렉트

## 보안 고려사항

- State/Nonce를 사용한 CSRF 공격 방지
- HttpOnly 쿠키를 사용한 XSS 공격 방지
- Redis를 사용한 토큰 상태 관리
- 사용자별 인증 락으로 동시 로그인 방지
- JWT 토큰 만료 시간 설정
- CORS 설정으로 허용된 도메인만 접근 가능

## 데이터베이스 스키마

### users 테이블

- `id` (UUID, Primary Key)
- `email` (VARCHAR, Unique)
- `provider` (VARCHAR) - 'google'
- `sub` (VARCHAR) - Google 사용자 ID
- `term_agreed` (BOOLEAN) - 약관 동의 여부
- `agreed_at` (TIMESTAMP) - 약관 동의 시간
- `created_at` (TIMESTAMP) - 생성 시간
- `updated_at` (TIMESTAMP) - 수정 시간

## Redis 키 구조

- `state:{state}` - OAuth state 검증용
- `allow:access:{jti}` - Access Token 허용 상태
- `allow:refresh:{jti}` - Refresh Token 허용 상태
- `lock:auth:{provider}:{sub}` - 사용자별 인증 락
