/**
 * Script to generate conversation questions using Supabase Edge Function
 *
 * Usage:
 *   node scripts/generate-questions.js [type] [count]
 *
 * Examples:
 *   node scripts/generate-questions.js trivia 50
 *   node scripts/generate-questions.js would_you_rather 50
 *   node scripts/generate-questions.js whos_more_likely 50
 *   node scripts/generate-questions.js all 50
 */

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const questionTypes = ['trivia', 'would_you_rather', 'whos_more_likely'];

async function generateQuestions(type, count = 50) {
  console.log(`\n📝 Generating ${count} ${type} questions...`);

  try {
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
      console.log(`   First question: "${data.questions[0].question}"`);
    } else {
      console.error(`❌ Failed to generate ${type} questions:`, data.error);
    }

    return data;
  } catch (error) {
    console.error(`❌ Error generating ${type} questions:`, error.message);
    throw error;
  }
}

async function main() {
  // Check for environment variables
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Error: Missing Supabase environment variables!');
    console.error('   Make sure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are set.');
    process.exit(1);
  }

  // Parse command line arguments
  const args = process.argv.slice(2);
  const typeArg = args[0] || 'all';
  const count = parseInt(args[1]) || 50;

  console.log('🚀 Question Generator');
  console.log('===================');
  console.log(`Type: ${typeArg}`);
  console.log(`Count per type: ${count}`);

  try {
    if (typeArg === 'all') {
      // Generate all types
      for (const type of questionTypes) {
        await generateQuestions(type, count);
        // Small delay between requests to be nice to the API
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      console.log('\n✅ All question types generated successfully!');
    } else if (questionTypes.includes(typeArg)) {
      // Generate specific type
      await generateQuestions(typeArg, count);
      console.log('\n✅ Questions generated successfully!');
    } else {
      console.error(`\n❌ Invalid type: ${typeArg}`);
      console.error(`   Valid types: ${questionTypes.join(', ')}, all`);
      process.exit(1);
    }

    console.log('\n📊 Summary:');
    console.log('   You can now play the conversation games!');
    console.log('   Questions will be randomly selected from the database.');

  } catch (error) {
    console.error('\n❌ Generation failed:', error.message);
    process.exit(1);
  }
}

main();
