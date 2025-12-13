# ⚡ Quick Start - Get Running in 5 Minutes!

## Prerequisites Checklist ✓
- [ ] Node.js installed (v16+)
- [ ] Phone with Expo Go app installed
- [ ] Computer and phone on same WiFi
- [ ] Supabase account created

## 5-Minute Setup 🚀

### 1️⃣ Supabase Setup (2 minutes)
```
1. Go to supabase.com → New Project
2. Copy supabase-schema.sql contents
3. Paste in SQL Editor → Run
4. Settings → API → Copy URL and anon key
5. Paste into .env file
```

### 2️⃣ Environment Config (30 seconds)
Edit `.env`:
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-key...
```

### 3️⃣ Create Assets (1 minute)
Quick placeholder:
```bash
# Create simple colored PNG files named:
# - icon.png (1024x1024)
# - adaptive-icon.png (1024x1024)
# - splash.png (1024x1024)
# - favicon.png (48x48)
# Place in assets/ folder
```
Or use any pink image for now - the app will still work!

### 4️⃣ Start App (30 seconds)
```bash
npm start
```

### 5️⃣ Open on Phone (1 minute)
- Scan QR code with Expo Go (Android) or Camera (iOS)
- Wait for app to load
- Sign up and start playing!

## Common Commands 💻

```bash
# Start development server
npm start

# Start with cache cleared
npm run clear

# Start with tunnel (if QR code doesn't work)
npm run tunnel

# Start on specific platform
npm run android
npm run ios
```

## First Time User Flow 📱

```
1. Open app → Sign Up
2. Create Couple → Get code (e.g. "ABC123")
3. Share code with partner
4. Partner: Sign Up → Join Couple → Enter code
5. Both: Choose pet (🦜/🐕/🐧)
6. Start playing!
```

## Activity Happiness Values 💕

| Activity | Happiness |
|----------|-----------|
| Feed Pet | +10 |
| Play Game | +5 |
| Add Memory | +5 |
| Share Note | +3 |
| Time Decay | -2/hour |

## Troubleshooting Quick Fixes 🔧

### App won't start
```bash
rm -rf node_modules
npm install
npm run clear
```

### Database errors
- Check .env has correct Supabase credentials
- Verify SQL schema was run successfully
- Check Supabase project is active

### QR code won't scan
```bash
npm run tunnel
```

### "Session expired"
- Shake phone → Reload
- Or restart app

## File Structure Quick Reference 📁

```
couples-pet-fresh/
├── app/
│   ├── (tabs)/
│   │   ├── index.js    → Pet screen
│   │   ├── games.js    → Games
│   │   ├── notes.js    → Notes
│   │   └── album.js    → Memories
│   └── auth.js         → Login/Signup
├── lib/
│   └── supabase.js     → Database config
├── .env                → Your credentials HERE
└── supabase-schema.sql → Run this in Supabase
```

## Testing Checklist ✅

Quick test to verify everything works:

- [ ] Sign up works
- [ ] Create couple gets code
- [ ] Can copy code
- [ ] Second user can join with code
- [ ] Can choose pet
- [ ] Pet displays
- [ ] Feed button increases happiness
- [ ] Can open Games tab
- [ ] Can play Tic Tac Toe
- [ ] Can add note
- [ ] Can add memory (select image)

## Next Steps 🎯

After getting it running:

1. **Read SETUP.md** - Detailed setup instructions
2. **Read README.md** - Full documentation
3. **Read FEATURES.md** - Complete feature list
4. **Customize** - Change colors, add features
5. **Deploy** - Build for production

## Need Help? 💬

1. Check README.md
2. Check SETUP.md troubleshooting section
3. Check Expo docs: docs.expo.dev
4. Check Supabase docs: supabase.com/docs

## Pro Tips 💡

- Keep .env file secret
- Test with two devices/accounts
- Clear cache if things break: `npm run clear`
- Use tunnel mode if on different networks
- Check Supabase dashboard for data
- Monitor happiness decay in real-time

---

**That's it! You should be up and running! 💕**

## Ultra-Quick Reference Card

```
Start:     npm start
Clear:     npm run clear
Tunnel:    npm run tunnel

Supabase:  Settings → API → Get credentials
.env:      Add EXPO_PUBLIC_SUPABASE_URL and KEY
SQL:       Copy supabase-schema.sql → Run in Supabase
Assets:    Create 4 PNG files in assets/ folder

Test:      Sign up → Create couple → Share code
           Partner signs up → Join → Choose pet
```
