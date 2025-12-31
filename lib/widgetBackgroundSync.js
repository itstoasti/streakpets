import { NativeModules, Platform } from 'react-native';

const { WidgetBackground } = NativeModules;

/**
 * Schedules background widget updates every 15 minutes
 * This keeps widgets synced even when the app is closed
 */
export function startWidgetBackgroundSync() {
  if (Platform.OS === 'android' && WidgetBackground) {
    try {
      console.log('📅 Starting widget background sync (15-minute intervals)');
      WidgetBackground.scheduleWidgetUpdates();
      console.log('✅ Widget background sync started successfully');
    } catch (error) {
      console.error('❌ Failed to start widget background sync:', error);
    }
  } else {
    console.log('⚠️  Widget background sync not available on this platform');
  }
}

/**
 * Cancels background widget updates
 * Useful for debugging or if user wants to disable background sync
 */
export function stopWidgetBackgroundSync() {
  if (Platform.OS === 'android' && WidgetBackground) {
    try {
      console.log('🛑 Stopping widget background sync');
      WidgetBackground.cancelWidgetUpdates();
      console.log('✅ Widget background sync stopped');
    } catch (error) {
      console.error('❌ Failed to stop widget background sync:', error);
    }
  }
}
