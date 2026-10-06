const { supabase } = require('../lib/supabase');

// 토큰 인증 미들웨어: 통과하면 req.user 에 로그인한 유저 정보가 담김
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

module.exports = { authenticateToken };
