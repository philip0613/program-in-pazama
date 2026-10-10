require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDB } = require('./lib/db');

const app = express();
const PORT = process.env.PORT || 8080;

// CORS 허용 출처 (추가 출처는 CORS_ORIGINS 환경 변수에 콤마로 구분해 지정)
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://main.d3p7uoybais0cu.amplifyapp.com',
  'https://main.darvmwywsdw78.amplifyapp.com',
  ...(process.env.CORS_ORIGINS || '').split(',').map((o) => o.trim()).filter(Boolean)
];

// Amplify 앱의 브랜치/PR 미리보기 및 Amplify 호스트 허용 패턴
const amplifyPreviewPattern = /^https:\/\/[a-z0-9-]+\.(d3p7uoybais0cu|darvmwywsdw78|[a-z0-9-]+)\.amplifyapp\.com$/;

app.use(cors({
  origin(origin, callback) {
    // Origin 헤더가 없는 요청(curl, 서버 간 호출, 헬스체크)은 허용
    if (!origin || allowedOrigins.includes(origin) || amplifyPreviewPattern.test(origin)) {
      return callback(null, true);
    }
    callback(null, false);
  }
}));
app.use(express.json());

initDB();

app.get('/health', (req, res) => res.status(200).send('OK'));
app.get('/', (req, res) => res.json({ status: 'online', message: 'SOYO API Server' }));

// API 라우트 등록 — 새 기능은 routes/ 에 파일을 만들고 여기에 한 줄 추가
app.use('/api/test', require('./routes/test'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/auth', require('./routes/auth'));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
});
