@echo off
cd /d "C:\IA\CODE\CRM\backend"
npx tsc --noEmit --pretty false > tsc_result.txt 2>&1
echo Exit: %ERRORLEVEL% >> tsc_result.txt
