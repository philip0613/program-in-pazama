require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 8080;

// CORS 허용 출처 (추가 출처는 CORS_ORIGINS 환경 변수에 콤마로 구분해 지정)
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://main.darvmwywsdw78.amplifyapp.com',
  ...(process.env.CORS_ORIGINS || '').split(',').map((o) => o.trim()).filter(Boolean)
];

app.use(cors({
  origin(origin, callback) {
    // Origin 헤더가 없는 요청(curl, 서버 간 호출, 헬스체크)은 허용
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(null, false);
  }
}));
app.use(express.json());

// AWS RDS PostgreSQL 풀
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// RDS에 게시판 테이블 자동 생성 함수
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
initDB();

// Supabase 클라이언트 초기화 (환경 변수가 없으면 인증 API만 비활성화)
const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)
  : null;
if (!supabase) console.warn('⚠️  SUPABASE_URL/SUPABASE_ANON_KEY 미설정: 인증이 필요한 API는 503을 반환합니다.');

// 토큰 인증 미들웨어
async function authenticateToken(req, res, next) {
  if (!supabase) {
    return res.status(503).json({ error: '서버에 Supabase 설정이 없어 인증을 처리할 수 없습니다.' });
  }
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: '인증 토큰이 누락되었습니다.' });
  }

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return res.status(403).json({
      error: '유효하지 않거나 만료된 토큰입니다.',
      detail: error ? error.message : '유저를 찾을 수 없습니다.'
    });
  }

  req.user = user;
  next();
}

// DB 설정 확인 미들웨어
function requireDB(req, res, next) {
  if (!process.env.DATABASE_URL) {
    return res.status(503).json({ error: '서버에 DATABASE_URL 설정이 없어 DB를 사용할 수 없습니다.' });
  }
  next();
}

app.get('/health', (req, res) => res.status(200).send('OK'));
app.get('/', (req, res) => res.json({ status: 'online', message: 'SOYO API Server' }));

// 프론트엔드 연결 테스트용 헬스체크
app.get('/api/test', (req, res) => {
  res.json({
    status: 'ok',
    message: 'SOYO 백엔드 연결 성공',
    timestamp: new Date().toISOString(),
    services: {
      database: Boolean(process.env.DATABASE_URL),
      supabase: Boolean(supabase)
    }
  });
});

// 1. 게시글 목록 불러오기 (비회원도 열람 가능)
app.get('/api/posts', requireDB, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM posts ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. 게시글 작성하기 (로그인 필수)
app.post('/api/posts', requireDB, authenticateToken, async (req, res) => {
  const { title, content } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: '제목과 내용을 모두 입력해주세요.' });
  }

  try {
    const query = `
      INSERT INTO posts (user_id, user_email, title, content)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const values = [req.user.id, req.user.email, title, content];
    const result = await pool.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
});
