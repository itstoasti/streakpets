import React from 'react';
import { FlexWidget, TextWidget, ImageWidget } from 'react-native-android-widget';

export function GalleryWidget({ drawings }) {
  const latestDrawing = drawings && drawings.length > 0 ? drawings[drawings.length - 1] : null;

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: '#FFE5EC',
        borderRadius: 16,
        padding: 16,
        flexDirection: 'column',
        justifyContent: 'flex-start',
        alignItems: 'stretch',
      }}
    >
      <TextWidget
        text="💕 Couples Pet Gallery"
        style={{
          fontSize: 18,
          fontWeight: 'bold',
          color: '#FF1493',
          marginBottom: 8,
        }}
      />

      {latestDrawing ? (
        <FlexWidget
          style={{
            flexDirection: 'column',
            alignItems: 'flex-start',
          }}
        >
          <TextWidget
            text="Latest Drawing"
            style={{
              fontSize: 14,
              color: '#FF69B4',
              marginBottom: 12,
            }}
          />
          <TextWidget
            text={`${drawings.length} drawing${drawings.length !== 1 ? 's' : ''} saved`}
            style={{
              fontSize: 12,
              color: '#999999',
            }}
          />
          <TextWidget
            text="Tap to view all"
            style={{
              fontSize: 12,
              color: '#999999',
              marginTop: 4,
            }}
          />
        </FlexWidget>
      ) : (
        <FlexWidget
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <TextWidget
            text="No drawings yet.&#10;Create one in the app!"
            style={{
              fontSize: 14,
              color: '#999999',
              textAlign: 'center',
            }}
          />
        </FlexWidget>
      )}
    </FlexWidget>
  );
}
