// Simple script to create placeholder PNG assets
const fs = require('fs');
const path = require('path');

// Minimal valid 1x1 pink PNG (base64 encoded)
const pinkPNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
  'base64'
);

const assetsDir = path.join(__dirname, 'assets');

// Create assets directory if it doesn't exist
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Create all required asset files
const files = ['icon.png', 'adaptive-icon.png', 'splash.png', 'favicon.png'];

files.forEach(file => {
  const filePath = path.join(assetsDir, file);
  fs.writeFileSync(filePath, pinkPNG);
  console.log(`Created ${file}`);
});

console.log('\n✅ All placeholder assets created!');
console.log('These are minimal 1x1 pink PNGs - replace with proper images later.\n');
