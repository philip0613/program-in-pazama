# SOYO 백엔드 (program-in-pazama)

Node.js + Express API 서버입니다. 프론트엔드: [programing-in-pajama](https://github.com/philip0613/programing-in-pajama)

## 처음 실행하기
Node.js 20 이상이 필요합니다.

```bash
git clone https://github.com/philip0613/program-in-pazama.git
cd program-in-pazama
npm install
cp .env.example .env      # Windows PowerShell: copy .env.example .env
npm run dev
```

브라우저에서 http://localhost:8080/api/test 를 열어 `"status":"ok"` 가 보이면 성공입니다.

> `.env` 의 DB/Supabase 값은 팀 단톡방 공지에서 받으세요. **비워둬도 서버는 켜지고**, DB가 필요한 API만 503을 돌려줍니다.
> `.env` 는 절대 커밋하지 마세요 (이미 `.gitignore` 에 들어 있어요).

## 폴더 구조
```
index.js              서버 설정 + 라우트 등록 (여기는 거의 건드릴 일 없음)
routes/               ★ 기능별 API — 대부분의 작업은 여기서
  test.js               GET /api/test
  posts.js              GET·POST /api/posts
middleware/           요청 전에 실행되는 검사 (로그인 확인 등)
lib/                  DB, Supabase 연결
docs/API.md           ★ API 명세 (프론트와의 약속)
```

## 새 API 추가하는 법
1. `docs/API.md` 에 명세를 먼저 적고 단톡방에 공유
2. `routes/` 에 파일 생성 (예: `routes/comments.js`, `routes/posts.js` 참고)
3. `index.js` 에 한 줄 추가: `app.use('/api/comments', require('./routes/comments'));`
4. 로그인이 필요하면 `authenticateToken` 미들웨어를 붙이면 `req.user` 를 쓸 수 있음

## 협업 규칙
1. `main` 에서 바로 작업하지 말고 브랜치 만들기: `git switch -c feat/기능이름`
2. 작업이 끝나면 PR 올리고 **다른 친구 1명이 확인한 뒤** 합치기
3. API를 바꾸고 싶으면 먼저 `docs/API.md` 수정 + 단톡방에 알리기

> ⚠️ `main` 에 합쳐지면 **Render 실서버에 자동 배포**됩니다.
