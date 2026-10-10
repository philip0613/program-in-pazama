const { Pool } = require('pg');

// AWS RDS PostgreSQL 풀
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// RDS에 테이블 자동 생성 (posts, user_profiles, user_medications 등)
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

    CREATE TABLE IF NOT EXISTS user_profiles (
      id UUID PRIMARY KEY,
      user_name VARCHAR(100) NOT NULL DEFAULT '소요 여행자',
      birth_date DATE NOT NULL DEFAULT '1970-01-01',
      age INTEGER NOT NULL DEFAULT 50,
      chronic_conditions TEXT[] NOT NULL DEFAULT '{}',
      allergies TEXT[] NOT NULL DEFAULT '{}',
      barrier_free_required BOOLEAN NOT NULL DEFAULT false,
      walk_fitness_level VARCHAR(50) NOT NULL DEFAULT '초급(완만)',
      required_infra TEXT NOT NULL DEFAULT '기본',
      has_medication BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS user_medications (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      ingredient_name VARCHAR(255),
      timing VARCHAR(100),
      caution_note TEXT,
      dur_warning_tags TEXT,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await pool.query(query);
    console.log('✅ [AWS RDS] 필수 데이터베이스 테이블 준비 완료 (posts, user_profiles, user_medications)');
  } catch (err) {
    console.error('❌ [AWS RDS] 테이블 생성 오류:', err.message);
  }
}

module.exports = { pool, initDB };
