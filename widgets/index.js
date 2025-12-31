import { Platform } from 'react-native';

// Only register widget on Android
if (Platform.OS === 'android') {
  try {
    const { registerWidgetTaskHandler } = require('react-native-android-widget');
    const { widgetTaskHandler } = require('./widgetTaskHandler');

    // Register the widget task handler
    registerWidgetTaskHandler(widgetTaskHandler);
  } catch (error) {
    console.warn('Failed to register widget task handler:', error);
  }
}

export const widgetConfig = {
  widgets: [
    {
      name: 'GalleryWidget',
      label: 'Couples Pet Gallery',
      description: 'View your whiteboard drawings',
      minWidth: '200dp',
      minHeight: '200dp',
      targetCellWidth: 2,
      targetCellHeight: 2,
      updatePeriodMillis: 0, // Update as frequently as possible
      previewImage: 'widget_preview',
    },
  ],
};
