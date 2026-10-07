@echo off
chcp 65001 >nul
cd /d "%~dp0"
title SOYO - 올리기
where node >nul 2>nul
if errorlevel 1 (
  echo [오류] Node.js 가 설치되어 있지 않아요. https://nodejs.org 에서 LTS 버전을 설치한 뒤 다시 실행하세요.
  pause
  exit /b 1
)
node scripts/team.cjs save
echo.
pause
