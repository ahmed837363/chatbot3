@echo off
title Salla AI Chatbot - Cloudflare Tunnel
echo ========================================
echo   Salla AI Chatbot - Starting Tunnel
echo ========================================
echo.
echo Starting Cloudflare Tunnel for ALLaM AI...
echo Permanent URL: https://allam-ai.mayasahstyle.me
echo.
echo DO NOT CLOSE THIS WINDOW!
echo (Minimize it instead)
echo.
echo ----------------------------------------
npx cloudflared tunnel run allam-ai
pause
