import React, { useState, useRef, useImperativeHandle, forwardRef } from 'react';
import { View, StyleSheet, PanResponder, Dimensions } from 'react-native';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';

const CANVAS_SIZE = Math.min(Dimensions.get('window').width, Dimensions.get('window').height) - 40;

export const SkiaDrawingCanvas = forwardRef(({
  backgroundColor = 'white',
  strokeColor = '#FF1493',
  strokeWidth = 4,
  onPathsChange
}, ref) => {
  const [paths, setPaths] = useState([]);
  const [currentPath, setCurrentPath] = useState(null);
  const currentPathRef = useRef(null);

  // Use refs to capture current prop values for use in PanResponder
  const strokeColorRef = useRef(strokeColor);
  const strokeWidthRef = useRef(strokeWidth);

  // Update refs when props change
  React.useEffect(() => {
    strokeColorRef.current = strokeColor;
    strokeWidthRef.current = strokeWidth;
  }, [strokeColor, strokeWidth]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e, gestureState) => {
        const { locationX, locationY } = e.nativeEvent;
        console.log('Touch started at', locationX, locationY, 'size:', strokeWidthRef.current);

        const newPath = Skia.Path.Make();
        newPath.moveTo(locationX, locationY);
        currentPathRef.current = {
          path: newPath,
          color: strokeColorRef.current,
          width: strokeWidthRef.current
        };
        setCurrentPath({ ...currentPathRef.current });
      },
      onPanResponderMove: (e, gestureState) => {
        const { locationX, locationY } = e.nativeEvent;

        if (currentPathRef.current) {
          currentPathRef.current.path.lineTo(locationX, locationY);
          // Force re-render by creating a new object reference
          setCurrentPath({
            path: currentPathRef.current.path,
            color: currentPathRef.current.color,
            width: currentPathRef.current.width,
            timestamp: Date.now() // Force unique object
          });
        }
      },
      onPanResponderRelease: () => {
        console.log('Touch ended');
        if (currentPathRef.current) {
          const pathToSave = currentPathRef.current;
          setPaths(prevPaths => {
            const newPaths = [...prevPaths, pathToSave];
            if (onPathsChange) {
              onPathsChange(newPaths);
            }
            return newPaths;
          });
          setCurrentPath(null);
          currentPathRef.current = null;
        }
      },
    })
  ).current;

  const clearCanvas = () => {
    setPaths([]);
    setCurrentPath(null);
    if (onPathsChange) {
      onPathsChange([]);
    }
  };

  const undoLastPath = () => {
    setPaths(prevPaths => {
      if (prevPaths.length === 0) return prevPaths;
      const newPaths = prevPaths.slice(0, -1);
      if (onPathsChange) {
        onPathsChange(newPaths);
      }
      return newPaths;
    });
  };

  const exportAsImage = async () => {
    try {
      console.log('🎨 Exporting image with', paths.length, 'paths');

      if (paths.length === 0) {
        console.warn('⚠️ No paths to export!');
      }

      // Create a Picture to record drawing commands
      const recorder = Skia.PictureRecorder();
      const canvas = recorder.beginRecording(
        Skia.XYWHRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
      );

      // Draw background
      const bgPaint = Skia.Paint();
      bgPaint.setColor(Skia.Color(backgroundColor));
      canvas.drawPaint(bgPaint);

      // Draw all paths by recreating them from SVG
      paths.forEach((p, index) => {
        try {
          // Get the SVG path string
          const svgString = p.path.toSVGString();
          console.log(`Path ${index} SVG:`, svgString?.substring(0, 50));

          // Create a new path from the SVG string
          const newPath = Skia.Path.MakeFromSVGString(svgString);

          if (newPath) {
            const pathPaint = Skia.Paint();
            pathPaint.setColor(Skia.Color(p.color));
            pathPaint.setStyle(1); // Stroke
            pathPaint.setStrokeWidth(p.width);
            pathPaint.setStrokeCap(1); // Round
            pathPaint.setStrokeJoin(1); // Round
            pathPaint.setAntiAlias(true);
            canvas.drawPath(newPath, pathPaint);
          }
        } catch (pathError) {
          console.error(`Error drawing path ${index}:`, pathError);
        }
      });

      // Finish recording
      const picture = recorder.finishRecordingAsPicture();

      // Create a surface and draw the picture to it
      const surface = Skia.Surface.Make(CANVAS_SIZE, CANVAS_SIZE);
      if (!surface) {
        console.error('Failed to create surface');
        return null;
      }

      const surfaceCanvas = surface.getCanvas();
      surfaceCanvas.drawPicture(picture);

      // Make image snapshot from surface
      const image = surface.makeImageSnapshot();
      if (!image) {
        console.error('Failed to create image from surface');
        return null;
      }

      const base64 = image.encodeToBase64();
      console.log('✅ Image exported, base64 length:', base64?.length);

      return {
        base64,
        width: CANVAS_SIZE,
        height: CANVAS_SIZE
      };
    } catch (error) {
      console.error('Error exporting image:', error);
      console.error('Error stack:', error.stack);
      return null;
    }
  };

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    clear: clearCanvas,
    undo: undoLastPath,
    exportAsImage,
    isEmpty: () => paths.length === 0
  }));

  return (
    <View
      style={[styles.container, { backgroundColor, width: CANVAS_SIZE, height: CANVAS_SIZE }]}
      {...panResponder.panHandlers}
    >
      <Canvas style={styles.canvas}>
        {/* Render saved paths */}
        {paths.map((p, index) => (
          <Path
            key={index}
            path={p.path}
            color={p.color}
            style="stroke"
            strokeWidth={p.width}
            strokeCap="round"
            strokeJoin="round"
          />
        ))}
        {/* Render current drawing path */}
        {currentPath && (
          <Path
            path={currentPath.path}
            color={currentPath.color}
            style="stroke"
            strokeWidth={currentPath.width}
            strokeCap="round"
            strokeJoin="round"
          />
        )}
      </Canvas>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: 15,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  canvas: {
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
  },
});

export default SkiaDrawingCanvas;
