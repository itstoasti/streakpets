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
      minWidth: '200dp',
      minHeight: '200dp',
      targetCellWidth: 2,
      targetCellHeight: 2,
      updatePeriodMillis: 0, // Update as frequently as possible
      previewImage: 'widget_preview',
    },
  ],
};
