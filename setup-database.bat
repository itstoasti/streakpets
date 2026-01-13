@echo off
echo.
echo =====================================
echo   Setup Conversation Questions DB
echo =====================================
echo.
echo Opening Supabase SQL Editor...
echo.
start https://supabase.com/dashboard/project/avnokifuqpazxcwynjmk/sql/new
echo.
echo STEPS:
echo.
echo 1. Copy all contents from: supabase\schema\conversation_questions.sql
echo 2. Paste into the SQL Editor that just opened
echo 3. Click "Run" to execute
echo.
echo This will create:
echo   - conversation_questions table
echo   - Indexes for performance
echo   - RLS policies for security
echo   - get_random_questions() function
echo.
pause
