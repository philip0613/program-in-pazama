# Antigravity 에이전트 워크스페이스 지침: 소요(SOYO) Backend

본 문서는 **소요(SOYO) 백엔드 (`PIP-Backend`)** 개발을 전담하는 AI 에이전트의 작업 지침 및 프로젝트 규약입니다.

---

## 🏛️ 프로젝트 개요 및 협업 아키텍처

- **프로젝트명**: 소요 (SOYO) - 웰니스·관광·건강 맞춤형 산책 및 여행 추천 서비스
- **협업 구조**: 멀티 레포 (Multi-Repo) 방식
  - **백엔드 (주 작업 대상)**: `d:\관광데이터\PIP-Backend` (Node.js/Express, Port `8080`)
  - **프론트엔드 (참조/연동)**: `d:\관광데이터\PIP-Frontend` (React/Vite, Port `5173`)
  - **기획 및 레퍼런스**: `d:\관광데이터\` 루트 내 기획서 및 데이터셋 문서
    - `SOYO_기능.txt`: 서비스 전체 플로우 및 상세 화면/기능 기획서
    - `SOYO_FE_BE_변수명.txt`: 프론트엔드 ↔ 백엔드 간 표준 DTO 및 변수명 사전
    - `1차_제출_기획서.txt`: 학술제 기획 원본 문서
    - `VitalRoot/`: 기존 프로토타입 알고리즘, 공공데이터 API, DUR 로직 아카이브

---

## 🚨 핵심 협업 원칙 (Strict Rules)
1. **프론트엔드 선행 작업 동기화 원칙**:
   * 백엔드는 반드시 **프론트엔드가 실제 작업하여 요청한 화면/기능 범위에 대해서만** 작업합니다.
   * 프론트엔드 요청이 없는 영역이나 미래 기능을 임의로 앞서서 구현하지 않습니다.
   * 사용자가 피그마 디자인 스크린샷 및 화면별 요청 사항을 제공하면, 해당 스펙에 맞춰 연산·API를 작성합니다.
2. **데이터베이스(DB) 임의 수정 금지**:
   * 팀 리더가 Supabase DB 스키마 구축을 완료하기 전까지는 DB 테이블 생성/변경 등 DDL 작업을 임의로 실행하지 않습니다.
   * `pip_database.sql` 및 DB 문서는 데이터 구조 참조용으로만 읽고 대기합니다.

---

## 🔑 환경 변수 및 인프라 명세 (`.env`)

백엔드는 아래 환경 변수를 기반으로 구동됩니다 (`PIP-Backend/.env`):
```env
PORT=8080

# 데이터베이스 (AWS RDS PostgreSQL & Supabase)
DATABASE_URL=
SUPABASE_URL=https://biruuwsoinqtlhdwbajh.supabase.co
SUPABASE_ANON_KEY=

# 공공데이터포털 공통 인증키 (TourAPI, DUR 안전정보, 식품영양성분DB)
TOUR_API_KEY=403b2fe19eec414cb6ba3fbdaed716ee3a54adb732b82e1c9aca7e2d1835e9d7
DUR_API_KEY=403b2fe19eec414cb6ba3fbdaed716ee3a54adb732b82e1c9aca7e2d1835e9d7
FOOD_API_KEY=403b2fe19eec414cb6ba3fbdaed716ee3a54adb732b82e1c9aca7e2d1835e9d7

# 도보 경로 / 맵 서비스 (선택)
TMAP_API_KEY=
NAVER_MAP_CLIENT_ID=pncc3tq0gp

# CORS 허용 출처
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

---

## 📐 개발 파이프라인 및 구현 지침

### 1. 표준 변수명 준수 (`SOYO_FE_BE_변수명.txt`)
* 프론트엔드와 통신하는 모든 JSON Request/Response 필드는 `SOYO_FE_BE_변수명.txt`에 명시된 카멜케이스(camelCase) 표준을 엄격히 준수합니다.
* 예시:
  - 인증/회원가입: `email`, `password`, `passwordConfirm`, `name`, `authMode`, `termsAgreed`
  - 산책/코스 추천: `activeTab`, `activeScreen`, `durationMinutes`, `hasRestaurant`, `courseList`, `routeDetail`
  - 건강 정보: `healthStatus`, `diseaseIds`, `diseaseList`, `otherDisease`

### 2. VitalRoot 핵심 로직의 백엔드 서비스 모듈화
기존 `VitalRoot/src/utils/` 및 `VitalRoot/src/config/`에 작성된 로직들을 백엔드 아키텍처에 맞게 Express 서비스 모듈로 이전합니다:
* `regionalCourseQuestBuilder.ts` ➡️ `services/courseService.js` (시간대별 10분/25분/60분 맞춤 산책 코스 연산)
* `tourApi.ts` ➡️ `services/tourApiService.js` (한국관광공사 지역 기반 관광지/음식점 필터링)
* `durService.ts` ➡️ `services/durService.js` (식약처 DUR 병용금기 및 주의성분 연산)
* `pedestrianRouter.ts` ➡️ `services/routerService.js` (보행자 경로 좌표열 생성)
* `wellnessData.ts` / `verifiedLandmarks.ts` ➡️ `lib/data/` (정적 랜드마크 및 웰니스 데이터)

### 3. 라우트 설계 원칙 (`routes/`)
* 엔드포인트는 RESTful 규칙을 따르며 `index.js`에 마운트합니다.
  - `/api/auth`: 회원가입, 로그인, 이메일 인증, 계정 찾기
  - `/api/courses`: 지역 검색, 산책 코스 필터링 및 추천 연산 (`duration`, `restaurant` 조건)
  - `/api/walk`: 산책 세션 시작, 진행 좌표 추적, 산책 완료 기록
  - `/api/places`: 관광지, 음식점, 웰니스 스팟 조회 (TourAPI 연동)
  - `/api/health`: 사용자 건강/질병 정보 및 DUR 주의 정보 연산

---

## 🔄 세션 복원 및 신속 작업 규칙

사용자가 **"대화창 불러와줘"**, **"작업 이어해줘"**, **"세션 복원해줘"** 등을 입력할 경우:
1. `SOYO_기능.txt` 및 `SOYO_FE_BE_변수명.txt`의 현재 작업 진행 상태를 확인합니다.
2. 프론트엔드가 요구하는 특정 화면/기능의 백엔드 API가 구현되어 있는지 점검합니다.
3. 작업 디렉터리(`d:\관광데이터\PIP-Backend`) 상태를 진단하고 즉시 다음 개발 단계로 진입합니다.
