# 소셜 로그인 테스트 가이드

이 가이드는 Google OAuth를 사용한 소셜 로그인 기능을 테스트하는 방법을 설명합니다.

## 빠른 시작

### 1. 환경 변수 설정

프로젝트 루트에 `.env` 파일을 생성하고 다음 내용을 추가하세요:

```bash
# 애플리케이션 설정
NODE_ENV=development
PORT=3000
IS_SWAGGER_ENABLED=true

# 프론트엔드 URL
FRONTEND_URL=http://localhost:3001

# JWT 설정
JWT_SECRET=your_super_secret_jwt_key_here_change_in_production
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Google OAuth 설정 (실제 값으로 교체 필요)
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback

# 데이터베이스 설정
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=password
DB_NAME=onboarding_zkap

# Redis 설정
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

### 2. Google OAuth 설정

1. [Google Cloud Console](https://console.cloud.google.com/)에 접속
2. 새 프로젝트 생성 또는 기존 프로젝트 선택
3. "API 및 서비스" > "사용자 인증 정보" 이동
4. "사용자 인증 정보 만들기" > "OAuth 클라이언트 ID" 선택
5. 애플리케이션 유형: "웹 애플리케이션"
6. 승인된 리디렉션 URI에 `http://localhost:3000/api/auth/callback` 추가
7. 클라이언트 ID와 클라이언트 보안 비밀번호를 `.env` 파일에 설정

### 3. 의존성 설치

```bash
npm install
# 또는
yarn install
```

### 4. 데이터베이스 및 Redis 실행

#### Docker Compose 사용 (권장)

```bash
docker-compose up -d
```

#### 수동 실행

- PostgreSQL 서버 실행
- Redis 서버 실행

### 5. 데이터베이스 마이그레이션

```bash
npm run db:local:migrate
```

### 6. 애플리케이션 실행

```bash
npm run start:dev
```

## 테스트 실행

### 자동 테스트 스크립트

```bash
npm run test:social-login
```

이 스크립트는 다음을 테스트합니다:

- 환경 변수 설정 확인
- 서버 헬스 체크
- Swagger 문서 접근
- 인증 엔드포인트 존재 확인
- Google OAuth URL 생성

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

## 📋 API 엔드포인트

### 인증 관련

| 메서드 | 엔드포인트           | 설명              |
| ------ | -------------------- | ----------------- |
| GET    | `/api/auth/google`   | Google OAuth 시작 |
| GET    | `/api/auth/callback` | Google OAuth 콜백 |
| POST   | `/api/auth/terms`    | 약관 동의         |
| POST   | `/api/auth/refresh`  | 토큰 갱신         |
| POST   | `/api/auth/logout`   | 로그아웃          |

### 기타

| 메서드 | 엔드포인트      | 설명         |
| ------ | --------------- | ------------ |
| GET    | `/api/health`   | 헬스 체크    |
| GET    | `/api/api-docs` | Swagger 문서 |

## 🔍 문제 해결

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
   - `.env` 파일이 프로젝트 루트에 있는지 확인
   - 모든 필수 환경 변수가 설정되었는지 확인

### 로그 확인

애플리케이션 실행 시 콘솔에서 다음 로그를 확인할 수 있습니다:

- 데이터베이스 연결 상태
- Redis 연결 상태
- 서버 시작 포트
- Swagger 문서 URL
- 헬스 체크 URL

## 테스트 시나리오

### 1. 신규 사용자 로그인

1. Google OAuth 시작
2. Google 계정으로 로그인
3. 약관 동의 페이지로 리다이렉트
4. 약관 동의 후 대시보드로 이동

### 2. 기존 사용자 로그인

1. Google OAuth 시작
2. Google 계정으로 로그인
3. 대시보드로 직접 이동

### 3. 토큰 갱신

1. 로그인 후 15분 경과
2. 자동으로 토큰 갱신 요청
3. 새로운 액세스 토큰 발급

## 📝 추가 정보

- JWT 토큰은 HttpOnly 쿠키로 저장됩니다
- 액세스 토큰 유효기간: 15분
- 리프레시 토큰 유효기간: 7일
- 모든 인증 엔드포인트는 CORS가 설정되어 있습니다
