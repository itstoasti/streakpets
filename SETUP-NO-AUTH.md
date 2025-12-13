# 🚀 Quick Setup Guide (No Authentication)

This simplified version has **NO authentication system** - perfect for testing and development!

## What Changed?

- ❌ No email/password login
- ❌ No Supabase Auth required
- ✅ Uses device IDs instead of user accounts
- ✅ All features work the same way
- ✅ Easier to test with multiple devices
- ✅ Reset button to clear all data

## Setup Steps

### 1. Set Up Supabase (Optional but Recommended) ⚡

You can use Supabase for data storage and real-time features, or skip it to use local-only mode.

#### With Supabase (Recommended):

1. Go to [https://supabase.com](https://supabase.com) and create a project
2. Go to **SQL Editor**
3. Copy and paste the contents of `supabase-schema-simple.sql`
4. Click **Run**
5. Go to **Settings** → **API** and copy:
   - Project URL
   - Anon/Public Key
6. Edit `.env`:
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

#### Without Supabase (Local Only):

The app will work locally on each device without syncing. Just skip the Supabase setup!

### 2. Create App Assets 🎨

Create 4 simple PNG files in the `assets/` folder:
- `icon.png` (1024x1024)
- `adaptive-icon.png` (1024x1024)
- `splash.png` (1024x1024)
- `favicon.png` (48x48)

**Quick hack for testing:** Use any pink-colored image and name it correctly. The app will still run!

### 3. Start the App 🎉

```bash
npm start
```

Scan the QR code with Expo Go on your phone!

## How It Works Now

### Device IDs

Each device automatically gets a unique ID like `user_abc123xyz`. This is stored in AsyncStorage and persists even if you close the app.

### Testing with Two Devices

1. **Device 1:**
   - Open app
   - Tap "Create Couple & Get Code"
   - Copy the code (e.g., "XYZ789")

2. **Device 2:**
   - Open app
   - Tap "Join Couple"
   - Enter the code
   - Both devices now share the same pet!

### Reset for Testing

On the pet screen, tap "Reset App (Testing)" to:
- Clear all local data
- Get a new device ID
- Start fresh

## What Still Works

✅ Couple pairing with invite codes
✅ Pet care with happiness system
✅ All games (Tic Tac Toe, Trivia)
✅ Shared notes
✅ Photo album
✅ Real-time sync (if using Supabase)
✅ Happiness decay
✅ All features from the original app

## Troubleshooting

### "Network error" or database errors

If you're using Supabase:
- Check `.env` has correct credentials
- Verify you ran `supabase-schema-simple.sql` (not the old one!)
- Make sure RLS is **disabled** (the simple schema does this)

If you're NOT using Supabase:
- The app might show errors when trying to sync
- Features will work locally but won't sync between devices

### Can't join couple

- Make sure the code is exactly correct (case-sensitive)
- Check that the couple creator's device is connected to Supabase
- Try creating a new couple

### Want to test with multiple accounts on same device?

Use the "Reset App" button to clear data and start fresh!

## Files to Use

- **Database Schema:** Use `supabase-schema-simple.sql` (NOT the old `supabase-schema.sql`)
- **Layout:** Updated `app/_layout.js` (no auth check)
- **Storage:** New `lib/storage.js` (device ID management)
- **Screens:** All updated to use device IDs

## Comparison: With vs Without Auth

| Feature | With Auth (Old) | No Auth (New) |
|---------|----------------|---------------|
| User Identification | Email/Password | Device ID |
| Account Creation | Required | Automatic |
| Multi-device Support | Yes, same account | No, device-specific |
| Data Persistence | Across devices | Per device only |
| Sharing | Login on multiple devices | Use invite codes |
| Testing | Slower (need emails) | Faster (instant) |
| Reset | Clear account | Reset button |

## Tips for Development

1. **Quick Reset:** Use the reset button instead of uninstalling
2. **Testing Sync:** Open on two phones simultaneously
3. **Check Device ID:** Displayed on pet screen and modals
4. **Supabase Dashboard:** View your data in real-time
5. **Clear Cache:** `npm run clear` if things break

## Re-enabling Authentication Later

Want to add auth back later? You can:
1. Use the original `supabase-schema.sql`
2. Restore the auth screen from git history
3. Update the layout to check auth state
4. Replace device IDs with user IDs

Or keep this simple version and just add a username system on top!

---

**That's it! Much simpler, faster to test, and easier to develop! 🎉**

Start the app with `npm start` and begin testing immediately!
