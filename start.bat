@echo off
title MYSTUDIES Server
color 0B
cls
echo.
echo ============================================
echo       MYSTUDIES - منصة الطالب المتكاملة
echo ============================================
echo.
echo [1] تثبيت الاعتماديات...
cd /d "%~dp0server"
call npm install --silent 2>nul
echo [2] تشغيل الخادم...
echo.
echo ============================================
echo   🌐 الموقع:     http://localhost:3001
echo   🎛  لوحة التحكم: http://localhost:3001/admin/
echo   🔐 البريد:     admin@mystudies.ma
echo   🔑 كلمة السر:  admin123
echo ============================================
echo.
node server.js
pause
