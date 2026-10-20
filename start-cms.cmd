@echo off
cd /d "%~dp0"
echo ===================================================
echo   Gift Studio CMS - Quan ly mon qua 20/10
echo   He thong chay 100% tren Trinh duyet (Zero-Backend)
echo ===================================================
echo Dang mo giao dien CMS tai: http://127.0.0.1:2010/admin/
start http://127.0.0.1:2010/admin/
python -m http.server 2010 --bind 127.0.0.1
if %errorlevel% neq 0 (
  echo Khong tim thay Python tren may. Ban co the mo truc tiep admin\index.html tren trinh duyet!
  pause
)
