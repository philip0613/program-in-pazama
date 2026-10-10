# 📋 소요 (SOYO) 프론트엔드 연동 백엔드 TODO 리스트

본 문서는 프론트엔드 1차 작업물(`LoginPage.jsx`, `SignupFlow.jsx`) 및 전체 기획서(`SOYO_기능.txt`)를 기반으로 도출된 백엔드 연동 작업 목록입니다.
팀 원칙에 따라 **프론트엔드가 구현한 화면 범위에 맞춰 순차적으로 백엔드 기능을 제공**합니다.

---

## 🚀 1단계: 인증 및 건강 프로필 연동 (현재 작업 대상)

### 1.1 이메일 인증 시스템 (`SignupFlow - Step 1`)
- [ ] `POST /api/auth/email/send-code`
  - 요청: `{ "email": "user@example.com" }`
  - 로직: 6자리 난수 인증코드 생성 및 메일 발송 (Nodemailer or Supabase Auth OTP or AWS SES)
  - 응답: `{ "success": true, "message": "인증코드가 발송되었습니다." }`
- [ ] `POST /api/auth/email/verify-code`
  - 요청: `{ "email": "user@example.com", "code": "123456" }`
  - 로직: 발송된 인증코드 일치 여부 및 유효시간(3~5분) 검증
  - 응답: `{ "verified": true }`

### 1.2 회원가입 및 프로필 저장 (`SignupFlow - Step 2`)
- [ ] `POST /api/auth/signup`
  - 요청:
    ```json
    {
      "id": "userId",
      "password": "hashedPassword",
      "email": "user@example.com",
      "name": "홍길동",
      "birth": "1990-01-01",
      "allergies": ["식품", "약물"],
      "diseases": ["심혈관 질환"],
      "medications": ["아스피린", "오메가3"],
      "noAllergy": false,
      "noDisease": false,
      "noMedication": false
    }
    ```
  - 로직: 계정 생성 및 `user_profiles`, `user_medications` 테이블 저장 (팀 리더 Supabase 구축 완료 후 적용)
  - 응답: `{ "success": true, "userId": "uuid", "token": "jwt" }`

### 1.3 로그인 (`LoginPage`)
- [ ] `POST /api/auth/login`
  - 요청: `{ "userId": "...", "password": "..." }`
  - 로직: 비밀번호 일치 확인 및 JWT 토큰/세션 발급
  - 예외 처리: 아이디/비밀번호 불일치 시 401 에러 (`"아이디/비밀번호를 확인하세요"`)
- [ ] 소셜 로그인 연동 검토 (카카오, 네이버, 구글 Supabase OAuth)

---

## 🗺️ 2단계: 메인 지도 및 맞춤 산책 코스 연산 (프론트 구현 후 진행)
*프론트엔드가 지도/필터 UI 작업을 완료한 후 착수*

- [ ] `GET /api/places/search?keyword=...` : 지역/키워드 검색
- [ ] `POST /api/courses/recommend` : 산책 시간(10/25/60분) 및 식당 유무 조건 기반 코스 연산 (VitalRoot 알고리즘 이관)
- [ ] `GET /api/courses/:id/route` : 선택 코스 보행자 경로 좌표열(Polyline GeoJSON) 제공

---

## 🚶 3단계: 산책 진행 및 기록 (프론트 구현 후 진행)
- [ ] `POST /api/walk/records` : 산책 완료 데이터 저장 (`walk_records`)
- [ ] `GET /api/walk/records` : 산책 이력 및 통계 조회
