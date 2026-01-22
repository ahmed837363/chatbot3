@echo off
title ALLaM AI Tunnel - KEEP OPEN
color 0A
echo ============================================
echo   ALLaM AI Tunnel Manager
echo ============================================
echo.
echo   URL: https://allam-ai.mayasahstyle.me
echo.
echo   DO NOT CLOSE THIS WINDOW!
echo   (Minimize it instead)
echo.
echo ============================================
echo.
echo Starting tunnel...
echo.
cloudflared tunnel run allam-ai
echo.
echo Tunnel stopped! Press any key to restart...
pause
goto :eof
