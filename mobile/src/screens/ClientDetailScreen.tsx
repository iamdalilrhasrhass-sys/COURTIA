import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  FileText,
  TrendingUp,
  Calendar,
  Edit,
  MoreVertical,
} from 'lucide-react-native';

import { clientsService } from '../services/api';
import ARKCard from '../components/ARKCard';
import { RootStackParamList } from '../navigation/RootNavigator';

type ClientDetailRouteProp = RouteProp<RootStackParamList, 'ClientDetail'>;

interface ClientDetail {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  adresse?: string;
  ville?: string;
  codePostal?: string;
  dateNaissance?: string;
  arkScore?: number;
  contrats?: Array<{
    id: string;
    type: string;
    compagnie: string;
    prime: number;
    echeance: string;
  }>;
}

export default function ClientDetailScreen() {
  const route = useRoute<ClientDetailRouteProp>();
  const navigation = useNavigation();
  const { clientId } = route.params;

  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [arkScore, setArkScore] = useState<number | null>(null);

  useEffect(() => {
    loadClientData();
  }, [clientId]);

  const loadClientData = async () => {
    try {
      const [clientData, scoreData] = await Promise.all([
        clientsService.getById(clientId),
        clientsService.getArkScore(clientId).catch(() => null),
      ]);
      setClient(clientData);
      if (scoreData?.score) setArkScore(scoreData.score);
    } catch (error) {
      console.error('Error loading client:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#10B981';
    if (score >= 60) return '#F59E0B';
    return '#EF4444';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#8B5CF6" size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!client) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Client non trouve</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <ArrowLeft color="#FFFFFF" size={22} />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton}>
            <Edit color="rgba(255,255,255,0.7)" size={20} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <MoreVertical color="rgba(255,255,255,0.7)" size={20} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Card */}
        <LinearGradient
          colors={['rgba(139,92,246,0.15)', 'rgba(139,92,246,0.05)']}
          style={styles.profileCard}
        >
          <View style={styles.avatar}>
            <User color="#8B5CF6" size={36} />
          </View>
          <Text style={styles.clientName}>
            {client.prenom} {client.nom}
          </Text>

          {arkScore !== null && (
            <View style={styles.scoreContainer}>
              <TrendingUp color={getScoreColor(arkScore)} size={16} />
              <Text style={[styles.scoreText, { color: getScoreColor(arkScore) }]}>
                Score ARK : {arkScore}
              </Text>
            </View>
          )}
        </LinearGradient>

        {/* Contact Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations</Text>
          <View style={styles.infoCard}>
            {client.email && (
              <InfoRow icon={<Mail color="#8B5CF6" size={18} />} label="Email" value={client.email} />
            )}
            {client.telephone && (
              <InfoRow icon={<Phone color="#22D3EE" size={18} />} label="Telephone" value={client.telephone} />
            )}
            {(client.adresse || client.ville) && (
              <InfoRow
                icon={<MapPin color="#F59E0B" size={18} />}
                label="Adresse"
                value={`${client.adresse || ''} ${client.codePostal || ''} ${client.ville || ''}`}
              />
            )}
            {client.dateNaissance && (
              <InfoRow
                icon={<Calendar color="#10B981" size={18} />}
                label="Date de naissance"
                value={new Date(client.dateNaissance).toLocaleDateString('fr-FR')}
              />
            )}
          </View>
        </View>

        {/* Contrats */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Contrats</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{client.contrats?.length || 0}</Text>
            </View>
          </View>

          {client.contrats?.map((contrat) => (
            <TouchableOpacity key={contrat.id} style={styles.contratCard}>
              <View style={styles.contratIcon}>
                <FileText color="#8B5CF6" size={18} />
              </View>
              <View style={styles.contratInfo}>
                <Text style={styles.contratType}>{contrat.type}</Text>
                <Text style={styles.contratCompagnie}>{contrat.compagnie}</Text>
              </View>
              <View style={styles.contratRight}>
                <Text style={styles.contratPrime}>{contrat.prime} EUR/an</Text>
                <Text style={styles.contratEcheance}>Ech. {contrat.echeance}</Text>
              </View>
            </TouchableOpacity>
          )) || (
            <View style={styles.emptyContrats}>
              <Text style={styles.emptyText}>Aucun contrat</Text>
            </View>
          )}
        </View>

        {/* ARK Insights */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Analyse ARK</Text>
          <ARKCard
            title="Recommandations"
            content="ARK analyse le profil de ce client pour detecter les opportunites de multi-equipement et les risques de resiliation."
            gradient
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>{icon}</View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050510',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  profileCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 24,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(139,92,246,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  clientName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    color: '#FFFFFF',
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  scoreText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    marginLeft: 6,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
    color: '#FFFFFF',
    marginBottom: 12,
  },
  countBadge: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  countText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: '#FFFFFF',
  },
  infoCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  infoValue: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: '#FFFFFF',
    marginTop: 2,
  },
  contratCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  contratIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(139,92,246,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contratInfo: {
    flex: 1,
  },
  contratType: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  contratCompagnie: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  contratRight: {
    alignItems: 'flex-end',
  },
  contratPrime: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#10B981',
  },
  contratEcheance: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
  },
  emptyContrats: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
  },
  emptyText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
  },
});