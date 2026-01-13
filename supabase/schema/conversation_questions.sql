-- Create conversation_questions table for storing AI-generated questions
CREATE TABLE IF NOT EXISTS conversation_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('trivia', 'would_you_rather', 'whos_more_likely')),
  question text NOT NULL,
  options jsonb, -- for trivia multiple choice answers
  correct_answer text, -- for trivia
  difficulty text CHECK (difficulty IN ('easy', 'medium', 'hard')),
  category text,
  created_at timestamp with time zone DEFAULT now()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_conversation_questions_type ON conversation_questions(type);
CREATE INDEX IF NOT EXISTS idx_conversation_questions_difficulty ON conversation_questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_conversation_questions_category ON conversation_questions(category);

-- Enable RLS
ALTER TABLE conversation_questions ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read questions
CREATE POLICY "Anyone can read questions" ON conversation_questions
  FOR SELECT
  USING (true);

-- Policy: Only service role can insert/update/delete (edge functions)
CREATE POLICY "Service role can manage questions" ON conversation_questions
  FOR ALL
  USING (auth.role() = 'service_role');

-- Create a function to get random questions
CREATE OR REPLACE FUNCTION get_random_questions(question_type text, limit_count int DEFAULT 1)
RETURNS SETOF conversation_questions
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM conversation_questions
  WHERE type = question_type
  ORDER BY RANDOM()
  LIMIT limit_count;
$$;
