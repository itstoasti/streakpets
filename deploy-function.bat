@echo off
echo.
echo =====================================
echo   Deploy Edge Function to Supabase
echo =====================================
echo.
echo Opening Supabase Dashboard...
echo.
start https://supabase.com/dashboard/project/avnokifuqpazxcwynjmk/functions
echo.
echo MANUAL DEPLOYMENT STEPS:
echo.
echo 1. Click "Create a new function" or select existing "generate-questions"
echo 2. Function name: generate-questions
echo 3. Copy the contents from: supabase\functions\generate-questions\index.ts
echo 4. Click "Deploy function"
echo.
echo After deploying, set your secret:
echo 1. Go to Settings ^> Edge Functions ^> Secrets
echo 2. Add secret: GEMINI_API_KEY = your_key_here
echo.
echo Then run: node scripts\generate-questions.js all 50
echo.
pause
