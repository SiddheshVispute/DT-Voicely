@echo off
title Voicely - Connect GitHub & Push Branch
cd /d "%~dp0"
echo =====================================================================
echo            Voicely: Authenticate and Push to GitHub
echo =====================================================================
echo.
echo Checking GitHub connection...
"C:\Program Files\GitHub CLI\gh.exe" auth status >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo You are not yet connected to GitHub.
    echo Opening GitHub web login...
    "C:\Program Files\GitHub CLI\gh.exe" auth login --web -h github.com -p https
    "C:\Program Files\GitHub CLI\gh.exe" auth setup-git
)

echo.
echo Pushing branch 'feat/vapi-integration-setup-guide' to GitHub...
git push -u origin feat/vapi-integration-setup-guide

if %ERRORLEVEL% EQU 0 (
    echo.
    echo =====================================================================
    echo [SUCCESS] Successfully pushed to https://github.com/SiddheshVispute/DT-Voicely.git!
    echo =====================================================================
) else (
    echo.
    echo [RETRYING] Attempting push via Git Credential Manager...
    git push -u origin feat/vapi-integration-setup-guide
)

echo.
pause
