# Game Turn Notification System - Setup Complete! 🎉

## What Was Implemented

### 1. Badge on Activity Tab ✅
- Added a numerical badge on the Activity tab that shows how many games are waiting for your turn
- Updates in real-time when games change
- Only appears when you have pending turns

### 2. Visual Indicators on Game Cards ✅
- Game cards now show a pulsing border and "Your Turn!" badge when it's your turn
- Highlighted styling makes it obvious which games need your attention
- Real-time updates when partner makes a move

### 3. Push Notifications ✅
Push notifications are sent when:
- Partner starts a new game
- It becomes your turn
- Partner makes a move

## Setup Steps Required

### Step 1: Run SQL Migration
You need to add push token columns to your Supabase `couples` table:

1. Open Supabase SQL Editor
2. Run the SQL in: `add-push-tokens-to-couples.sql`

### Step 2: Configure Expo Project ID
In `lib/notificationHelper.js` line 29, update the projectId:

```javascript
const token = await Notifications.getExpoPushTokenAsync({
  projectId: 'your-project-id' // Replace with your actual Expo project ID
});
```

To find your project ID:
- Run `eas whoami` in terminal
- Or check your `app.json` for the `extra.eas.projectId`
- Or check Expo dashboard at expo.dev

### Step 3: Test Notifications

#### On Physical Devices (Recommended):
1. Install the app on two physical devices
2. Log in as couple on both devices
3. Device 1: Start a game (e.g., Tic Tac Toe)
4. Device 2: Should receive notification that game started
5. Device 2: Make a move
6. Device 1: Should receive notification that it's their turn

#### On Simulators/Emulators:
- **iOS Simulator**: Push notifications do NOT work
- **Android Emulator**: Limited support - may need Google Play Services

### Step 4: Configure Notification Channels (Android)
For better Android notification experience, add to `app.json`:

```json
{
  "expo": {
    "android": {
      "notification": {
        "icon": "./assets/notification-icon.png",
        "color": "#FF1493",
        "sound": true,
        "priority": "high"
      }
    }
  }
}
```

## How It Works

### Badge System
- `app/(tabs)/_layout.js` - Subscribes to game updates and shows badge count
- `lib/gameHelper.js` - `getPendingTurnCount()` calculates pending turns

### Visual Indicators
- `app/(tabs)/activity.js` - Tracks pending games and applies special styling
- Pulsing border with `gameCardPending` style
- "Your Turn!" badge positioned at top-right of card

### Push Notifications
- `lib/notificationHelper.js` - All notification functions
- `app/_layout.js` - Registers for notifications on app start
- `lib/gameHelper.js` - Sends notifications when games are created/updated
- Tokens stored in `couples.user1_push_token` and `couples.user2_push_token`

## Files Created/Modified

### New Files:
- `lib/notificationHelper.js` - Push notification functions
- `add-push-tokens-to-couples.sql` - Database migration
- `NOTIFICATION_SETUP.md` - This file

### Modified Files:
- `app/(tabs)/_layout.js` - Badge on Activity tab
- `app/(tabs)/activity.js` - Visual indicators on game cards
- `lib/gameHelper.js` - Send notifications on game events
- `app/_layout.js` - Register for push notifications
- `package.json` - Added expo-notifications

## Troubleshooting

### Notifications Not Received:
1. Check device notification permissions
2. Verify projectId is correct in notificationHelper.js
3. Check that SQL migration ran successfully
4. Ensure both users have logged in after code changes (to register tokens)
5. Check Expo push notification status at expo.dev/notifications

### Badge Not Updating:
1. Ensure SQL migration for games table ran successfully
2. Check browser console for errors
3. Verify Supabase RLS policies allow reading games

### Visual Indicators Not Showing:
1. Ensure games table exists with proper structure
2. Check that you're using an active game session
3. Verify real-time subscriptions are working

## Next Steps

After testing, you might want to:
- Add notification preferences (let users mute certain notification types)
- Add notification sound customization
- Add haptic feedback when receiving notifications
- Show notification count in app icon badge (requires native config)
