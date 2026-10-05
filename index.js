const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// AWS RDS PostgreSQL 풀
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Supabase 클라이언트 초기화
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Supabase 공식 토큰 검증 미들웨어
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: '인증 토큰이 누락되었습니다.' });
  }

  // Supabase Auth 서버에 직접 토큰 유효성 검증 요청
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return res.status(403).json({
      error: '유효하지 않거나 만료된 토큰입니다.',
      detail: error ? error.message : '유저를 찾을 수 없습니다.'
    });
  }

  req.user = user; // 유저 정보 req에 저장
  next();
}

app.get('/health', (req, res) => res.status(200).send('OK'));
app.get('/', (req, res) => res.json({ status: 'online', message: 'SOYO API Server' }));

// RDS DB 연결 테스트
app.get('/api/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as db_time, current_database() as db_name;');
    res.json({
      status: 'success',
      message: 'AWS RDS 연결 성공!',
      database: result.rows[0].db_name,
      serverTime: result.rows[0].db_time
    });
  } catch (error) {
    res.status(500).json({ status: 'error', error: error.message });
  }
});

// 로그인 회원 전용 엔드포인트
app.get('/api/protected', authenticateToken, (req, res) => {
  res.json({
    status: 'authorized',
    message: '인증 성공! 백엔드가 로그인된 유저를 확인했습니다.',
    userId: req.user.id,
    email: req.user.email
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
});
