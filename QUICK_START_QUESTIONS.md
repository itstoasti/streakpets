# Quick Start: Generate Questions

## TL;DR - Get Started in 5 Minutes

### 1. Get Gemini API Key
```
1. Go to: https://makersuite.google.com/app/apikey
2. Click "Create API Key"
3. Copy your key
```

### 2. Set Up Database
```bash
# In Supabase SQL Editor, paste and run:
supabase/schema/conversation_questions.sql
```

### 3. Deploy Edge Function
```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase secrets set GEMINI_API_KEY=YOUR_KEY_HERE
supabase functions deploy generate-questions
```

### 4. Generate Questions

**Option A: Use the Script (Easiest)**
```bash
node scripts/generate-questions.js all 50
```

**Option B: Use Supabase Dashboard**
1. Go to Edge Functions > generate-questions
2. Click "Invoke"
3. Paste: `{"type":"trivia","count":50}`
4. Repeat for `would_you_rather` and `whos_more_likely`

**Option C: Use cURL**
```bash
curl -X POST "https://YOUR_PROJECT.supabase.co/functions/v1/generate-questions" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"type":"trivia","count":50}'
```

### 5. Test It!
Open your app and play the conversation games. They'll now pull from your database!

## Add to package.json (Optional)

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "questions:generate": "node scripts/generate-questions.js all 50",
    "questions:trivia": "node scripts/generate-questions.js trivia 50",
    "questions:wyr": "node scripts/generate-questions.js would_you_rather 50",
    "questions:likely": "node scripts/generate-questions.js whos_more_likely 50"
  }
}
```

Then run:
```bash
npm run questions:generate
```

## Verify Questions Were Created

```sql
-- Run in Supabase SQL Editor
SELECT type, COUNT(*) as count
FROM conversation_questions
GROUP BY type;
```

You should see:
```
trivia             | 50
would_you_rather   | 50
whos_more_likely   | 50
```

## Monthly Refresh

Just run the script again once a month to add fresh questions:
```bash
npm run questions:generate
```

## Troubleshooting

**"GEMINI_API_KEY not configured"**
- Run: `supabase secrets set GEMINI_API_KEY=your_key_here`
- Verify: `supabase secrets list`

**"No questions available" in app**
- Check the database: Go to Table Editor > conversation_questions
- If empty, run the generation script again

**Edge Function not found**
- Deploy it: `supabase functions deploy generate-questions`
- Check: Go to Supabase Dashboard > Edge Functions

## That's It!

Your conversation games now have unlimited AI-generated questions. Completely free with Gemini's 1M requests/month limit! 🎉
