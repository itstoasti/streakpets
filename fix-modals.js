const fs = require('fs');

const files = [
  'components/games/WouldYouRatherGame.js',
  'components/games/WhosMoreLikelyGame.js'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // Remove Modal imports
  content = content.replace(/Modal,?\s*/g, '');

  // Remove opening Modal tags (all variations)
  content = content.replace(/<Modal[^>]*>/g, '');

  // Remove closing Modal tags
  content = content.replace(/<\/Modal>/g, '');

  fs.writeFileSync(file, content);
  console.log(`✅ Fixed ${file}`);
});

console.log('\n✅ All files fixed!');
