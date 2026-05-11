import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import Svg, { Path, Defs, LinearGradient, Stop, RadialGradient } from 'react-native-svg';

interface CLogoProps {
  size?: number;
  animated?: boolean;
  showGlow?: boolean;
}

export default function CLogo({ size = 80, animated = true, showGlow = true }: CLogoProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.5);
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (animated) {
      // Pulse animation
      scale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );

      // Glow animation
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.8, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.4, { duration: 2000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );

      // Subtle rotation
      rotation.value = withRepeat(
        withSequence(
          withTiming(5, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
          withTiming(-5, { duration: 4000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    }
  }, [animated]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {showGlow && (
        <Animated.View style={[styles.glow, glowStyle, { width: size * 1.5, height: size * 1.5 }]} />
      )}
      <Animated.View style={[styles.logoContainer, animated ? animatedStyle : {}]}>
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Defs>
            <LinearGradient id="cGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#8B5CF6" />
              <Stop offset="50%" stopColor="#A78BFA" />
              <Stop offset="100%" stopColor="#22D3EE" />
            </LinearGradient>
            <RadialGradient id="innerGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.3" />
              <Stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          {/* Background circle */}
          <Path
            d="M50 5 A45 45 0 1 1 49.999 5"
            fill="url(#innerGlow)"
          />
          {/* C letter */}
          <Path
            d="M65 30 
               C45 25, 25 35, 25 50 
               C25 65, 45 75, 65 70"
            fill="none"
            stroke="url(#cGradient)"
            strokeWidth="8"
            strokeLinecap="round"
          />
          {/* Decorative dot */}
          <Path
            d="M72 35 A3 3 0 1 1 71.999 35"
            fill="#22D3EE"
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    zIndex: 2,
  },
  glow: {
    position: 'absolute',
    borderRadius: 1000,
    backgroundColor: '#8B5CF6',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 40,
    elevation: 20,
  },
});