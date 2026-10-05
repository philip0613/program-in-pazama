const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Supabase JWT 검증 미들웨어
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: '인증 토큰이 누락되었습니다.' });
  }

  jwt.verify(token, process.env.SUPABASE_JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: '유효하지 않거나 만료된 토큰입니다.' });
    }
    req.user = decoded; // Supabase 유저 식별값(UUID) 및 이메일이 들어있음
    next();
  });
}

app.get('/health', (req, res) => res.status(200).send('OK'));
app.get('/', (req, res) => res.json({ status: 'online', message: 'SOYO API Server' }));

// RDS 연결 확인용 엔드포인트
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
app.get('/api/protected', authenticateToken, async (req, res) => {
  res.json({
    status: 'authorized',
    message: '인증 성공! 백엔드가 로그인된 유저를 확인했습니다.',
    userId: req.user.sub,
    email: req.user.email
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
});
