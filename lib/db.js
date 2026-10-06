const { Pool } = require('pg');

// AWS RDS PostgreSQL 풀
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// RDS에 테이블 자동 생성 (새 테이블이 필요하면 여기에 추가)
async function initDB() {
  if (!process.env.DATABASE_URL) {
    console.warn('⚠️  DATABASE_URL 미설정: DB 초기화를 건너뜁니다.');
    return;
  }
  const query = `
    CREATE TABLE IF NOT EXISTS posts (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL,
      user_email VARCHAR(255) NOT NULL,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await pool.query(query);
    console.log('✅ posts 테이블 준비 완료');
  } catch (err) {
    console.error('❌ posts 테이블 생성 오류:', err.message);
  }
}

module.exports = { pool, initDB };
