# SOYO API 명세

> 프론트엔드와 백엔드의 **약속**입니다. API를 추가하거나 바꿀 때는 **코드보다 이 문서를 먼저 고치고**, 단톡방에 알려주세요.
> 그래야 프론트는 목(mock) 데이터로, 백엔드는 실제 구현으로 동시에 개발할 수 있습니다.

## 공통 규칙
- 기본 주소: 로컬 `http://localhost:8080` / 배포 `https://program-in-pazama.onrender.com`
- 요청·응답 본문은 JSON
- 로그인이 필요한 API는 헤더에 `Authorization: Bearer <Supabase access_token>`
- **에러 응답은 항상** `{ "error": "사람이 읽을 수 있는 메시지" }`

| 상태 코드 | 의미 |
|---|---|
| 200 / 201 | 성공 / 생성 성공 |
| 400 | 요청 값이 잘못됨 (빈 제목 등) |
| 401 | 토큰 없음 |
| 403 | 토큰이 잘못되었거나 만료됨 |
| 500 | 서버 내부 오류 |
| 503 | 서버에 DB/Supabase 설정이 없음 (로컬 개발 중 흔함) |

---

## GET /api/test — 연결 테스트
응답 `200`
```json
{
  "status": "ok",
  "message": "SOYO 백엔드 연결 성공",
  "timestamp": "2026-10-07T00:00:00.000Z",
  "services": { "database": true, "supabase": true }
}
```

## GET /api/posts — 게시글 목록
로그인 불필요. 최신순 정렬.

응답 `200`
```json
[
  {
    "id": 1,
    "user_id": "supabase-user-uuid",
    "user_email": "friend@example.com",
    "title": "제목",
    "content": "내용",
    "created_at": "2026-10-07T00:00:00.000Z"
  }
]
```

## POST /api/posts — 게시글 작성
🔒 로그인 필요

요청
```json
{ "title": "제목", "content": "내용" }
```
응답 `201` — 생성된 게시글 (위 목록의 항목과 같은 형태)
에러 `400` 제목/내용 누락, `401`, `403`

---

## 새 API 추가 양식 (복사해서 사용)
```
## METHOD /api/경로 — 한 줄 설명
🔒 로그인 필요 여부
담당: 이름

요청: { ... }
응답 2xx: { ... }
에러: 400 ..., 404 ...
```
