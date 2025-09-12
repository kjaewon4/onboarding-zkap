const redis = require('redis');

async function checkRedis() {
  const client = redis.createClient({
    url: 'redis://localhost:6380',
  });

  try {
    await client.connect();
    console.log('✅ Redis 연결 성공');

    // 모든 키 조회
    const keys = await client.keys('*');
    console.log(`\n📋 총 ${keys.length}개의 키 발견:`);

    for (const key of keys) {
      const type = await client.type(key);
      const ttl = await client.ttl(key);

      console.log(`\n🔑 키: ${key}`);
      console.log(`   타입: ${type}`);
      console.log(`   TTL: ${ttl}초`);

      if (type === 'string') {
        const value = await client.get(key);
        console.log(`   값: ${value}`);
      } else if (type === 'hash') {
        const hash = await client.hGetAll(key);
        console.log(`   해시:`, hash);
      }
    }

    if (keys.length === 0) {
      console.log('📭 Redis에 저장된 데이터가 없습니다.');
    }
  } catch (error) {
    console.error('❌ Redis 연결 실패:', error.message);
  } finally {
    await client.disconnect();
  }
}

checkRedis();
