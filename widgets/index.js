import { registerWidgetTaskHandler } from 'react-native-android-widget';
import { widgetTaskHandler } from './widgetTaskHandler';

// Register the widget task handler
registerWidgetTaskHandler(widgetTaskHandler);

export const widgetConfig = {
  widgets: [
    {
      name: 'GalleryWidget',
      label: 'Couples Pet Gallery',
      description: 'View your whiteboard drawings',
      minWidth: '2x2',
      minHeight: '2x2',
      maxWidth: '4x4',
      maxHeight: '4x4',
      previewImage: 'widget_preview',
      updatePeriodMillis: 1800000, // Update every 30 minutes
    },
  ],
};
