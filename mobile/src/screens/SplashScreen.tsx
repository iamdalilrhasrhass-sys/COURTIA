import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import CLogo from '../components/CLogo';

export default function SplashScreen() {
  const logoScale = useSharedValue(0.5);
  const logoOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);

  useEffect(() => {
    // Animate logo entrance
    logoOpacity.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.ease) });
    logoScale.value = withSequence(
      withTiming(1.1, { duration: 600, easing: Easing.out(Easing.back) }),
      withTiming(1, { duration: 300, easing: Easing.inOut(Easing.ease) })
    );

    // Animate text after logo
    textOpacity.value = withDelay(
      600,
      withTiming(1, { duration: 500, easing: Easing.out(Easing.ease) })
    );
  }, []);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  return (
    <LinearGradient
      colors={['#050510', '#0A0A20', '#050510']}
      style={styles.container}
    >
      {/* Background glow effects */}
      <View style={styles.glowContainer}>
        <View style={[styles.glow, styles.glowViolet]} />
        <View style={[styles.glow, styles.glowCyan]} />
      </View>

      <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
        <CLogo size={120} animated showGlow />
      </Animated.View>

      <Animated.View style={[styles.textContainer, textAnimatedStyle]}>
        <Text style={styles.title}>COURTIARK</Text>
        <Text style={styles.subtitle}>Intelligence Proactive</Text>
      </Animated.View>

      <View style={styles.footer}>
        <View style={styles.loadingBar}>
          <Animated.View style={styles.loadingProgress} />
        </View>
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    opacity: 0.3,
  },
  glowViolet: {
    backgroundColor: '#8B5CF6',
    top: '20%',
    left: '-20%',
    transform: [{ scale: 1.5 }],
  },
  glowCyan: {
    backgroundColor: '#22D3EE',
    bottom: '20%',
    right: '-20%',
    transform: [{ scale: 1.2 }],
  },
  logoContainer: {
    marginBottom: 24,
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 32,
    color: '#FFFFFF',
    letterSpacing: 4,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 8,
    letterSpacing: 2,
  },
  footer: {
    position: 'absolute',
    bottom: 60,
    alignItems: 'center',
  },
  loadingBar: {
    width: 120,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  loadingProgress: {
    width: '60%',
    height: '100%',
    backgroundColor: '#8B5CF6',
    borderRadius: 2,
  },
  loadingText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 8,
  },
});