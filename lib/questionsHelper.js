import { supabase } from './supabase';

/**
 * Get random questions from the database
 * @param {string} type - 'trivia', 'would_you_rather', or 'whos_more_likely'
 * @param {number} count - Number of questions to fetch
 * @returns {Promise<Array>} Array of questions
 */
export async function getRandomQuestions(type, count = 1) {
  const { data, error } = await supabase
    .rpc('get_random_questions', {
      question_type: type,
      limit_count: count
    });

  if (error) {
    console.error('Error fetching questions:', error);
    return [];
  }

  return data || [];
}

/**
 * Get a single random question
 * @param {string} type - 'trivia', 'would_you_rather', or 'whos_more_likely'
 * @returns {Promise<Object|null>} Single question object
 */
export async function getRandomQuestion(type) {
  const questions = await getRandomQuestions(type, 1);
  return questions.length > 0 ? questions[0] : null;
}

/**
 * Trigger the Edge Function to generate new questions
 * @param {string} type - 'trivia', 'would_you_rather', or 'whos_more_likely'
 * @param {number} count - Number of questions to generate
 * @returns {Promise<Object>} Response from Edge Function
 */
export async function generateQuestions(type, count = 10) {
  const { data, error } = await supabase.functions.invoke('generate-questions', {
    body: { type, count }
  });

  if (error) {
    console.error('Error generating questions:', error);
    throw error;
  }

  return data;
}

/**
 * Get count of questions in database by type
 * @param {string} type - 'trivia', 'would_you_rather', or 'whos_more_likely'
 * @returns {Promise<number>} Count of questions
 */
export async function getQuestionCount(type) {
  const { count, error } = await supabase
    .from('conversation_questions')
    .select('*', { count: 'exact', head: true })
    .eq('type', type);

  if (error) {
    console.error('Error counting questions:', error);
    return 0;
  }

  return count || 0;
}
