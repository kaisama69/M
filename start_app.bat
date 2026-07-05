@echo off
title MindScale App Launcher

echo =========================================
echo Starting MindScale AI Mental Health Tracker
echo =========================================
echo.

echo [1/3] Starting Flask Backend API...
start "" cmd /k "python backend/app.py"

echo [2/3] Starting React Frontend Server...
start "" cmd /k "cd /d client && npm run dev"

echo [3/3] Waiting for servers to initialize...
ping 127.0.0.1 -n 5 > nul

echo Opening MindScale in your default browser...
start "" "http://localhost:5173"

echo.
echo =========================================
echo Both servers are now running in separate windows.
echo Close those windows to stop the application.
echo =========================================
echo.
