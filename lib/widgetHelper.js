import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';

export async function updateGalleryWidget() {
  if (Platform.OS === 'android') {
    try {
      const { requestWidgetUpdate } = require('react-native-android-widget');
      const { GalleryWidget } = require('../widgets/GalleryWidget');

      // Get current drawings
      const drawingsJson = await AsyncStorage.getItem('savedDrawings');
      const drawings = drawingsJson ? JSON.parse(drawingsJson) : [];

      await requestWidgetUpdate({
        widgetName: 'GalleryWidget',
        renderWidget: () => React.createElement(GalleryWidget, { drawings }),
        widgetNotFound: () => {
          console.log('Gallery widget not added to home screen');
        },
      });
    } catch (error) {
      console.error('Error updating widget:', error);
    }
  }
}
