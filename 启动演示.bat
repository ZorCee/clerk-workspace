@echo off
cd /d "%~dp0"
echo 正在启动文事台演示，本机访问：http://localhost:5175/
echo 这是虚构数据，不会改 D:\谛图文事台数据
echo 关闭请再运行「关闭网站.bat」，或在这个窗口按 Ctrl+C
echo.
call npm run demo
pause
