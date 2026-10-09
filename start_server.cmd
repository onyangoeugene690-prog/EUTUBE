@echo off
title EuTube Server & Live Public Link
echo Starting EuTube Backend Server...
start "EuTube Server" /min "C:\Users\EUGENE\.python-portable\python3.14.7\python\python.exe" "C:\Users\EUGENE\Desktop\EUTUBE\server.py"
timeout /t 3 /nobreak >nul
echo Starting Live Public Link Tunnel...
start "EuTube Public Tunnel" "ssh.exe" -o StrictHostKeyChecking=no -R 80:127.0.0.1:5000 nokey@localhost.run
echo.
echo ========================================================
echo  EuTube is now active!
echo  Local Address: http://localhost:5000
echo ========================================================
echo.
pause
