import React, { useRef, useState } from 'react';
import { Animated, PanResponder, Dimensions, View } from 'react-native';
import { Animations } from './conversationGameStyles';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * SwipeableCard Component
 *
 * A reusable card component that supports swipe gestures
 * - Swipe LEFT: triggers onSwipeLeft callback
 * - Swipe RIGHT: triggers onSwipeRight callback
 * - Swipe UP: triggers onSwipeUp callback (optional)
 *
 * Features:
 * - Smooth animations with spring physics
 * - Rotation effect during drag
 * - Opacity fade during swipe
 * - Return-to-center on incomplete swipe
 * - Disabled state support
 * - GPU-accelerated animations
 */
export function SwipeableCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  swipeThreshold = Animations.swipeThreshold,
  disabled = false,
  style = {},
}) {
  const pan = useRef(new Animated.ValueXY()).current;
  const [swiping, setSwiping] = useState(false);

  const panResponder = useRef(
    PanResponder.create({
      // Allow pan gestures to start
      onStartShouldSetPanResponder: () => !disabled,
      onMoveShouldSetPanResponder: () => !disabled,

      // Called when gesture starts
      onPanResponderGrant: () => {
        setSwiping(true);
        // Set offset to current value for smooth continuation
        pan.setOffset({
          x: pan.x._value,
          y: pan.y._value,
        });
      },

      // Called as finger moves
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false }
      ),

      // Called when finger is lifted
      onPanResponderRelease: (e, gesture) => {
        setSwiping(false);
        pan.flattenOffset();

        const { dx, dy } = gesture;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);

        // Determine if swipe was significant enough
        const swipedHorizontally = absDx > swipeThreshold && absDx > absDy;
        const swipedVertically = absDy > swipeThreshold && absDy > absDx;

        if (swipedHorizontally) {
          // Horizontal swipe detected
          const direction = dx > 0 ? 'right' : 'left';
          const toValue = dx > 0 ? SCREEN_WIDTH : -SCREEN_WIDTH;

          // Animate card off screen
          Animated.spring(pan, {
            toValue: { x: toValue, y: 0 },
            friction: 4,
            useNativeDriver: true,
          }).start(() => {
            // Call appropriate callback
            if (direction === 'right' && onSwipeRight) {
              onSwipeRight();
            } else if (direction === 'left' && onSwipeLeft) {
              onSwipeLeft();
            }

            // Reset position for next card
            pan.setValue({ x: 0, y: 0 });
          });
        } else if (swipedVertically && dy < 0 && onSwipeUp) {
          // Upward swipe detected
          Animated.spring(pan, {
            toValue: { x: 0, y: -600 },
            friction: 4,
            useNativeDriver: true,
          }).start(() => {
            onSwipeUp();
            pan.setValue({ x: 0, y: 0 });
          });
        } else {
          // Return to center - swipe was not significant enough
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            friction: Animations.springConfig.friction,
            tension: Animations.springConfig.tension,
            useNativeDriver: true,
          }).start();
        }
      },

      // Called when gesture is cancelled (e.g., another component takes over)
      onPanResponderTerminate: () => {
        setSwiping(false);
        pan.flattenOffset();
        Animated.spring(pan, {
          toValue: { x: 0, y: 0 },
          friction: Animations.springConfig.friction,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  // Interpolate rotation based on horizontal drag
  const rotate = pan.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ['-15deg', '0deg', '15deg'],
    extrapolate: 'clamp',
  });

  // Interpolate opacity based on drag distance
  const opacity = pan.x.interpolate({
    inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
    outputRange: [0.3, 1, 0.3],
    extrapolate: 'clamp',
  });

  // Interpolate scale for slight zoom effect during drag
  const scale = pan.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: [0.95, 1, 0.95],
    extrapolate: 'clamp',
  });

  // Animated styles
  const animatedStyle = {
    transform: [
      { translateX: pan.x },
      { translateY: pan.y },
      { rotate },
      { scale },
    ],
    opacity,
  };

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[animatedStyle, style, { zIndex: swiping ? 10 : 1 }]}
    >
      {children}
    </Animated.View>
  );
}
