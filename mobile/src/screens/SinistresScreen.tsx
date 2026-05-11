import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  ChevronRight,
  Plus,
  Calendar,
} from 'lucide-react-native';

import { useStore } from '../store/useStore';

const STATUS_CONFIG = {
  ouvert: { label: 'Ouvert', color: '#EF4444', icon: AlertTriangle },
  en_cours: { label: 'En cours', color: '#F59E0B', icon: Clock },
  clos: { label: 'Clos', color: '#10B981', icon: CheckCircle },
};

const FILTER_TABS = [
  { id: 'all', label: 'Tous' },
  { id: 'ouvert', label: 'Ouverts' },
  { id: 'en_cours', label: 'En cours' },
  { id: 'clos', label: 'Clos' },
];

export default function SinistresScreen() {
  const { sinistres, fetchSinistres, updateSinistreStatus } = useStore();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    fetchSinistres();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchSinistres();
    setRefreshing(false);
  }, []);

  const filteredSinistres = sinistres.filter((s) => {
    if (activeTab === 'all') return true;
    return s.status === activeTab;
  });

  const renderSinistre = ({ item }: { item: typeof sinistres[0] }) => {
    const config = STATUS_CONFIG[item.status] || STATUS_CONFIG.ouvert;
    const Icon = config.icon;

    return (
      <TouchableOpacity style={styles.sinistreCard} activeOpacity={0.7}>
        <View style={[styles.statusBar, { backgroundColor: config.color }]} />
        <View style={styles.sinistreContent}>
          <View style={styles.sinistreHeader}>
            <View style={[styles.statusBadge, { backgroundColor: `${config.color}20` }]}>
              <Icon color={config.color} size={12} />
              <Text style={[styles.statusText, { color: config.color }]}>
                {config.label}
              </Text>
            </View>
            <Text style={styles.sinistreDate}>
              {new Date(item.dateDeclaration).toLocaleDateString('fr-FR')}
            </Text>
          </View>

          <Text style={styles.sinistreType}>{item.type}</Text>
          <Text style={styles.sinistreClient}>{item.clientName}</Text>
          <Text style={styles.sinistreDesc} numberOfLines={2}>
            {item.description}
          </Text>

          {item.montant && (
            <View style={styles.montantContainer}>
              <Text style={styles.montantLabel}>Montant estime</Text>
              <Text style={styles.montantValue}>
                {item.montant.toLocaleString('fr-FR')} EUR
              </Text>
            </View>
          )}

          <View style={styles.sinistreFooter}>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionButtonText}>Voir details</Text>
              <ChevronRight color="#8B5CF6" size={16} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const ListHeader = () => (
    <View style={styles.listHeader}>
      {/* Stats Cards */}
      <View style={styles.statsGrid}>
        <LinearGradient
          colors={['rgba(239,68,68,0.15)', 'rgba(239,68,68,0.05)']}
          style={styles.statCard}
        >
          <AlertTriangle color="#EF4444" size={20} />
          <Text style={[styles.statValue, { color: '#EF4444' }]}>
            {sinistres.filter((s) => s.status === 'ouvert').length}
          </Text>
          <Text style={styles.statLabel}>Ouverts</Text>
        </LinearGradient>

        <LinearGradient
          colors={['rgba(245,158,11,0.15)', 'rgba(245,158,11,0.05)']}
          style={styles.statCard}
        >
          <Clock color="#F59E0B" size={20} />
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>
            {sinistres.filter((s) => s.status === 'en_cours').length}
          </Text>
          <Text style={styles.statLabel}>En cours</Text>
        </LinearGradient>

        <LinearGradient
          colors={['rgba(16,185,129,0.15)', 'rgba(16,185,129,0.05)']}
          style={styles.statCard}
        >
          <CheckCircle color="#10B981" size={20} />
          <Text style={[styles.statValue, { color: '#10B981' }]}>
            {sinistres.filter((s) => s.status === 'clos').length}
          </Text>
          <Text style={styles.statLabel}>Clos</Text>
        </LinearGradient>
      </View>
    </View>
  );

  const EmptyList = () => (
    <View style={styles.emptyContainer}>
      <AlertTriangle color="rgba(255,255,255,0.2)" size={48} />
      <Text style={styles.emptyTitle}>Aucun sinistre</Text>
      <Text style={styles.emptySubtitle}>
        Les sinistres declares apparaitront ici
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Sinistres</Text>
        <TouchableOpacity style={styles.addButton}>
          <Plus color="#FFFFFF" size={20} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {FILTER_TABS.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            onPress={() => setActiveTab(tab.id)}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab.id && styles.tabTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      <FlatList
        data={filteredSinistres}
        renderItem={renderSinistre}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={EmptyList}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#8B5CF6"
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050510',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    color: '#FFFFFF',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  tabActive: {
    backgroundColor: '#8B5CF6',
  },
  tabText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  listHeader: {
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  statValue: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    marginTop: 8,
  },
  statLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
  },
  sinistreCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  statusBar: {
    width: 4,
  },
  sinistreContent: {
    flex: 1,
    padding: 14,
  },
  sinistreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    marginLeft: 4,
  },
  sinistreDate: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
  },
  sinistreType: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  sinistreClient: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: '#8B5CF6',
    marginTop: 2,
  },
  sinistreDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 8,
    lineHeight: 18,
  },
  montantContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  montantLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  montantValue: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  sinistreFooter: {
    marginTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  actionButtonText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: '#8B5CF6',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
    color: '#FFFFFF',
    marginTop: 16,
  },
  emptySubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 8,
  },
});