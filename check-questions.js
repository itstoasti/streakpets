// Load environment variables from .env
require('dotenv').config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing environment variables!');
  console.error('Make sure .env file exists with:');
  console.error('  EXPO_PUBLIC_SUPABASE_URL');
  console.error('  EXPO_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

async function checkQuestions() {
  const types = ['trivia', 'would_you_rather', 'whos_more_likely'];

  console.log('\n📊 Question Database Status');
  console.log('============================\n');

  let totalQuestions = 0;

  for (const type of types) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/conversation_questions?type=eq.${type}&select=count`,
        {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Prefer': 'count=exact'
          }
        }
      );

      const count = parseInt(response.headers.get('content-range')?.split('/')[1] || '0');
      totalQuestions += count;

      const status = count >= 50 ? '✅' : count > 0 ? '⚠️' : '❌';
      console.log(`${status} ${type.padEnd(20)} : ${count.toString().padStart(3)} questions`);
    } catch (error) {
      console.error(`❌ ${type.padEnd(20)} : Error - ${error.message}`);
    }
  }

  console.log('\n============================');
  console.log(`Total: ${totalQuestions} questions\n`);

  if (totalQuestions === 0) {
    console.log('⚠️  No questions found in database!');
    console.log('\nTo generate questions, run:');
    console.log('  node smart-generate.js\n');
  } else if (totalQuestions < 150) {
    console.log('⚠️  Not enough questions for optimal gameplay.');
    console.log('Recommended: 50+ per type (150 total)\n');
    console.log('To generate more questions, run:');
    console.log('  node smart-generate.js\n');
  } else {
    console.log('✅ Your conversation games are ready to play!\n');
  }
}

checkQuestions().catch(console.error);
