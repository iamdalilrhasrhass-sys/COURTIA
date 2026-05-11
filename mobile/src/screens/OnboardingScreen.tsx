import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  FlatList,
  ViewToken,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { 
  LayoutDashboard, 
  Sparkles, 
  Zap,
  ChevronRight,
  ArrowRight,
} from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
} from 'react-native-reanimated';

import { useStore } from '../store/useStore';
import CLogo from '../components/CLogo';
import { RootStackParamList } from '../navigation/RootNavigator';

const { width } = Dimensions.get('window');

interface Slide {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  gradient: [string, string];
}

const SLIDES: Slide[] = [
  {
    id: '1',
    icon: <LayoutDashboard color="#8B5CF6" size={48} strokeWidth={1.5} />,
    title: 'Cockpit Intelligent',
    description: 'Un tableau de bord unifie pour piloter votre activite. Vision 360 de vos clients, contrats et opportunites.',
    gradient: ['rgba(139,92,246,0.2)', 'rgba(139,92,246,0.05)'],
  },
  {
    id: '2',
    icon: <Sparkles color="#22D3EE" size={48} strokeWidth={1.5} />,
    title: 'ARK - Votre IA',
    description: 'Intelligence proactive qui anticipe les besoins. Signaux Hamon, Chatel, renouvellements - ARK vous alerte.',
    gradient: ['rgba(34,211,238,0.2)', 'rgba(34,211,238,0.05)'],
  },
  {
    id: '3',
    icon: <Zap color="#10B981" size={48} strokeWidth={1.5} />,
    title: 'Productivite x3',
    description: 'Gagnez 3h par semaine. Automatisez le repetitif, concentrez-vous sur la relation client.',
    gradient: ['rgba(16,185,129,0.2)', 'rgba(16,185,129,0.05)'],
  },
];

type OnboardingNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;

export default function OnboardingScreen() {
  const navigation = useNavigation<OnboardingNavigationProp>();
  const setHasCompletedOnboarding = useStore((state) => state.setHasCompletedOnboarding);
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useSharedValue(0);

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    setHasCompletedOnboarding(true);
    navigation.replace('Login');
  };

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setCurrentIndex(viewableItems[0].index);
      }
    }
  ).current;

  const renderSlide = ({ item, index }: { item: Slide; index: number }) => (
    <View style={styles.slide}>
      <LinearGradient
        colors={item.gradient as [string, string]}
        style={styles.iconContainer}
      >
        {item.icon}
      </LinearGradient>
      <Text style={styles.slideTitle}>{item.title}</Text>
      <Text style={styles.slideDescription}>{item.description}</Text>
    </View>
  );

  const renderDots = () => (
    <View style={styles.dotsContainer}>
      {SLIDES.map((_, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            index === currentIndex && styles.dotActive,
          ]}
        />
      ))}
    </View>
  );

  return (
    <LinearGradient colors={['#050510', '#0A0A1A']} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <CLogo size={40} animated={false} showGlow={false} />
        <TouchableOpacity onPress={handleSkip}>
          <Text style={styles.skipText}>Passer</Text>
        </TouchableOpacity>
      </View>

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        keyExtractor={(item) => item.id}
      />

      {/* Footer */}
      <View style={styles.footer}>
        {renderDots()}
        
        <TouchableOpacity
          onPress={handleNext}
          activeOpacity={0.8}
          style={styles.nextButton}
        >
          <LinearGradient
            colors={['#8B5CF6', '#6D28D9']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.nextButtonGradient}
          >
            {currentIndex === SLIDES.length - 1 ? (
              <>
                <Text style={styles.nextButtonText}>Commencer</Text>
                <ArrowRight color="#FFFFFF" size={20} />
              </>
            ) : (
              <>
                <Text style={styles.nextButtonText}>Suivant</Text>
                <ChevronRight color="#FFFFFF" size={20} />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
  },
  skipText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
  slide: {
    width,
    paddingHorizontal: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  slideTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  slideDescription: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 50,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 32,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 4,
  },
  dotActive: {
    width: 24,
    backgroundColor: '#8B5CF6',
  },
  nextButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  nextButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  nextButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
    marginRight: 8,
  },
});