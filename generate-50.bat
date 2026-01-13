@echo off
set EXPO_PUBLIC_SUPABASE_URL=https://avnokifuqpazxcwynjmk.supabase.co
set EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2bm9raWZ1cXBhenhjd3luam1rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2ODM4OTUsImV4cCI6MjA4MTI1OTg5NX0.JaaZj0yvFXGuxHq-OSn57CTKlP0pUxHfk3swPtfq2eg

echo Generating 50 questions per type (5 batches of 10)...
echo.

echo === TRIVIA ===
for /L %%i in (1,1,5) do (
  echo Batch %%i/5...
  node scripts\generate-questions.js trivia 10
  timeout /t 2 /nobreak >nul
)

echo.
echo === WOULD YOU RATHER ===
for /L %%i in (1,1,5) do (
  echo Batch %%i/5...
  node scripts\generate-questions.js would_you_rather 10
  timeout /t 2 /nobreak >nul
)

echo.
echo === WHO'S MORE LIKELY ===
for /L %%i in (1,1,5) do (
  echo Batch %%i/5...
  node scripts\generate-questions.js whos_more_likely 10
  timeout /t 2 /nobreak >nul
)

echo.
echo Done! Generated 150 questions total.
