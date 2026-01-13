# AdMob Setup Guide for Spark App

Your app now has rewarded ads integrated! Users can watch ads to earn 15 coins per ad.

## Current Status
✅ Ad SDK installed and configured
✅ Test ads working in development
✅ UI integrated in Marketplace tab
⚠️ Using TEST ad IDs (you need to replace these for production)

## How It Works
1. Users tap "Watch Ad for Coins" button in the Marketplace
2. A video ad plays (15-30 seconds)
3. After watching, users earn 15 coins automatically
4. The next ad preloads automatically

## Revenue Expectations
- **RPM (Revenue Per Mille)**: $1-$5 per 1000 ad views typically
- **eCPM**: Varies by country, typically $2-$10
- If 100 users watch 1 ad per day = 3,000 ads/month = ~$6-$30/month (rough estimate)
- Revenue grows with user base!

## Steps to Enable Real Ads (For Production)

### 1. Create Google AdMob Account
1. Go to https://admob.google.com/
2. Sign in with your Google account
3. Click "Get Started"
4. Fill in your details and accept terms

### 2. Create Your App in AdMob
1. In AdMob console, click "Apps" → "Add App"
2. Select "Android" platform
3. Choose "Yes, it's listed on Google Play" (or No if not yet published)
4. Enter app name: **Spark**
5. Copy the **App ID** (format: ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY)

### 3. Create Rewarded Ad Unit
1. In your app page, click "Ad Units" → "Add Ad Unit"
2. Select **"Rewarded"** ad format
3. Name it: "Spark Coin Reward"
4. Click "Create Ad Unit"
5. Copy the **Ad Unit ID** (format: ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY)

### 4. Update Your App Configuration

#### A. Update `app.json` with your real App ID:
```json
[
  "react-native-google-mobile-ads",
  {
    "androidAppId": "ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY",  // Replace with YOUR App ID
    "iosAppId": "ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY"       // If you add iOS later
  }
]
```

#### B. Update `lib/rewardedAds.js` with your real Ad Unit ID:
Find this line:
```javascript
const adUnitId = __DEV__
  ? TestIds.REWARDED
  : Platform.select({
      ios: 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY',
      android: 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY',  // Replace with YOUR Ad Unit ID
    });
```

### 5. Rebuild Your App
After updating the IDs:
```bash
npx expo prebuild --clean
eas build --platform android --profile production
```

### 6. App Store Requirements
- **Privacy Policy Required**: You MUST have a privacy policy that mentions ads and data collection
- Add privacy policy URL in Google Play Console
- Mention: "This app uses Google AdMob to serve ads. AdMob may collect device information and ad interaction data."

### 7. Testing Real Ads
⚠️ **NEVER click your own ads repeatedly!** Google will ban your account.

For testing real ads safely:
1. Add test devices in AdMob console: Apps → App Settings → Test Devices
2. Get your device ID from logcat when app runs
3. Or keep using test mode until you're ready to publish

## Earnings Payout
- **Minimum**: $100 to receive payment
- **Payment**: Monthly via bank transfer, wire, or check
- **Tax Info**: Required (W-9 for US, W-8 for international)

## Optimization Tips for More Revenue
1. **Strategic Placement**: Put ads where users want rewards (you already did this!)
2. **Daily Limits**: Consider limiting to 5-10 ads per day per user to prevent abuse
3. **Reward Balance**: 15 coins per ad is good - not too generous, not too stingy
4. **User Value**: Make sure ad watching feels optional and rewarding

## Common Issues

### "Ad failed to load"
- Check internet connection
- AdMob may need 24 hours to approve new apps
- Verify App ID and Ad Unit ID are correct

### "No ads available"
- Normal in low-traffic apps initially
- Test with test IDs first
- AdMob learns over time and serves more ads

### "Invalid traffic"
- Don't click your own ads!
- Don't incentivize fake clicks
- Use test devices during development

## Current Implementation Details
- **Reward Amount**: 15 coins per ad (editable in `marketplace.js` line 93)
- **Ad Type**: Rewarded video (user must watch to completion)
- **Preloading**: Next ad loads automatically after each view
- **Placement**: Marketplace tab, top of page
- **User Experience**: Clean, clear button with loading states

## Next Steps
1. ✅ Test the current implementation with test ads
2. ⬜ Create AdMob account
3. ⬜ Get real App ID and Ad Unit ID
4. ⬜ Update configuration files
5. ⬜ Create privacy policy
6. ⬜ Test on production build
7. ⬜ Submit to Google Play with ads enabled

## Support
- AdMob Help: https://support.google.com/admob
- Best Practices: https://support.google.com/admob/topic/7384409

---

**Remember**: Start with test ads, verify everything works, then switch to production IDs when you're ready to publish!
