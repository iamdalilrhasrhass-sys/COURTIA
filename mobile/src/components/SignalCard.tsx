import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { 
  AlertCircle, 
  Clock, 
  TrendingUp, 
  X,
  Calendar,
  Bell 
} from 'lucide-react-native';

interface SignalCardProps {
  id: string;
  type: 'hamon' | 'chatel' | 'resiliation' | 'renouvellement' | 'opportunite';
  clientName: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
  dueDate?: string;
  onPress?: () => void;
  onDismiss?: () => void;
}

const TYPE_CONFIG = {
  hamon: { label: 'Loi Hamon', color: '#F59E0B', icon: Clock },
  chatel: { label: 'Loi Chatel', color: '#EF4444', icon: AlertCircle },
  resiliation: { label: 'Résiliation', color: '#EF4444', icon: Bell },
  renouvellement: { label: 'Renouvellement', color: '#22D3EE', icon: Calendar },
  opportunite: { label: 'Opportunité', color: '#10B981', icon: TrendingUp },
};

const PRIORITY_COLORS = {
  high: '#EF4444',
  medium: '#F59E0B',
  low: '#10B981',
};

export default function SignalCard({
  type,
  clientName,
  message,
  priority,
  dueDate,
  onPress,
  onDismiss,
}: SignalCardProps) {
  const config = TYPE_CONFIG[type];
  const Icon = config.icon;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={styles.container}
    >
      <View style={[styles.priorityBar, { backgroundColor: PRIORITY_COLORS[priority] }]} />
      
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={[styles.badge, { backgroundColor: `${config.color}20` }]}>
            <Icon color={config.color} size={14} />
            <Text style={[styles.badgeText, { color: config.color }]}>
              {config.label}
            </Text>
          </View>
          
          {onDismiss && (
            <TouchableOpacity
              onPress={onDismiss}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.dismissButton}
            >
              <X color="rgba(255,255,255,0.4)" size={16} />
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.clientName}>{clientName}</Text>
        <Text style={styles.message}>{message}</Text>

        {dueDate && (
          <View style={styles.footer}>
            <Calendar color="rgba(255,255,255,0.4)" size={12} />
            <Text style={styles.dueDate}>Échéance : {dueDate}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  priorityBar: {
    width: 4,
  },
  content: {
    flex: 1,
    padding: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    marginLeft: 4,
  },
  dismissButton: {
    padding: 4,
  },
  clientName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  message: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  dueDate: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginLeft: 6,
  },
});