@echo off
chcp 65001 >nul
title 워터팡! 초등 맞춤법 퀴즈 배틀 서버
echo ========================================================
echo   💧 워터팡! 초등 맞춤법 퀴즈 배틀
echo ========================================================
echo.
echo 서버를 시작합니다... (http://localhost:3000)
echo 잠시 후 웹 브라우저가 자동으로 실행됩니다.
echo.
set PORT=3000
start "" "http://localhost:3000"
"C:\Users\6-2 user\AppData\Roaming\Antigravity\bin\agy-node.cmd" server.js
pause
