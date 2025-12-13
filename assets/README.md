# Assets Directory

This directory should contain the following image files for the app:

## Required Assets

### App Icons

1. **icon.png** (1024x1024)
   - Main app icon
   - Should feature hearts or couple-related imagery
   - Pink color scheme recommended

2. **adaptive-icon.png** (1024x1024)
   - Android adaptive icon
   - Same design as icon.png but with safe zone

3. **splash.png** (1284x2778 for iOS)
   - Splash screen shown when app launches
   - Can feature app name and pet imagery
   - Background: #FFE5EC (light pink)

4. **favicon.png** (48x48)
   - Web favicon
   - Simplified version of the main icon

## Creating the Assets

### Option 1: Use Figma/Design Tool
Create custom designs with:
- Pink color palette (#FF1493, #FF69B4, #FFB6D9, #FFE5EC)
- Heart icons
- Cute couple or pet illustrations

### Option 2: Use Expo's Asset Generator
```bash
npx expo-splash-screen --help
```

### Option 3: Quick Placeholder Images
For testing, you can use simple solid color images:
- Create 1024x1024 pink squares
- Add simple text or emoji (💕)

## User-Provided Pet Images

The user mentioned they have images for the pets. Place them here:
- **parrot.png** - Parrot pet image
- **dog.png** - Dog pet image
- **penguin.png** - Penguin pet image

Currently, the app uses emoji (🦜, 🐕, 🐧) as placeholders. To use actual images:

1. Place the pet images in this `assets` folder
2. Update `app/(tabs)/index.js` line ~15:
   ```javascript
   // Replace this:
   const PETS = {
     parrot: '🦜',
     dog: '🐕',
     penguin: '🐧',
   };

   // With this:
   const PETS = {
     parrot: require('../../assets/parrot.png'),
     dog: require('../../assets/dog.png'),
     penguin: require('../../assets/penguin.png'),
   };
   ```

3. Update the rendering in the same file (around line ~253):
   ```javascript
   // Replace this:
   <Animatable.Text
     animation="pulse"
     iterationCount="infinite"
     style={styles.petEmoji}
   >
     {PETS[pet.pet_type]}
   </Animatable.Text>

   // With this:
   <Animatable.Image
     animation="pulse"
     iterationCount="infinite"
     source={PETS[pet.pet_type]}
     style={styles.petImage}
   />
   ```

4. Add the style (around line ~280):
   ```javascript
   petImage: {
     width: 200,
     height: 200,
     marginVertical: 30,
   },
   ```

## Notes

- All images should be optimized for mobile (keep file sizes under 1MB)
- Use PNG format with transparency for best results
- Consider providing @2x and @3x versions for different screen densities
