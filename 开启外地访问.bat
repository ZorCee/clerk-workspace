@echo off
cd /d "%~dp0"
echo 请先保持「启动网站.bat」窗口开着。
echo 下面会出现一个 https://xxxx.loca.lt 地址，发给外地同事即可。
echo 关掉这个窗口，或运行「关闭网站.bat」，外地访问就会停。
echo.
call npm run share
pause
