import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GalleryWidget } from './GalleryWidget';

async function getWidgetDrawing() {
  try {
    // Get the selected widget drawing ID
    const widgetDrawingId = await AsyncStorage.getItem('widgetDrawingId');
    console.log('Widget drawing ID:', widgetDrawingId);

    if (!widgetDrawingId) {
      console.log('No widget drawing ID set');
      return null;
    }

    // Get all drawings
    const drawingsJson = await AsyncStorage.getItem('savedDrawings');
    if (!drawingsJson) {
      console.log('No saved drawings found');
      return null;
    }

    const drawings = JSON.parse(drawingsJson);
    console.log('Found drawings:', drawings.length);

    // Find the selected drawing
    const selectedDrawing = drawings.find(d => d.id === widgetDrawingId);
    console.log('Selected drawing:', selectedDrawing ? 'found' : 'not found');
    return selectedDrawing || null;
  } catch (error) {
    console.error('Error loading widget drawing:', error);
    return null;
  }
}

export async function widgetTaskHandler(props) {
  const widgetInfo = props.widgetInfo;
  console.log('Widget task handler called:', props.widgetAction);

  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
      console.log('Updating widget...');
      const drawing = await getWidgetDrawing();
      props.renderWidget(<GalleryWidget drawing={drawing} />);
      console.log('Widget rendered');
      break;

    case 'WIDGET_DELETED':
      console.log('Widget deleted');
      // Cleanup if needed
      break;

    case 'WIDGET_CLICK':
      console.log('Widget clicked');
      // Open app when widget is clicked
      const clickDrawing = await getWidgetDrawing();
      props.renderWidget(<GalleryWidget drawing={clickDrawing} />);
      break;

    default:
      console.log('Unknown widget action:', props.widgetAction);
      break;
  }
}
