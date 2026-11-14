@echo off
chcp 65001 >nul
title Khoi dong He thong Nong nghiep Thong minh
cd /d "%~dp0"
node scripts\start-demo.cjs
echo.
pause
