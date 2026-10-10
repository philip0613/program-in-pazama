require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDB } = require('./lib/db');

const app = express();
const PORT = process.env.PORT || 8080;

// CORS 설정 (Amplify, localhost 및 모든 출처의 프리플라이트 OPTIONS 허용)
app.use(cors({
  origin(origin, callback) {
    // curl, 서버 간 호출 등 origin이 없거나 브라우저 호출은 모두 허용
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.options('*', cors());
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
