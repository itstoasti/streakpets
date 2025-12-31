import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GalleryWidget } from './GalleryWidget';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

// Get Supabase client if configured
function getSupabase() {
  if (isSupabaseConfigured()) {
    return supabase;
  }
  return null;
}

async function getWidgetDrawing() {
  try {
    // Get the selected widget drawing ID
    const widgetDrawingId = await AsyncStorage.getItem('widgetDrawingId');
    console.log('Widget drawing ID:', widgetDrawingId);

    if (!widgetDrawingId) {
      console.log('No widget drawing ID set');
      return null;
    }

    // Try to get from cache first
    const drawingsJson = await AsyncStorage.getItem('savedDrawings');
    let selectedDrawing = null;

    if (drawingsJson) {
      const drawings = JSON.parse(drawingsJson);
      selectedDrawing = drawings.find(d => d.id === widgetDrawingId);
      console.log('Found drawing in cache:', !!selectedDrawing);
    }

    // If not in cache or we need fresh data, fetch from Supabase
    const supabaseClient = getSupabase();
    if (supabaseClient && !selectedDrawing) {
      console.log('Fetching drawing from Supabase...');

      // Get couple ID from storage
      const coupleDataJson = await AsyncStorage.getItem('coupleData');
      if (coupleDataJson) {
        const coupleData = JSON.parse(coupleDataJson);

        // Fetch all drawings for this couple
        const { data: drawings, error } = await supabaseClient
          .from('whiteboard_drawings')
          .select('*')
          .eq('couple_id', coupleData.id)
          .order('created_at', { ascending: false });

        if (!error && drawings) {
          console.log('Fetched drawings from Supabase:', drawings.length);

          // Convert to widget format
          const formattedDrawings = drawings.map(drawing => ({
            id: drawing.id,
            publicUrl: drawing.image_url,
            image: null,
            canvasWidth: drawing.canvas_width,
            canvasHeight: drawing.canvas_height,
            backgroundColor: drawing.background_color || 'white',
            createdAt: drawing.created_at,
          }));

          // Update cache
          await AsyncStorage.setItem('savedDrawings', JSON.stringify(formattedDrawings));

          // Find the selected drawing
          selectedDrawing = formattedDrawings.find(d => d.id === widgetDrawingId);
          console.log('Found drawing in Supabase:', !!selectedDrawing);
        }
      }
    }

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
