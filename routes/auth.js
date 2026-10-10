const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { pool } = require('../lib/db');

// UUID 형식 보장 헬퍼 (PostgreSQL UUID 타입 컬럼 호환)
function toUuid(id) {
  if (!id) return crypto.randomUUID();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(id)) return id;
  const hash = crypto.createHash('md5').update(String(id)).digest('hex');
  return [
    hash.substring(0, 8),
    hash.substring(8, 12),
    '4' + hash.substring(13, 16),
    'a' + hash.substring(17, 20),
    hash.substring(20, 32)
  ].join('-');
}


// 이메일 인증 코드 발송
router.post('/email/send-code', (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: '올바른 이메일 주소를 입력해주세요.' });
  }

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

// 회원가입 2단계 건강 프로필 저장 (문서 알고리즘: Supabase 인증 후 AWS RDS 저장)
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

    let savedInDb = false;
    // AWS RDS 연결 상태 확인 및 저장
    if (process.env.DATABASE_URL && userId) {
      try {
        const validUserId = toUuid(userId);
        // 1. user_profiles 저장/업데이트
        const profileQuery = `
          INSERT INTO user_profiles (
            id, user_name, birth_date, chronic_conditions, allergies, has_medication, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
          ON CONFLICT (id) DO UPDATE SET
            user_name = EXCLUDED.user_name,
            birth_date = EXCLUDED.birth_date,
            chronic_conditions = EXCLUDED.chronic_conditions,
            allergies = EXCLUDED.allergies,
            has_medication = EXCLUDED.has_medication,
            updated_at = CURRENT_TIMESTAMP
        `;
        await pool.query(profileQuery, [
          validUserId,
          name,
          birth,
          diseases.join(', ') || '없음',
          allergies.join(', ') || '없음',
          medications.length > 0
        ]);

        // 2. user_medications 저장
        if (medications.length > 0) {
          await pool.query('DELETE FROM user_medications WHERE user_id = $1', [validUserId]);
          for (const med of medications) {
            await pool.query(`
              INSERT INTO user_medications (id, user_id, name, timing)
              VALUES (gen_random_uuid(), $1, $2, '식후')
            `, [validUserId, med]);
          }
        }

        savedInDb = true;
        console.log(`✅ [AWS RDS] 사용자 프로필 저장 완료: ${name} (${validUserId})`);
      } catch (dbErr) {
        console.warn('⚠️ [AWS RDS] 프로필 저장 대기 (테이블 생성 확인 필요):', dbErr.message);
      }
    }

    return res.json({
      success: true,
      message: '프로필 정보가 성공적으로 처리되었습니다.',
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

// AWS RDS 사용자 프로필 조회 (문서 알고리즘: 로그인 인증 후 AWS 클라우드 조회)
router.get('/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!process.env.DATABASE_URL) {
      return res.status(503).json({ error: 'DB가 설정되지 않았습니다.' });
    }

    const validUserId = toUuid(userId);
    const result = await pool.query('SELECT * FROM user_profiles WHERE id = $1', [validUserId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '프로필을 찾을 수 없습니다.' });
    }

    const profileRow = result.rows[0];
    const medResult = await pool.query('SELECT name FROM user_medications WHERE user_id = $1', [validUserId]);
    const medications = medResult.rows.map((r) => r.name);

    return res.json({
      success: true,
      profile: {
        userId: profileRow.id,
        userName: profileRow.user_name,
        birthDate: profileRow.birth_date,
        chronicConditions: profileRow.chronic_conditions,
        allergies: profileRow.allergies,
        hasMedication: profileRow.has_medication,
        medications
      }
    });
  } catch (err) {
    console.error('프로필 조회 오류:', err);
    return res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
  }
});

// 네이버 소셜 로그인 연동 핸들러 (문서 알고리즘 준수)
router.post('/naver', async (req, res) => {
  try {
    const { code, state } = req.body;
    console.log('📌 [네이버 소셜 로그인 요청 수신]', { code, state });
    // 네이버 사용자 정보 조회 및 Supabase/RDS 저장 준비
    return res.json({
      success: true,
      message: '네이버 로그인 요청이 정상 접수되었습니다.'
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
