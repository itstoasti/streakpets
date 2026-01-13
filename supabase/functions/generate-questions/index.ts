import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { type, count = 10 } = await req.json()

    // Validate type
    if (!['trivia', 'would_you_rather', 'whos_more_likely'].includes(type)) {
      throw new Error('Invalid question type')
    }

    // Get Gemini API key from environment
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY not configured')
    }

    // Create Supabase client with service role for inserting
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Generate questions based on type
    let prompt = ''
    let parseResponse: (text: string) => any[] = () => []

    switch (type) {
      case 'trivia':
        prompt = `Generate ${count} fun, interesting trivia questions suitable for couples.
CRITICAL: Return ONLY valid JSON. Ensure all strings are properly escaped. No quotes or newlines in question text.
Format as a JSON array:
[
  {
    "question": "question text here",
    "options": ["A", "B", "C", "D"],
    "correct_answer": "correct option",
    "difficulty": "easy",
    "category": "category"
  }
]

Categories: pop culture, history, science, geography, food, movies, music, sports.
Return ONLY the JSON array, no markdown, no other text.`

        parseResponse = (text: string) => {
          let cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
          // Find JSON array
          const start = cleaned.indexOf('[')
          const end = cleaned.lastIndexOf(']')
          if (start !== -1 && end !== -1) {
            cleaned = cleaned.substring(start, end + 1)
          }
          const questions = JSON.parse(cleaned)
          return questions.map((q: any) => ({
            type: 'trivia',
            question: q.question,
            options: q.options,
            correct_answer: q.correct_answer,
            difficulty: q.difficulty,
            category: q.category
          }))
        }
        break

      case 'would_you_rather':
        prompt = `Generate ${count} fun "Would You Rather" questions for couples.
CRITICAL: Return ONLY valid JSON. Ensure all strings are properly escaped. No quotes or newlines in question text.
Format as a JSON array:
[
  {
    "question": "Would you rather A or B?",
    "category": "lifestyle"
  }
]

Categories: lifestyle, travel, food, entertainment, silly, deep.
Return ONLY the JSON array, no markdown, no other text.`

        parseResponse = (text: string) => {
          let cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
          // Find JSON array
          const start = cleaned.indexOf('[')
          const end = cleaned.lastIndexOf(']')
          if (start !== -1 && end !== -1) {
            cleaned = cleaned.substring(start, end + 1)
          }
          const questions = JSON.parse(cleaned)
          return questions.map((q: any) => ({
            type: 'would_you_rather',
            question: q.question,
            category: q.category || 'general',
            options: null,
            correct_answer: null,
            difficulty: null
          }))
        }
        break

      case 'whos_more_likely':
        prompt = `Generate ${count} fun "Who's More Likely To" questions for couples.
CRITICAL: Return ONLY valid JSON. Ensure all strings are properly escaped. No quotes or newlines in question text.
Format as a JSON array:
[
  {
    "question": "Who's more likely to do X?",
    "category": "daily life"
  }
]

Categories: daily life, personality, habits, funny, adventurous.
Return ONLY the JSON array, no markdown, no other text.`

        parseResponse = (text: string) => {
          let cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
          // Find JSON array
          const start = cleaned.indexOf('[')
          const end = cleaned.lastIndexOf(']')
          if (start !== -1 && end !== -1) {
            cleaned = cleaned.substring(start, end + 1)
          }
          const questions = JSON.parse(cleaned)
          return questions.map((q: any) => ({
            type: 'whos_more_likely',
            question: q.question,
            category: q.category || 'general',
            options: null,
            correct_answer: null,
            difficulty: null
          }))
        }
        break
    }

    // Call Gemini API
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.9,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
            responseMimeType: "application/json"
          }
        })
      }
    )

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text()
      throw new Error(`Gemini API error: ${errorText}`)
    }

    const geminiData = await geminiResponse.json()
    const generatedText = geminiData.candidates[0].content.parts[0].text

    // Parse the generated questions
    const questions = parseResponse(generatedText)

    // Insert questions into database
    const { data, error } = await supabase
      .from('conversation_questions')
      .insert(questions)
      .select()

    if (error) {
      throw error
    }

    return new Response(
      JSON.stringify({ success: true, count: data.length, questions: data }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
