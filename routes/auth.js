const express = require('express');
const router = express.Router();
const { pool } = require('../lib/db');

// 이메일 인증 코드 발송 (시연 및 연동용)
router.post('/email/send-code', (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: '올바른 이메일 주소를 입력해주세요.' });
  }

  // TODO: 실제 AWS SES 또는 메일러 연동 (현재 시연용 123456 반환 또는 성공 응답)
  return res.json({
    success: true,
    message: '인증코드가 발송되었습니다. (시연용 코드: 123456)'
  });
});

// 이메일 인증 코드 검증
router.post('/email/verify-code', (req, res) => {
  const { email, code } = req.body;
  if (!code) {
    return res.status(400).json({ error: '인증코드를 입력해주세요.' });
  }

  if (code === '123456') {
    return res.json({ verified: true, message: '이메일 인증이 완료되었습니다.' });
  }

  return res.status(400).json({ verified: false, error: '인증코드가 일치하지 않습니다.' });
});

// 회원가입 2단계 건강 프로필 저장 (RDS 연동 대기/지원)
router.post('/profile', async (req, res) => {
  try {
    const {
      userId,
      name,
      birth,
      allergies = [],
      diseases = [],
      medications = [],
      noAllergy = false,
      noDisease = false,
      noMedication = false
    } = req.body;

    if (!name || !birth) {
      return res.status(400).json({ error: '이름과 생년월일은 필수 입력값입니다.' });
    }

    // RDS 연결 상태 확인 후 저장 시도 (DB 미구축 시에도 안전하게 유효성 검사 응답 반환)
    let savedInDb = false;
    if (process.env.DATABASE_URL && userId) {
      try {
        const query = `
          INSERT INTO user_profiles (
            id, user_name, birth_date, chronic_conditions, allergies, has_medication
          ) VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (id) DO UPDATE SET
            user_name = EXCLUDED.user_name,
            birth_date = EXCLUDED.birth_date,
            chronic_conditions = EXCLUDED.chronic_conditions,
            allergies = EXCLUDED.allergies,
            has_medication = EXCLUDED.has_medication,
            updated_at = CURRENT_TIMESTAMP
        `;
        await pool.query(query, [
          userId,
          name,
          birth,
          diseases.join(', ') || '없음',
          allergies.join(', ') || '없음',
          medications.length > 0
        ]);
        savedInDb = true;
      } catch (dbErr) {
        console.warn('⚠️ 프로필 DB 저장 대기 (테이블 생성 전):', dbErr.message);
      }
    }

    return res.json({
      success: true,
      message: '프로필 정보가 성공적으로 수신 및 처리되었습니다.',
      savedInDb,
      profile: {
        userId,
        name,
        birth,
        allergies: noAllergy ? [] : allergies,
        diseases: noDisease ? [] : diseases,
        medications: noMedication ? [] : medications
      }
    });
  } catch (err) {
    console.error('프로필 처리 오류:', err);
    return res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
  }
});

module.exports = router;
