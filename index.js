const express = require('express');
const cors = require('cors');

const app = express();
// AWS App Runner가 지정하는 환경 변수 PORT(기본 8080) 수용
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// AWS App Runner 헬스 체크 경로
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// 기본 확인용 엔드포인트
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'SOYO 백엔드 서버가 정상 구동 중입니다.'
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
});
