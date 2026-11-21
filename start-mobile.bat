@echo off
chcp 65001 >nul
title Khoi dong Ung dung Mobile React Native - Expo Go (Nong Nghiep Thong Minh)
cd /d "%~dp0mobile"
echo ====================================================================
echo   UNG DUNG DI DONG NONG NGHIEP THONG MINH (REACT NATIVE + EXPO GO)
echo   - Quet ma QR ben duoi bang ung dung Expo Go tren Android / iPhone
echo   - Hoac nhan phim "w" trong cua so nay de mo giao dien Mobile tren Web
echo ====================================================================
npx expo start
pause
