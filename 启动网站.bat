@echo off
cd /d "%~dp0"
echo 正在启动文事台，本机访问：http://localhost:5173/
echo 关闭请再运行「关闭网站.bat」，或在这个窗口按 Ctrl+C
echo.
call npm start
pause
