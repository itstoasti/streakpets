import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';

export async function updateGalleryWidget() {
  if (Platform.OS === 'android') {
    try {
      const { requestWidgetUpdate } = require('react-native-android-widget');
      const { GalleryWidget } = require('../widgets/GalleryWidget');

      // Get the selected widget drawing ID
      const widgetDrawingId = await AsyncStorage.getItem('widgetDrawingId');
      console.log('Updating widget with drawing ID:', widgetDrawingId);

      let drawing = null;
      if (widgetDrawingId) {
        // Get all drawings
        const drawingsJson = await AsyncStorage.getItem('savedDrawings');
        if (drawingsJson) {
          const drawings = JSON.parse(drawingsJson);
          console.log('Total drawings:', drawings.length);
          // Find the selected drawing
          drawing = drawings.find(d => d.id === widgetDrawingId);
          console.log('Selected drawing found:', drawing ? 'yes' : 'no');
        }
      }

      await requestWidgetUpdate({
        widgetName: 'GalleryWidget',
        renderWidget: () => React.createElement(GalleryWidget, { drawing }),
        widgetNotFound: () => {
          console.log('Gallery widget not added to home screen');
        },
      });

      console.log('Widget update requested successfully');
    } catch (error) {
      console.error('Error updating widget:', error);
    }
  }
}
