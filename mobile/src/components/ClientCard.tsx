import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { User, Phone, Mail, ChevronRight, TrendingUp } from 'lucide-react-native';

interface ClientCardProps {
  id: string;
  nom: string;
  prenom: string;
  email?: string;
  telephone?: string;
  arkScore?: number;
  contratsCount?: number;
  onPress?: () => void;
}

export default function ClientCard({
  nom,
  prenom,
  email,
  telephone,
  arkScore,
  contratsCount,
  onPress,
}: ClientCardProps) {
  const getScoreColor = (score?: number) => {
    if (!score) return 'rgba(255,255,255,0.3)';
    if (score >= 80) return '#10B981';
    if (score >= 60) return '#F59E0B';
    return '#EF4444';
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={styles.container}
    >
      <View style={styles.avatar}>
        <User color="#8B5CF6" size={24} />
      </View>

      <View style={styles.info}>
        <Text style={styles.name}>
          {prenom} {nom}
        </Text>
        
        {email && (
          <View style={styles.row}>
            <Mail color="rgba(255,255,255,0.4)" size={12} />
            <Text style={styles.detail}>{email}</Text>
          </View>
        )}
        
        {telephone && (
          <View style={styles.row}>
            <Phone color="rgba(255,255,255,0.4)" size={12} />
            <Text style={styles.detail}>{telephone}</Text>
          </View>
        )}

        {contratsCount !== undefined && (
          <Text style={styles.contracts}>
            {contratsCount} contrat{contratsCount > 1 ? 's' : ''}
          </Text>
        )}
      </View>

      <View style={styles.right}>
        {arkScore !== undefined && (
          <View style={styles.scoreContainer}>
            <TrendingUp color={getScoreColor(arkScore)} size={14} />
            <Text style={[styles.score, { color: getScoreColor(arkScore) }]}>
              {arkScore}
            </Text>
          </View>
        )}
        <ChevronRight color="rgba(255,255,255,0.3)" size={20} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(139,92,246,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  name: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  detail: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginLeft: 6,
  },
  contracts: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: '#8B5CF6',
    marginTop: 4,
  },
  right: {
    alignItems: 'flex-end',
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  score: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    marginLeft: 4,
  },
});