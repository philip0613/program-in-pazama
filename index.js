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

// RDS에 게시판 테이블 자동 생성 함수
async function initDB() {
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

// Supabase 클라이언트 초기화
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// 토큰 인증 미들웨어
async function authenticateToken(req, res, next) {
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

app.get('/health', (req, res) => res.status(200).send('OK'));
app.get('/', (req, res) => res.json({ status: 'online', message: 'SOYO API Server' }));

// 1. 게시글 목록 불러오기 (비회원도 열람 가능)
app.get('/api/posts', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM posts ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. 게시글 작성하기 (로그인 필수)
app.post('/api/posts', authenticateToken, async (req, res) => {
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
