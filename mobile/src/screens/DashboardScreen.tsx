import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Users,
  FileText,
  TrendingUp,
  Percent,
  Bell,
  Sparkles,
  ChevronRight,
} from 'lucide-react-native';

import CLogo from '../components/CLogo';
import ARKCard from '../components/ARKCard';
import { useStore } from '../store/useStore';

export default function DashboardScreen() {
  const { user, kpis, morningBrief, fetchKPIs, fetchMorningBrief } = useStore();
  const [refreshing, setRefreshing] = React.useState(false);

  useEffect(() => {
    fetchKPIs();
    fetchMorningBrief();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchKPIs(), fetchMorningBrief()]);
    setRefreshing(false);
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon apres-midi';
    return 'Bonsoir';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#8B5CF6"
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              {getGreeting()}, {user?.name?.split(' ')[0] || 'Courtier'}
            </Text>
            <Text style={styles.date}>
              {new Date().toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.notifButton}>
              <Bell color="#FFFFFF" size={22} />
              <View style={styles.notifBadge} />
            </TouchableOpacity>
            <CLogo size={36} animated={false} showGlow={false} />
          </View>
        </View>

        {/* Morning Brief */}
        <ARKCard
          title="Morning Brief ARK"
          subtitle="Intelligence du jour"
          content={morningBrief?.greeting || "ARK analyse votre portefeuille pour identifier les actions prioritaires de la journee."}
          icon={<Sparkles color="#8B5CF6" size={20} />}
          gradient
        />

        {/* KPIs Grid */}
        <Text style={styles.sectionTitle}>Vue d'ensemble</Text>
        <View style={styles.kpiGrid}>
          <KPICard
            icon={<Users color="#8B5CF6" size={20} />}
            label="Clients"
            value={kpis?.totalClients?.toString() || '—'}
            gradient={['rgba(139,92,246,0.2)', 'rgba(139,92,246,0.05)']}
          />
          <KPICard
            icon={<FileText color="#22D3EE" size={20} />}
            label="Contrats"
            value={kpis?.totalContrats?.toString() || '—'}
            gradient={['rgba(34,211,238,0.2)', 'rgba(34,211,238,0.05)']}
          />
          <KPICard
            icon={<TrendingUp color="#10B981" size={20} />}
            label="CA Annuel"
            value={kpis?.caAnnuel ? `${(kpis.caAnnuel / 1000).toFixed(0)}k` : '—'}
            gradient={['rgba(16,185,129,0.2)', 'rgba(16,185,129,0.05)']}
          />
          <KPICard
            icon={<Percent color="#F59E0B" size={20} />}
            label="Retention"
            value={kpis?.tauxRetention ? `${kpis.tauxRetention}%` : '—'}
            gradient={['rgba(245,158,11,0.2)', 'rgba(245,158,11,0.05)']}
          />
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Actions du jour</Text>
        <View style={styles.actionsContainer}>
          {morningBrief?.priorityActions?.slice(0, 3).map((action, index) => (
            <TouchableOpacity key={index} style={styles.actionItem}>
              <View style={styles.actionDot} />
              <Text style={styles.actionText}>{action}</Text>
              <ChevronRight color="rgba(255,255,255,0.3)" size={16} />
            </TouchableOpacity>
          )) || (
            <>
              <TouchableOpacity style={styles.actionItem}>
                <View style={styles.actionDot} />
                <Text style={styles.actionText}>3 contrats arrivent a echeance</Text>
                <ChevronRight color="rgba(255,255,255,0.3)" size={16} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionItem}>
                <View style={styles.actionDot} />
                <Text style={styles.actionText}>2 opportunites Loi Hamon detectees</Text>
                <ChevronRight color="rgba(255,255,255,0.3)" size={16} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function KPICard({
  icon,
  label,
  value,
  gradient,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  gradient: [string, string];
}) {
  return (
    <LinearGradient colors={gradient} style={styles.kpiCard}>
      {icon}
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050510',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  greeting: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    color: '#FFFFFF',
  },
  date: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
    textTransform: 'capitalize',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notifButton: {
    position: 'relative',
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
  },
  notifBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  sectionTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
    color: '#FFFFFF',
    marginTop: 28,
    marginBottom: 16,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  kpiCard: {
    width: '48%',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  kpiValue: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    color: '#FFFFFF',
    marginTop: 12,
  },
  kpiLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
  },
  actionsContainer: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  actionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#8B5CF6',
    marginRight: 12,
  },
  actionText: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
});