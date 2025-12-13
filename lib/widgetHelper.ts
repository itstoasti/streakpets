import { Platform } from 'react-native';
import { requestWidgetUpdate } from 'react-native-android-widget';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import { GalleryWidget } from '../widgets/GalleryWidget';

export async function updateGalleryWidget() {
  if (Platform.OS === 'android') {
    try {
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
