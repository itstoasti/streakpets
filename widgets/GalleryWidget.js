import React from 'react';
import { FlexWidget, TextWidget, ImageWidget } from 'react-native-android-widget';

export function GalleryWidget({ drawing }) {
  console.log('GalleryWidget rendering, drawing exists:', !!drawing);
  console.log('Drawing data:', {
    hasWidgetFileUri: !!drawing?.widgetFileUri,
    hasFileUri: !!drawing?.fileUri,
    hasPublicUrl: !!drawing?.publicUrl,
    widgetFileUri: drawing?.widgetFileUri,
    fileUri: drawing?.fileUri,
  });

  if (!drawing) {
    return (
      <FlexWidget
        style={{
          height: 'match_parent',
          width: 'match_parent',
          backgroundColor: '#FFE5EC',
          borderRadius: 16,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 16,
        }}
      >
        <TextWidget
          text="💕 Couples Pet"
          style={{
            fontSize: 20,
            fontWeight: 'bold',
            color: '#FF1493',
            marginBottom: 8,
            textAlign: 'center',
          }}
        />
        <TextWidget
          text="No drawing set.\nDraw in the app!"
          style={{
            fontSize: 14,
            color: '#999999',
            textAlign: 'center',
          }}
        />
      </FlexWidget>
    );
  }

  // Try multiple image sources in order of preference
  let imageData = null;
  let imageSource = null;

  // 1. Try base64 data (most reliable for widgets)
  if (drawing.image) {
    imageData = `data:image/png;base64,${drawing.image}`;
    imageSource = 'base64';
    console.log('Using base64 image data, length:', drawing.image.length);
  }
  // 2. Try widget-specific local file
  else if (drawing.widgetFileUri) {
    imageData = drawing.widgetFileUri;
    imageSource = 'widgetFileUri';
    console.log('Using widget file URI:', imageData);
  }
  // 3. Fallback to regular local file
  else if (drawing.fileUri) {
    imageData = drawing.fileUri;
    imageSource = 'fileUri';
    console.log('Using file URI:', imageData);
  }

  if (!imageData) {
    // No image available
    return (
      <FlexWidget
        style={{
          height: 'match_parent',
          width: 'match_parent',
          backgroundColor: drawing.backgroundColor || '#FFE5EC',
          borderRadius: 16,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 16,
        }}
      >
        <TextWidget
          text="🎨"
          style={{
            fontSize: 48,
            marginBottom: 8,
          }}
        />
        <TextWidget
          text="Drawing Ready"
          style={{
            fontSize: 16,
            color: '#FF1493',
            textAlign: 'center',
          }}
        />
      </FlexWidget>
    );
  }

  console.log('Rendering widget with image source:', imageSource);

  // ImageWidget requires numeric width and height
  const widgetSize = 400; // Size in dp

  // Display the actual image
  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: drawing.backgroundColor || '#FFFFFF',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <ImageWidget
        image={imageData}
        imageWidth={widgetSize}
        imageHeight={widgetSize}
      />
    </FlexWidget>
  );
}
