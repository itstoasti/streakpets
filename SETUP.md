# 🚀 Quick Setup Guide

Follow these steps to get your Couples Pet app running!

## Step 1: Install Dependencies ✅

You've already completed this step! All npm packages are installed.

## Step 2: Create App Assets 🎨

You need to create 4 image files in the `assets/` directory. Here are quick ways to create them:

### Option A: Use Online Tools (Easiest)
1. Go to [https://www.canva.com](https://www.canva.com) or [https://www.figma.com](https://www.figma.com)
2. Create a 1024x1024 canvas
3. Fill with pink (#FFE5EC) background
4. Add a heart icon or emoji (💕)
5. Export as PNG

Create these files:
- `assets/icon.png` (1024x1024)
- `assets/adaptive-icon.png` (1024x1024) - Same as icon.png
- `assets/splash.png` (1284x2778 for iOS, or use 1024x1024 for simplicity)
- `assets/favicon.png` (48x48)

### Option B: Use Provided SVG Template
I've created `assets/icon.svg` as a template. Convert it to PNG using:
- [https://svgtopng.com](https://svgtopng.com)
- Or use ImageMagick: `convert icon.svg icon.png`

### Option C: Quick Placeholders for Testing
For testing only, you can use solid color images:
```bash
# If you have ImageMagick installed:
cd assets
magick -size 1024x1024 xc:"#FFE5EC" icon.png
magick -size 1024x1024 xc:"#FFE5EC" adaptive-icon.png
magick -size 1284x2778 xc:"#FFE5EC" splash.png
magick -size 48x48 xc:"#FFE5EC" favicon.png
```

### Pet Images
You mentioned you have pet images! Place them in `assets/`:
- `parrot.png`
- `dog.png`
- `penguin.png`

Then update `app/(tabs)/index.js` to use images instead of emoji (see `assets/README.md` for instructions).

## Step 3: Set Up Supabase 🔐

### 3.1 Create Supabase Project
1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in:
   - Project name: `couples-pet`
   - Database password: (save this!)
   - Region: Choose closest to you
5. Wait for project to be created (~2 minutes)

### 3.2 Run Database Schema
1. In your Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **New Query**
3. Copy the entire contents of `supabase-schema.sql` from this project
4. Paste into the SQL Editor
5. Click **Run** (or press Ctrl+Enter)
6. You should see "Success. No rows returned"

### 3.3 Get API Credentials
1. Go to **Settings** (gear icon in sidebar) → **API**
2. Find these two values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public** key (long string starting with `eyJ...`)

### 3.4 Create Environment File
1. Create a file named `.env` in the project root
2. Add your credentials:
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```
3. Save the file

### 3.5 (Optional) Set Up Image Storage
For production use:
1. Go to **Storage** in Supabase dashboard
2. Click **New bucket**
3. Name: `memories`
4. Make it **private**
5. Go to **SQL Editor** and run the storage policies from `supabase-schema.sql` (commented section at bottom)

## Step 4: Start the App 🎉

### 4.1 Start Expo
```bash
npm start
```

You should see a QR code in the terminal.

### 4.2 Install Expo Go on Your Phone
- **iOS**: Download from App Store
- **Android**: Download from Google Play

### 4.3 Open the App
- **iOS**: Open Camera app → Scan QR code → Tap notification
- **Android**: Open Expo Go app → Scan QR code

## Step 5: Test the App 📱

### First User (You)
1. Tap "Sign Up"
2. Enter email and password
3. Check your email and click the confirmation link
4. Sign in with your credentials
5. Tap "Create Couple & Get Code"
6. Copy the invite code that appears

### Second User (Your Partner)
1. Install Expo Go and scan the same QR code
2. Sign up with their own email
3. Tap "Join Couple"
4. Enter the invite code you copied
5. Both users select the same pet together!

### Start Playing! 🎮
- Feed your pet
- Play games together
- Share notes
- Add memories

## Troubleshooting 🔧

### "Unable to resolve module" errors
```bash
npm install
# Clear cache
npx expo start -c
```

### "Network error" when signing up
- Check your `.env` file has correct Supabase credentials
- Verify Supabase project is active
- Restart Expo: Press `r` in terminal or `npx expo start -c`

### QR code won't scan
- Make sure phone and computer are on same WiFi
- Try typing the URL manually in Expo Go
- Use tunnel mode: `npx expo start --tunnel`

### Database errors
- Verify you ran the entire `supabase-schema.sql` file
- Check Supabase dashboard → Database → Tables to see if tables exist
- Ensure RLS policies are enabled

### "Session expired" issues
- Clear app data: Shake phone → Reload
- Or uninstall and reinstall from Expo Go

## Next Steps 🚀

### Customize Your App
1. Change colors in each screen's StyleSheet
2. Add more games in `app/(tabs)/games.js`
3. Customize happiness decay rate in `app/(tabs)/index.js`
4. Add more trivia questions

### Deploy to Production
1. Build for iOS: `eas build --platform ios`
2. Build for Android: `eas build --platform android`
3. Submit to App Stores: `eas submit`
4. See: [https://docs.expo.dev/build/introduction/](https://docs.expo.dev/build/introduction/)

### Add More Features
- Push notifications for low happiness
- Daily challenges
- Couple statistics and achievements
- More pet types
- Mini-games
- Video calling
- Mood tracking

## Need Help? 💬

- Check the main README.md
- Expo docs: [https://docs.expo.dev](https://docs.expo.dev)
- Supabase docs: [https://supabase.com/docs](https://supabase.com/docs)
- React Native docs: [https://reactnative.dev](https://reactnative.dev)

---

**You're all set! Enjoy your Couples Pet app! 💕**
