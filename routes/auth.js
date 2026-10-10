const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const nodemailer = require('nodemailer');
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

// 이메일 인증코드 메모리 캐시: cleanEmail -> { code, expiresAt, attempts }
const emailVerificationCodes = new Map();

// 주기적으로 만료된 인증코드 정리 (10분 간격)
setInterval(() => {
  const now = Date.now();
  for (const [email, entry] of emailVerificationCodes.entries()) {
    if (now > entry.expiresAt) {
      emailVerificationCodes.delete(email);
    }
  }
}, 10 * 60 * 1000).unref();

// Nodemailer SMTP 트랜스포터 생성기
function getEmailTransporter() {
  const smtpUser = process.env.SMTP_USER || process.env.SMTP_EMAIL;
  const smtpPass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;

  if (smtpUser && smtpPass) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    });
  }
  return null;
}

// 이메일 인증 코드 발송 (실제 6자리 랜덤 생성 및 SMTP 발송)
router.post('/email/send-code', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: '올바른 이메일 주소를 입력해주세요.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    // 6자리 난수 생성 (100000 ~ 999999)
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5분 유효

    emailVerificationCodes.set(cleanEmail, {
      code,
      expiresAt,
      attempts: 0
    });

    const transporter = getEmailTransporter();
    if (transporter) {
      try {
        const sender = process.env.SMTP_FROM || `"SOYO (소요)" <${process.env.SMTP_USER || process.env.SMTP_EMAIL}>`;
        await transporter.sendMail({
          from: sender,
          to: cleanEmail,
          subject: '[SOYO 소요] 회원가입 이메일 인증번호 안내',
          text: `안녕하세요. 시니어 맞춤 웰니스 여행 서비스 SOYO(소요)입니다.\n\n회원가입 인증번호: [${code}]\n\n인증번호는 5분간 유효합니다. 화면에 인증번호를 입력해 회원가입을 완료해 주세요.`,
          html: `
            <div style="font-family: 'Pretendard', sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
              <h2 style="color: #0f766e; margin-bottom: 16px;">SOYO (소요) 이메일 인증</h2>
              <p style="color: #334155; font-size: 15px; line-height: 1.6;">안녕하세요. 시니어 맞춤 웰니스 여행 서비스 <strong>SOYO(소요)</strong>입니다.<br/>회원가입을 위한 인증번호를 안내해 드립니다.</p>
              <div style="background-color: #f0fdfa; border: 1px solid #ccfbf1; padding: 18px; text-align: center; border-radius: 8px; margin: 24px 0;">
                <span style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #0d9488;">${code}</span>
              </div>
              <p style="color: #64748b; font-size: 13px;">• 인증번호는 5분 동안 유효합니다.<br/>• 본인이 요청하지 않은 경우 이 메일을 무시해 주세요.</p>
            </div>
          `
        });
        console.log(`✅ [이메일 인증번호 발송 완료] 대상: ${cleanEmail}`);
        return res.json({
          success: true,
          message: '인증코드가 발송되었습니다. 메일함을 확인해주세요.'
        });
      } catch (mailErr) {
        console.error('❌ [SMTP 발송 실패]:', mailErr.message);
        console.log(`📨 [인증번호 콘솔 백업] 대상: ${cleanEmail}, 코드: [${code}]`);
        return res.status(500).json({
          error: '메일 발송 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
        });
      }
    } else {
      // SMTP 미설정 환경 (로컬 개발 및 시연 모드 콘솔 출력)
      console.log(`📨 [이메일 인증번호 생성 (SMTP 미설정 모드)] 대상: ${cleanEmail}, 코드: [${code}] (유효시간: 5분)`);
      return res.json({
        success: true,
        message: '인증코드가 발송되었습니다. 메일함을 확인해주세요.',
        // SMTP 미설정 개발 환경일 때 백엔드 디버깅용 필드 (UI에는 노출되지 않음)
        debugCode: process.env.NODE_ENV !== 'production' ? code : undefined
      });
    }
  } catch (err) {
    console.error('이메일 발송 라우트 에러:', err);
    return res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
  }
});

// 이메일 인증 코드 검증 (실제 난수 일치 및 만료시간 확인)
router.post('/email/verify-code', (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ verified: false, error: '이메일과 인증코드를 모두 입력해주세요.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const entry = emailVerificationCodes.get(cleanEmail);

    if (!entry) {
      return res.status(400).json({ verified: false, error: '발송된 인증코드가 없습니다. 먼저 인증번호를 발송해주세요.' });
    }

    if (Date.now() > entry.expiresAt) {
      emailVerificationCodes.delete(cleanEmail);
      return res.status(400).json({ verified: false, error: '인증코드 유효시간(5분)이 만료되었습니다. 다시 발송해주세요.' });
    }

    if (entry.attempts >= 5) {
      emailVerificationCodes.delete(cleanEmail);
      return res.status(400).json({ verified: false, error: '인증 시도 횟수를 초과했습니다. 다시 발송해주세요.' });
    }

    entry.attempts += 1;

    if (entry.code !== String(code).trim()) {
      return res.status(400).json({ verified: false, error: '인증번호가 일치하지 않습니다. 다시 확인해주세요.' });
    }

    // 인증 성공 — 1회 사용 완료 후 파기
    emailVerificationCodes.delete(cleanEmail);
    console.log(`✅ [이메일 인증 성공] 대상: ${cleanEmail}`);
    return res.json({ verified: true, message: '이메일 인증이 완료되었습니다.' });
  } catch (err) {
    console.error('인증코드 검증 라우트 에러:', err);
    return res.status(500).json({ verified: false, error: '서버 내부 오류가 발생했습니다.' });
  }
});

