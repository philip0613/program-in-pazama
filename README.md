# SOYO 백엔드 (program-in-pazama)

Node.js + Express API 서버입니다. 프론트엔드: [programing-in-pajama](https://github.com/philip0613/programing-in-pajama)

> 🐣 **Git/GitHub 이 처음이라면 → [초보자 가이드](docs/GUIDE.md) 부터 보세요!** (명령어 없이 버튼으로만)

## 처음 실행하기
**가장 쉬운 방법:** 폴더 안의 `실행하기.bat` 더블클릭 (맥은 `맥용/실행하기.command`). 설치부터 실행까지 자동으로 해줘요.

| 더블클릭 파일 | 하는 일 |
|---|---|
| `작업시작.bat` | 최신 코드 받기 + 내 작업 공간(브랜치) 만들기 |
| `실행하기.bat` | 설치 + 개발 서버 실행 |
| `올리기.bat` | 저장(commit) + 올리기(push) + PR 페이지 열기 |
| `최신받기.bat` | 친구들이 합친 최신 코드 받기 |

(실제 동작은 `scripts/team.cjs` — 프론트/백엔드 레포에 같은 파일이 있으니 고칠 땐 양쪽 다)

터미널로 직접 하려면 (Node.js 20 이상 필요):

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

## API 테스트
VS Code 에서 `api-test.http` 를 열고 요청 위의 **Send Request** 클릭 (REST Client 확장 필요 — 권장 확장으로 자동 안내됨). 자세한 방법은 [가이드 4번](docs/GUIDE.md#4--내가-만든-거-테스트하기).

## 새 API 추가하는 법
1. `docs/API.md` 에 명세를 먼저 적고 단톡방에 공유
2. `routes/` 에 파일 생성 (예: `routes/comments.js`, `routes/posts.js` 참고)
3. `index.js` 에 한 줄 추가: `app.use('/api/comments', require('./routes/comments'));`
4. 로그인이 필요하면 `authenticateToken` 미들웨어를 붙이면 `req.user` 를 쓸 수 있음
5. `api-test.http` 에 테스트 요청 추가

## 협업 규칙
1. `main` 에서 바로 작업하지 말고 `작업시작.bat` 으로 작업 공간 만들기
2. 작업이 끝나면 `올리기.bat` → PR 만들고 **다른 친구 1명이 확인한 뒤** 합치기
3. API를 바꾸고 싶으면 먼저 `docs/API.md` 수정 + 단톡방에 알리기

> ⚠️ `main` 에 합쳐지면 **Render 실서버에 자동 배포**됩니다.
