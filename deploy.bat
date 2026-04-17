@echo off
setlocal

echo Building project...
call npm run build
if errorlevel 1 (
  exit /b %errorlevel%
)

echo.
echo Upload reminder:
echo Upload the contents of the dist/ folder to your cPanel public web directory.

echo.
echo Files changed in the last commit:
git diff-tree --no-commit-id --name-only -r HEAD
