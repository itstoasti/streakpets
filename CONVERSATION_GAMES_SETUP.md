# Conversation Games Setup Guide

This guide will help you set up AI-powered question generation for your conversation games using Google Gemini Flash API.

## Overview

The conversation games (Trivia, Would You Rather, Who's More Likely) now pull questions from a Supabase database. Questions are generated using Google's Gemini Flash API via a Supabase Edge Function.

## Prerequisites

- Supabase project
- Google Gemini API key (free tier available)
- Supabase CLI installed

## Step 1: Get Your Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy your API key (starts with `AIza...`)

**Free Tier Limits:**
- 15 requests per minute
- 1,500 requests per day
- 1 million requests per month
- Perfect for your use case!

## Step 2: Set Up the Database

1. Open your Supabase project dashboard
2. Go to the SQL Editor
3. Run the schema file:

```bash
# Navigate to your project
cd C:\Users\deanf\OneDrive\Desktop\projects\couples-pet-fresh

# Copy the SQL content from supabase/schema/conversation_questions.sql
# Paste it into the Supabase SQL Editor and run it
```

Or directly execute:
```bash
supabase db push
```

This creates:
- `conversation_questions` table
- Indexes for fast queries
- RLS policies for security
- Helper function `get_random_questions()`

## Step 3: Deploy the Edge Function

1. **Login to Supabase CLI:**
```bash
supabase login
```

2. **Link your project:**
```bash
supabase link --project-ref YOUR_PROJECT_REF
```

3. **Set your Gemini API key as a secret:**
```bash
supabase secrets set GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE
```

4. **Deploy the Edge Function:**
```bash
supabase functions deploy generate-questions
```

## Step 4: Generate Initial Questions

You can generate questions in two ways:

### Option A: Using the Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **Edge Functions**
3. Find `generate-questions` function
4. Click **Invoke**
5. Use this JSON body:

**For Trivia:**
```json
{
  "type": "trivia",
  "count": 50
}
```

**For Would You Rather:**
```json
{
  "type": "would_you_rather",
  "count": 50
}
```

**For Who's More Likely:**
```json
{
  "type": "whos_more_likely",
  "count": 50
}
```

### Option B: Using cURL

```bash
# Get your Supabase URL and anon key from dashboard

# Generate Trivia Questions
curl -X POST "https://YOUR_PROJECT_REF.supabase.co/functions/v1/generate-questions" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"type":"trivia","count":50}'

# Generate Would You Rather Questions
curl -X POST "https://YOUR_PROJECT_REF.supabase.co/functions/v1/generate-questions" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"type":"would_you_rather","count":50}'

# Generate Who's More Likely Questions
curl -X POST "https://YOUR_PROJECT_REF.supabase.co/functions/v1/generate-questions" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"type":"whos_more_likely","count":50}'
```

## Step 5: Verify Questions Were Generated

1. Go to Supabase Dashboard > **Table Editor**
2. Select `conversation_questions` table
3. You should see your generated questions!

## How It Works

### When Users Play Games:

1. **Trivia Game**: Fetches 5 random trivia questions
2. **Would You Rather**: Fetches 8 random questions
3. **Who's More Likely**: Fetches 10 random questions

### Question Storage:

```sql
-- Example trivia question
{
  "type": "trivia",
  "question": "What is the capital of France?",
  "options": ["London", "Paris", "Berlin", "Madrid"],
  "correct_answer": "Paris",
  "difficulty": "easy",
  "category": "Geography"
}

-- Example would you rather question
{
  "type": "would_you_rather",
  "question": "Would you rather travel to the past or the future?",
  "category": "lifestyle"
}

-- Example who's more likely question
{
  "type": "whos_more_likely",
  "question": "Who's more likely to forget their keys?",
  "category": "daily life"
}
```

## Refreshing Questions

You can generate new questions anytime by calling the Edge Function again. It will add new questions to your database.

**Recommended:**
- Generate 100-200 questions per type initially
- Refresh monthly with 50 new questions per type
- This keeps content fresh and uses minimal API calls

## Monitoring Usage

Check your question count:
```sql
SELECT type, COUNT(*) as count
FROM conversation_questions
GROUP BY type;
```

## Troubleshooting

### "No questions available"
- Run the Edge Function to generate questions
- Check Supabase Table Editor to verify questions exist
- Ensure RLS policies are correct

### Edge Function Errors
- Verify GEMINI_API_KEY is set: `supabase secrets list`
- Check function logs: Go to Supabase Dashboard > Edge Functions > Logs
- Ensure you have a valid Gemini API key

### Questions Not Loading in App
- Check browser/app console for errors
- Verify `questionsHelper.js` is imported correctly
- Test the RPC function in Supabase SQL Editor:
  ```sql
  SELECT * FROM get_random_questions('trivia', 5);
  ```

## Cost & Limits

### Gemini Flash Free Tier:
- ✅ **1 million requests/month** (more than enough!)
- ✅ Completely free
- ✅ No credit card required

### Recommended Schedule:
- Initial setup: Generate 150 questions (3 types × 50 questions)
- Monthly refresh: Generate 150 new questions
- **Total yearly usage:** ~1,800 requests (well under free limit!)

## Security

- ✅ API key stored in Supabase Edge Function (never exposed to client)
- ✅ RLS policies protect question data
- ✅ Only service role can insert/update questions
- ✅ Users can only read questions

## Next Steps

Once set up, your conversation games will:
- Always have fresh, AI-generated questions
- Work offline after initial load
- Provide unlimited variety
- Cost you $0!

Enjoy your AI-powered conversation games! 🎮💕
