const SUPABASE_URL = (process.env.EXPO_PUBLIC_SUPABASE_URL || '').trim();
const SUPABASE_ANON_KEY = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '').trim();

async function countQuestions() {
  const types = ['trivia', 'would_you_rather', 'whos_more_likely'];

  console.log('\n📊 Question Database Status\n');

  for (const type of types) {
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

    const count = response.headers.get('content-range')?.split('/')[1] || '0';
    console.log(`${type.padEnd(20)} : ${count} questions`);
  }

  console.log('\n✅ Your conversation games are ready to play!\n');
}

countQuestions().catch(console.error);
