import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles, ChevronRight } from 'lucide-react-native';

interface ARKCardProps {
  title: string;
  subtitle?: string;
  content: string;
  icon?: React.ReactNode;
  gradient?: boolean;
  onPress?: () => void;
}

export default function ARKCard({
  title,
  subtitle,
  content,
  icon,
  gradient = false,
  onPress,
}: ARKCardProps) {
  const CardWrapper = onPress ? TouchableOpacity : View;

  const cardContent = (
    <>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          {icon || <Sparkles color="#8B5CF6" size={20} />}
        </View>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        {onPress && (
          <ChevronRight color="rgba(255,255,255,0.5)" size={20} />
        )}
      </View>
      <Text style={styles.content}>{content}</Text>
    </>
  );

  if (gradient) {
    return (
      <CardWrapper onPress={onPress} activeOpacity={0.8}>
        <LinearGradient
          colors={['rgba(139,92,246,0.15)', 'rgba(34,211,238,0.05)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.container}
        >
          {cardContent}
        </LinearGradient>
      </CardWrapper>
    );
  }

  return (
    <CardWrapper onPress={onPress} activeOpacity={0.8} style={styles.container}>
      {cardContent}
    </CardWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(139,92,246,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: '#FFFFFF',
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  content: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 20,
  },
});