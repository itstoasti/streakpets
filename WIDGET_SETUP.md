# Home Screen Widget Setup Guide

Your Couples Pet app now has a home screen widget feature that displays the whiteboard gallery!

## 🎯 What's Been Set Up

1. **Widget Files Created:**
   - `/widgets/GalleryWidget.tsx` - Widget definition
   - `/widgets/GalleryWidgetTaskHandler.tsx` - Widget logic and UI
   - `/widgets/index.ts` - Widget registration
   - `/lib/widgetHelper.ts` - Helper functions for updating the widget

2. **Configuration Updated:**
   - `app.json` - Added widget plugin
   - `package.json` - Updated entry point
   - `index.js` - Created custom entry point that registers widgets
   - `activity.js` - Added widget updates when drawings are saved/deleted

## 📱 Building the App with Widget Support

### Step 1: Create Development Build

Since widgets require native code, you need to create a development build:

```bash
# Install EAS CLI if you haven't
npm install -g eas-cli

# Login to Expo
eas login

# Configure the project
eas build:configure

# Build for Android (development build)
eas build --profile development --platform android
```

### Step 2: Install on Device

After the build completes:
1. Download the APK from the Expo dashboard
2. Install it on your Android device
3. Allow installation from unknown sources if prompted

### Step 3: Add Widget to Home Screen

1. **Long press** on your home screen
2. Tap **"Widgets"**
3. Find **"Couples Pet Gallery"**
4. **Drag** it to your home screen
5. The widget will show your latest drawing and gallery count!

## 🎨 How the Widget Works

### Widget Features:
- Shows **latest drawing** from your gallery
- Displays **total number of drawings**
- **Auto-updates** when you save or delete drawings
- **Tap** the widget to open the app to the gallery

### Widget Updates Automatically When:
- ✅ You save a new drawing
- ✅ You delete a drawing
- ✅ The widget is added to home screen

## 🔧 Development Build Commands

```bash
# Start the development server
npx expo start --dev-client

# Build development APK locally (requires Android Studio)
npx expo run:android

# Build with EAS (cloud build - recommended)
eas build --profile development --platform android
```

## 📝 Important Notes

1. **Android Only**: Home screen widgets currently only work on Android. iOS widgets require additional Swift code.

2. **Development Build Required**: Widgets don't work in Expo Go. You must use a development build or standalone app.

3. **Widget Data**: The widget reads from AsyncStorage key `savedDrawings` which is updated whenever you save/delete drawings.

4. **Manual Refresh**: If the widget doesn't update, try:
   - Removing and re-adding the widget
   - Reopening the app
   - Saving a new drawing

## 🚀 Next Steps

### For Production:
```bash
# Build production APK
eas build --profile production --platform android

# Or build AAB for Google Play Store
eas build --profile production --platform android --auto-submit
```

### For iOS (Future):
To add iOS widget support, you'll need to:
1. Create a Widget Extension in Xcode
2. Write Swift/SwiftUI code for the widget
3. Configure app groups for data sharing
4. Rebuild with the extension included

## 💡 Customization Ideas

You can customize the widget by editing:
- `/widgets/GalleryWidgetTaskHandler.tsx` - Change widget UI and layout
- Widget colors, text, and styling
- Add more widget sizes (small, medium, large)
- Show multiple drawings in a grid

## 🐛 Troubleshooting

**Widget not appearing:**
- Make sure you've installed the development build (not Expo Go)
- Check that the build included the widget plugin
- Restart your device

**Widget not updating:**
- The widget auto-updates when drawings are saved
- Try manually refreshing by removing and re-adding the widget

**Build fails:**
- Run `npm install` to ensure all dependencies are installed
- Clear cache: `npx expo start -c`
- Try rebuilding: `eas build --profile development --platform android --clear-cache`

## 📚 Resources

- [Expo Development Builds](https://docs.expo.dev/develop/development-builds/introduction/)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [react-native-android-widget](https://github.com/salRoid/react-native-android-widget)

---

Your widget is ready! Just build the development build and add it to your home screen! 🎉
