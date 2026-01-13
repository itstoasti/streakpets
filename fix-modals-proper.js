const fs = require('fs');

const files = [
  'components/games/WouldYouRatherGame.js',
  'components/games/WhosMoreLikelyGame.js'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // Fix broken <visible> tags back to proper View structure
  content = content.replace(/<visible[^>]*>/g, '');
  content = content.replace(/<\/>/g, '');

  // Remove any remaining Modal references from imports
  content = content.replace(/import\s*{\s*([^}]*),?\s*Modal\s*,?\s*([^}]*)\s*}\s*from\s*'react-native';/g,
    (match, before, after) => {
      const parts = [before, after].filter(p => p.trim()).join(', ');
      return `import { ${parts} } from 'react-native';`;
    });

  fs.writeFileSync(file, content);
  console.log(`✅ Fixed ${file}`);
});

console.log('\n✅ All files fixed!');
