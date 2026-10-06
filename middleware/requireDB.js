// DB 설정 확인 미들웨어
function requireDB(req, res, next) {
  if (!process.env.DATABASE_URL) {
    return res.status(503).json({ error: '서버에 DATABASE_URL 설정이 없어 DB를 사용할 수 없습니다.' });
  }
  next();
}

module.exports = { requireDB };
