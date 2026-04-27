@echo off
cd C:\Users\glayd\oficina-carro
start cmd /k npm run dev
timeout /t 3 /nobreak >nul
start http://localhost:5173/