// 회원가입 2단계 건강 프로필 저장 (AWS RDS PostgreSQL user_profiles, user_medications 테이블 영구 저장)
router.post('/profile', async (req, res) => {
  try {
    const {
      userId,
      name,
      birth,
      allergies = [],
      diseases = [],
      diseaseIds = [],
      medications = [],
      noAllergy = false,
      noDisease = false,
      noMedication = false
    } = req.body;

    if (!name || !birth) {
      return res.status(400).json({ error: '이름과 생년월일은 필수 입력값입니다.' });
    }

    if (!userId) {
      return res.status(400).json({ error: '사용자 식별자(userId)가 필요합니다.' });
    }

    const validUserId = toUuid(userId);

    // PostgreSQL text[] 배열 타입 준수
    const finalAllergies = noAllergy ? [] : (Array.isArray(allergies) ? allergies : [allergies].filter(Boolean));
    const rawDiseases = diseases.length > 0 ? diseases : diseaseIds;
    const finalDiseases = noDisease ? [] : (Array.isArray(rawDiseases) ? rawDiseases : [rawDiseases].filter(Boolean));
    const finalMedications = noMedication ? [] : (Array.isArray(medications) ? medications : [medications].filter(Boolean));
    const hasMedication = finalMedications.length > 0;

    // 생년월일 기반 나이 계산
    let calculatedAge = 50;
    if (birth) {
      const birthYear = new Date(birth).getFullYear();
      if (!isNaN(birthYear)) {
        calculatedAge = Math.max(0, new Date().getFullYear() - birthYear);
      }
    }

    let savedInDb = false;

    // AWS RDS 연결 상태 확인 및 저장
    if (process.env.DATABASE_URL) {
      try {
        // 1. user_profiles 저장/업데이트 (PostgreSQL text[] 호환)
        const profileQuery = `
          INSERT INTO user_profiles (
            id, user_name, birth_date, age, chronic_conditions, allergies, has_medication, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
          ON CONFLICT (id) DO UPDATE SET
            user_name = EXCLUDED.user_name,
            birth_date = EXCLUDED.birth_date,
            age = EXCLUDED.age,
            chronic_conditions = EXCLUDED.chronic_conditions,
            allergies = EXCLUDED.allergies,
            has_medication = EXCLUDED.has_medication,
            updated_at = CURRENT_TIMESTAMP
          RETURNING *;
        `;
        await pool.query(profileQuery, [
          validUserId,
          name,
          birth,
          calculatedAge,
          finalDiseases,
          finalAllergies,
          hasMedication
        ]);

        // 2. user_medications 저장
        await pool.query('DELETE FROM user_medications WHERE user_id = $1', [validUserId]);
        for (const med of finalMedications) {
          await pool.query(`
            INSERT INTO user_medications (id, user_id, name, timing)
            VALUES (gen_random_uuid(), $1, $2, '식후')
          `, [validUserId, med]);
        }

        savedInDb = true;
        console.log(`✅ [AWS RDS] 사용자 프로필 및 복용약물 저장 완료: ${name} (${validUserId})`);
      } catch (dbErr) {
        console.error('❌ [AWS RDS] 프로필 저장 오류:', dbErr.message);
        return res.status(500).json({ error: `데이터베이스 저장 중 오류가 발생했습니다: ${dbErr.message}` });
      }
    } else {
      console.warn('⚠️ [AWS RDS] DATABASE_URL 미설정으로 DB 저장을 건너뜁니다.');
    }

    return res.json({
      success: true,
      message: '프로필 정보가 성공적으로 처리되었습니다.',
      savedInDb,
      profile: {
        userId: validUserId,
        userName: name,
        birthDate: birth,
        age: calculatedAge,
        allergies: finalAllergies,
        chronicConditions: finalDiseases,
        diseaseIds: finalDiseases,
        medications: finalMedications,
        hasMedication
      }
    });
  } catch (err) {
    console.error('프로필 처리 오류:', err);
    return res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
  }
});

// AWS RDS 사용자 프로필 조회 (마이페이지 및 로그인 연동)
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

    const allergies = Array.isArray(profileRow.allergies)
      ? profileRow.allergies
      : (profileRow.allergies ? String(profileRow.allergies).split(', ') : []);

    const chronicConditions = Array.isArray(profileRow.chronic_conditions)
      ? profileRow.chronic_conditions
      : (profileRow.chronic_conditions ? String(profileRow.chronic_conditions).split(', ') : []);

    return res.json({
      success: true,
      profile: {
        userId: profileRow.id,
        userName: profileRow.user_name,
        birthDate: profileRow.birth_date,
        age: profileRow.age,
        chronicConditions,
        diseaseIds: chronicConditions,
        allergies,
        hasMedication: profileRow.has_medication,
        medications
      }
    });
  } catch (err) {
    console.error('프로필 조회 오류:', err);
    return res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
  }
});

// 네이버 소셜 로그인 연동 핸들러
router.post('/naver', async (req, res) => {
  try {
    const { code, state } = req.body;
    console.log('📌 [네이버 소셜 로그인 요청 수신]', { code, state });
    return res.json({
      success: true,
      message: '네이버 로그인 요청이 정상 접수되었습니다.'
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
