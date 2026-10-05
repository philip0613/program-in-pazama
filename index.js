const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// AWS RDS PostgreSQL 연결 설정
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // RDS 외부 접속 시 SSL 통신 허용
  }
});

// 헬스 체크
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// 루트 경로
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'SOYO 백엔드 서버가 정상 구동 중입니다.'
  });
});

// RDS DB 연결 테스트 엔드포인트
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
    console.error('DB Connection Error:', error);
    res.status(500).json({
      status: 'error',
      message: 'DB 연결에 실패했습니다.',
      error: error.message
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
});
