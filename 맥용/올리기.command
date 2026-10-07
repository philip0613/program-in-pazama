#!/bin/bash
cd "$(dirname "$0")/.."
if ! command -v node >/dev/null; then
  echo "[오류] Node.js 가 설치되어 있지 않아요. https://nodejs.org 에서 LTS 버전을 설치하세요."
  read -n 1; exit 1
fi
node scripts/team.cjs save
echo
read -n 1 -p "아무 키나 누르면 창이 닫혀요"
