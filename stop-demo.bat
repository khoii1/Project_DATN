@echo off
chcp 65001 >nul
title Dung He thong Nong nghiep Thong minh
cd /d "%~dp0"
node scripts\stop-demo.cjs
echo.
pause
