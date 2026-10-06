#!/bin/bash
cd "$(dirname "$0")"
if ! command -v node >/dev/null; then
  echo "[오류] Node.js 가 설치되어 있지 않아요. https://nodejs.org 에서 LTS 버전을 설치하세요."
  read -n 1; exit 1
fi
[ -f .env ] || { cp .env.example .env; echo ".env 파일을 새로 만들었어요. 단톡방에서 받은 키값을 넣어주세요."; }
echo "필요한 파일을 설치하는 중... (처음에는 1~2분 걸려요)"
npm install --no-fund --no-audit || { echo "[오류] 설치 실패. 이 창을 캡처해서 단톡방에 올려주세요."; read -n 1; exit 1; }
echo "=================================================="
echo " 백엔드 서버 실행 중! 확인: http://localhost:8080/api/test"
echo " 끄려면 이 창을 닫으세요."
echo "=================================================="
npm run dev 
