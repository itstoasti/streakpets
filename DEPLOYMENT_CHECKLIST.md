# Edge Function Deployment Checklist

Since the Supabase CLI isn't connecting to your project, here's the manual deployment process:

## Step 1: Setup Database Schema ✓

**Two browser tabs should have opened:**
1. SQL Editor
2. Edge Functions page

**In the SQL Editor tab:**

1. Copy the entire contents of `supabase/schema/conversation_questions.sql`
2. Paste into the SQL Editor
3. Click **Run** button

This creates:
- `conversation_questions` table
- Indexes for fast queries
- RLS security policies
- `get_random_questions()` function

---

## Step 2: Deploy Edge Function

**In the Edge Functions tab:**

1. Click **Create a new function** (or edit if "generate-questions" exists)
2. Function name: `generate-questions`
3. Copy the entire contents of `supabase/functions/generate-questions/index.ts`
4. Paste into the function editor
5. Click **Deploy**

---

## Step 3: Set Gemini API Key

1. Go to **Settings** (gear icon in sidebar)
2. Click **Edge Functions**
3. Click **Secrets** tab
4. Add new secret:
   - Name: `GEMINI_API_KEY`
   - Value: `YOUR_GEMINI_API_KEY` (get from https://makersuite.google.com/app/apikey)
5. Click **Save**

---

## Step 4: Generate Initial Questions

Run this command in your terminal:

```bash
node scripts/generate-questions.js all 50
```

This will generate:
- 50 trivia questions
- 50 would you rather questions
- 50 who's more likely questions

---

## Step 5: Verify

**Check questions were created:**

1. Go to **Table Editor** in Supabase Dashboard
2. Select `conversation_questions` table
3. You should see 150 questions

**Or run this SQL query:**

```sql
SELECT type, COUNT(*) as count
FROM conversation_questions
GROUP BY type;
```

You should see:
```
trivia           | 50
would_you_rather | 50
whos_more_likely | 50
```

---

## Step 6: Test in App

Open your app and play the conversation games. They'll now pull questions from the database!

---

## Troubleshooting

**"GEMINI_API_KEY not configured"**
- Make sure you set the secret in Settings > Edge Functions > Secrets
- Redeploy the function after setting the secret

**"No questions available"**
- Run the generation script: `node scripts/generate-questions.js all 50`
- Check Table Editor to verify questions exist

**Function deployment failed**
- Make sure you copied the ENTIRE index.ts file
- Check the function logs in the Edge Functions page

---

## Monthly Refresh

To add fresh questions monthly:

```bash
node scripts/generate-questions.js all 50
```

This adds 50 new questions per type to your database.
