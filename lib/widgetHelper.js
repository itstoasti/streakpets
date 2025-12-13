import { Platform } from 'react-native';

export async function updateGalleryWidget() {
  if (Platform.OS === 'android') {
    try {
      const { requestWidgetUpdate } = require('react-native-android-widget');
      await requestWidgetUpdate({
        widgetName: 'GalleryWidget',
        renderWidget: () => {}, // Will be handled by the task handler
        widgetNotFound: () => {
          console.log('Gallery widget not added to home screen');
        },
      });
    } catch (error) {
      console.error('Error updating widget:', error);
    }
  }
}
