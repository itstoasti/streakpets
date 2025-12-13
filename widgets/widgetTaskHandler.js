import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GalleryWidget } from './GalleryWidget';

async function getSavedDrawings() {
  try {
    const drawingsJson = await AsyncStorage.getItem('savedDrawings');
    if (drawingsJson) {
      return JSON.parse(drawingsJson);
    }
    return [];
  } catch (error) {
    console.error('Error loading drawings for widget:', error);
    return [];
  }
}

export async function widgetTaskHandler(props) {
  const widgetInfo = props.widgetInfo;

  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
      const drawings = await getSavedDrawings();
      props.renderWidget(<GalleryWidget drawings={drawings} />);
      break;

    case 'WIDGET_DELETED':
      // Cleanup if needed
      break;

    case 'WIDGET_CLICK':
      // Open app when widget is clicked
      const clickDrawings = await getSavedDrawings();
      props.renderWidget(<GalleryWidget drawings={clickDrawings} />);
      break;

    default:
      break;
  }
}
