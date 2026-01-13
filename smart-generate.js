const SUPABASE_URL = (process.env.EXPO_PUBLIC_SUPABASE_URL || '').trim();
const SUPABASE_ANON_KEY = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '').trim();
const TARGET = 50; // Target questions per type

async function getCount(type) {
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
  return parseInt(response.headers.get('content-range')?.split('/')[1] || '0');
}

async function generateQuestions(type, count) {
  console.log(`\n📝 Generating ${count} ${type} questions...`);

  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/generate-questions`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type, count })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  if (data.success) {
    console.log(`✅ Successfully generated ${data.count} ${type} questions!`);
    return true;
  } else {
    console.error(`❌ Failed: ${data.error}`);
    return false;
  }
}

async function main() {
  console.log('\n🤖 Smart Question Generator');
  console.log('============================');
  console.log(`Target: ${TARGET} questions per type`);
  console.log('Rate limit: 5 requests/minute\n');

  const types = ['trivia', 'would_you_rather', 'whos_more_likely'];
  let iteration = 1;

  while (true) {
    console.log(`\n--- Iteration ${iteration} ---`);

    // Check counts
    const counts = {};
    for (const type of types) {
      counts[type] = await getCount(type);
      console.log(`${type.padEnd(20)}: ${counts[type]}/${TARGET}`);
    }

    // Find type that needs most questions
    let needsGeneration = false;
    let typeToGenerate = null;
    let lowestCount = TARGET;

    for (const type of types) {
      if (counts[type] < TARGET && counts[type] < lowestCount) {
        lowestCount = counts[type];
        typeToGenerate = type;
        needsGeneration = true;
      }
    }

    // Check if all done
    if (!needsGeneration) {
      console.log('\n🎉 ALL TARGETS REACHED!');
      console.log(`\n✅ Final counts:`);
      for (const type of types) {
        console.log(`   ${type.padEnd(20)}: ${counts[type]} questions`);
      }
      break;
    }

    // Generate for type that needs it most
    const batchSize = Math.min(10, TARGET - counts[typeToGenerate]);
    console.log(`\n🎯 Generating ${batchSize} ${typeToGenerate} questions...`);

    try {
      await generateQuestions(typeToGenerate, batchSize);
      console.log('⏳ Waiting 15 seconds (rate limit protection)...');
      await new Promise(resolve => setTimeout(resolve, 15000));
    } catch (error) {
      if (error.message.includes('429')) {
        console.log('⚠️  Rate limit hit. Waiting 30 seconds...');
        await new Promise(resolve => setTimeout(resolve, 30000));
      } else {
        console.error('❌ Error:', error.message);
        console.log('Waiting 30 seconds before retry...');
        await new Promise(resolve => setTimeout(resolve, 30000));
      }
    }

    iteration++;
  }
}

main().catch(console.error);
