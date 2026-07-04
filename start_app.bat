@echo off
title MindScale App Launcher

echo =========================================
echo Starting MindScale AI Mental Health Tracker
echo =========================================
echo.

echo [1/3] Starting Flask Backend API...
start "MindScale Backend" cmd /k "python backend/app.py"

echo [2/3] Starting React Frontend Server...
start "MindScale Frontend" cmd /k "cd client && npm run dev"

echo [3/3] Waiting for servers to initialize...
timeout /t 4 /nobreak > nul

echo Opening MindScale in your default browser...
start http://localhost:5173

echo.
echo =========================================
echo Both servers are now running in separate windows.
echo Close those windows to stop the application.
echo =========================================
pause
