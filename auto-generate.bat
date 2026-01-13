@echo off
set EXPO_PUBLIC_SUPABASE_URL=https://avnokifuqpazxcwynjmk.supabase.co
set EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2bm9raWZ1cXBhenhjd3luam1rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2ODM4OTUsImV4cCI6MjA4MTI1OTg5NX0.JaaZj0yvFXGuxHq-OSn57CTKlP0pUxHfk3swPtfq2eg

echo ========================================
echo   Auto-Generate Conversation Questions
echo ========================================
echo.
echo Target: 50 questions per type
echo Rate limit: 5 requests/minute (wait 15s between calls)
echo.
echo Press Ctrl+C to stop at any time
echo.
pause

:loop
echo.
echo === Checking current counts ===
node count-questions.js

echo.
echo === Generating next batch (10 questions) ===

REM Check which type needs more questions and generate
REM For now, focusing on whos_more_likely since it has 0

node scripts\generate-questions.js whos_more_likely 10
if errorlevel 1 (
  echo.
  echo Error occurred or rate limit hit. Waiting 30 seconds...
  ping 127.0.0.1 -n 31 >nul
) else (
  echo.
  echo Success! Waiting 15 seconds before next batch...
  ping 127.0.0.1 -n 16 >nul
)

goto loop
