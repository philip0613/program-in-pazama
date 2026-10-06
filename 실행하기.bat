@echo off
chcp 65001 >nul
cd /d "%~dp0"
title SOYO 실행 중 - 끄려면 이 창을 닫으세요

where node >nul 2>nul
if errorlevel 1 (
  echo [오류] Node.js 가 설치되어 있지 않아요.
  echo        https://nodejs.org 에서 LTS 버전을 설치한 뒤 다시 실행하세요.
  pause
  exit /b 1
)

if not exist .env (
  copy .env.example .env >nul
  echo .env 파일을 새로 만들었어요. 단톡방에서 받은 키값을 넣어주세요.
)

echo 필요한 파일을 설치하는 중... ^(처음에는 1~2분 걸려요^)
call npm install --no-fund --no-audit
if errorlevel 1 (
  echo [오류] 설치에 실패했어요. 이 창을 캡처해서 단톡방에 올려주세요.
  pause
  exit /b 1
)

echo.
echo ==================================================
echo  백엔드 서버 실행 중! 확인: http://localhost:8080/api/test
echo  끄려면 이 창을 닫으세요.
echo ==================================================
call npm run dev 
pause
