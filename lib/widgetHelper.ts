import { Platform } from 'react-native';
import { requestWidgetUpdate } from 'react-native-android-widget';

export async function updateGalleryWidget() {
  if (Platform.OS === 'android') {
    try {
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

export async function configureWidget() {
  if (Platform.OS === 'android') {
    try {
      const { configureWidget } = await import('react-native-android-widget');
      await configureWidget({
        widgetName: 'GalleryWidget',
        previewImage: 'widget_preview', // Optional preview image
      });
    } catch (error) {
      console.error('Error configuring widget:', error);
    }
  }
}
