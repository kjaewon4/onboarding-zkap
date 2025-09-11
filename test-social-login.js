#!/usr/bin/env node

/**
 * 소셜 로그인 테스트 스크립트
 *
 * 사용법:
 * 1. 환경 변수 설정 후 실행
 * 2. node test-social-login.js
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// .env.local 파일 로드
function loadEnvFile() {
  const envPath = path.join(__dirname, '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envLines = envContent.split('\n');

    envLines.forEach((line) => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["']|["']$/g, '');
          process.env[key.trim()] = value.trim();
        }
      }
    });

    console.log('✅ .env.local 파일을 로드했습니다.');
  } else {
    console.log('⚠️  .env.local 파일을 찾을 수 없습니다.');
  }
}

// 환경 변수 로드
loadEnvFile();

// 테스트 설정
const BASE_URL = 'http://localhost:3001/api';
const FRONTEND_URL = 'http://localhost:3000';

// 색상 출력을 위한 유틸리티
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`\n[${step}] ${message}`, 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// 테스트 함수들
async function testHealthCheck() {
  logStep('1', '헬스 체크 테스트');

  try {
    const response = await axios.get(`${BASE_URL}/health`);
    logSuccess(`서버가 정상적으로 실행 중입니다. (상태: ${response.status})`);
    return true;
  } catch (error) {
    logError(`서버 연결 실패: ${error.message}`);
    return false;
  }
}

async function testGoogleAuthInitiation() {
  logStep('2', 'Google OAuth 시작 테스트');

  try {
    const response = await axios.get(`${BASE_URL}/auth/google`, {
      maxRedirects: 0,
      validateStatus: (status) => status === 302,
    });

    const location = response.headers.location;
    if (location && location.includes('accounts.google.com')) {
      logSuccess('Google OAuth URL이 정상적으로 생성되었습니다.');
      logInfo(`OAuth URL: ${location}`);
      return true;
    } else {
      logError('Google OAuth URL이 올바르지 않습니다.');
      return false;
    }
  } catch (error) {
    if (error.response && error.response.status === 302) {
      const location = error.response.headers.location;
      if (location && location.includes('accounts.google.com')) {
        logSuccess('Google OAuth URL이 정상적으로 생성되었습니다.');
        logInfo(`OAuth URL: ${location}`);
        return true;
      }
    }
    logError(`Google OAuth 시작 실패: ${error.message}`);
    return false;
  }
}

async function testSwaggerDocumentation() {
  logStep('3', 'Swagger 문서 확인');

  try {
    const response = await axios.get(`${BASE_URL}/api-docs`);
    logSuccess('Swagger 문서에 접근할 수 있습니다.');
    logInfo(`Swagger URL: ${BASE_URL}/api-docs`);
    return true;
  } catch (error) {
    logWarning(`Swagger 문서 접근 실패: ${error.message}`);
    return false;
  }
}

async function testAuthEndpoints() {
  logStep('4', '인증 엔드포인트 테스트');

  const endpoints = [
    { method: 'GET', path: '/auth/google', name: 'Google OAuth 시작' },
    { method: 'POST', path: '/auth/terms', name: '약관 동의' },
    { method: 'POST', path: '/auth/refresh', name: '토큰 갱신' },
    { method: 'POST', path: '/auth/logout', name: '로그아웃' },
  ];

  let successCount = 0;

  for (const endpoint of endpoints) {
    try {
      const response = await axios({
        method: endpoint.method,
        url: `${BASE_URL}${endpoint.path}`,
        validateStatus: () => true, // 모든 상태 코드 허용
      });

      // 404가 아닌 응답은 엔드포인트가 존재함을 의미
      if (response.status !== 404) {
        logSuccess(
          `${endpoint.name} 엔드포인트 접근 가능 (상태: ${response.status})`,
        );
        successCount++;
      } else {
        logError(`${endpoint.name} 엔드포인트를 찾을 수 없습니다.`);
      }
    } catch (error) {
      logError(`${endpoint.name} 엔드포인트 테스트 실패: ${error.message}`);
    }
  }

  return successCount === endpoints.length;
}

async function testEnvironmentVariables() {
  logStep('5', '환경 변수 확인');

  const requiredVars = [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'JWT_SECRET',
    'FRONTEND_URL',
  ];

  let missingVars = [];

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  }

  if (missingVars.length === 0) {
    logSuccess('모든 필수 환경 변수가 설정되어 있습니다.');
    return true;
  } else {
    logError(`다음 환경 변수가 설정되지 않았습니다: ${missingVars.join(', ')}`);
    logInfo('환경 변수를 설정한 후 다시 테스트해주세요.');
    return false;
  }
}

// 메인 테스트 실행 함수
async function runTests() {
  log('🚀 소셜 로그인 테스트 시작', 'bright');
  log('=' * 50, 'cyan');

  const tests = [
    { name: '환경 변수 확인', fn: testEnvironmentVariables },
    { name: '헬스 체크', fn: testHealthCheck },
    { name: 'Swagger 문서', fn: testSwaggerDocumentation },
    { name: '인증 엔드포인트', fn: testAuthEndpoints },
    { name: 'Google OAuth 시작', fn: testGoogleAuthInitiation },
  ];

  let passedTests = 0;
  const totalTests = tests.length;

  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) {
        passedTests++;
      }
    } catch (error) {
      logError(`${test.name} 테스트 중 오류 발생: ${error.message}`);
    }
  }

  log('\n' + '=' * 50, 'cyan');
  log(
    `테스트 완료: ${passedTests}/${totalTests} 통과`,
    passedTests === totalTests ? 'green' : 'yellow',
  );

  if (passedTests === totalTests) {
    logSuccess('모든 테스트가 통과했습니다! 🎉');
    logInfo('이제 브라우저에서 Google OAuth를 테스트할 수 있습니다.');
    logInfo(`Google OAuth URL: ${BASE_URL}/auth/google`);
  } else {
    logWarning(
      '일부 테스트가 실패했습니다. 위의 오류를 확인하고 수정해주세요.',
    );
  }

  log('\n📋 다음 단계:', 'bright');
  log('1. 환경 변수 설정 (.env 파일 생성)');
  log('2. 데이터베이스 및 Redis 서버 실행');
  log('3. 애플리케이션 실행: npm run start:dev');
  log('4. 브라우저에서 Google OAuth 테스트');
}

// 스크립트 실행
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  runTests,
  testHealthCheck,
  testGoogleAuthInitiation,
  testSwaggerDocumentation,
  testAuthEndpoints,
  testEnvironmentVariables,
};
