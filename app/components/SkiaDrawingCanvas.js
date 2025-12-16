import React, { useState, useRef, useImperativeHandle, forwardRef } from 'react';
import { View, StyleSheet, PanResponder, Dimensions } from 'react-native';
import { Canvas, Path, Skia, makeImageFromView } from '@shopify/react-native-skia';

const CANVAS_SIZE = Math.min(Dimensions.get('window').width, Dimensions.get('window').height) - 40;

export const SkiaDrawingCanvas = forwardRef(({
  backgroundColor = 'white',
  strokeColor = '#FF1493',
  strokeWidth = 4,
  onPathsChange
}, ref) => {
  const [paths, setPaths] = useState([]);
  const [currentPath, setCurrentPath] = useState(null);
  const canvasRef = useRef(null);
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
      if (canvasRef.current) {
        const image = await makeImageFromView(canvasRef);
        return {
          base64: image?.encodeToBase64(),
          width: CANVAS_SIZE,
          height: CANVAS_SIZE
        };
      }
      return null;
    } catch (error) {
      console.error('Error exporting image:', error);
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
      ref={canvasRef}
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
