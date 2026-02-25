@echo off
cd /d C:\Users\Admin\Downloads\web

git status --porcelain > temp_git_check.txt

for /f %%i in (temp_git_check.txt) do set changes=1

del temp_git_check.txt

if not defined changes (
    echo No changes to commit.
    pause
    exit
)

echo Changes detected.
git add .
git commit -m "Auto update %date% %time%"
git push origin main

echo Push complete.
pause