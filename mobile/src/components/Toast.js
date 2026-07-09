import React, { useEffect, useRef, useState } from 'react';
import { Animated, Text, StyleSheet, Platform } from 'react-native';
import { Colors, FontFamily } from '../theme';

const Toast = ({ message, type = 'info', visible, onHide }) => {
  const slideAnim = useRef(new Animated.Value(100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        dismiss();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 100,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShouldRender(false);
      if (onHide) onHide();
    });
  };

  if (!shouldRender) return null;

  const getBackgroundColor = () => {
    switch (type) {
      case 'success': return Colors.positive;
      case 'error': return Colors.negative;
      case 'info':
      default: return Colors.neutral;
    }
  };

  return (
    <Animated.View
      style={[
        styles.toastContainer,
        {
          backgroundColor: getBackgroundColor(),
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 50 : 30,
    left: 20,
    right: 20,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  text: {
    color: Colors.white,
    fontSize: 14,
    fontFamily: FontFamily.medium,
    textAlign: 'center',
  },
});

export default Toast;
