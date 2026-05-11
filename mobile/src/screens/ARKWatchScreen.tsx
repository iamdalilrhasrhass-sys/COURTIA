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
  Radio,
  Filter,
  Clock,
  AlertCircle,
  TrendingUp,
  Calendar,
  Bell,
} from 'lucide-react-native';

import SignalCard from '../components/SignalCard';
import { useStore } from '../store/useStore';

const FILTER_TYPES = [
  { id: 'all', label: 'Tous', icon: Radio },
  { id: 'hamon', label: 'Hamon', icon: Clock },
  { id: 'chatel', label: 'Chatel', icon: AlertCircle },
  { id: 'renouvellement', label: 'Renouv.', icon: Calendar },
  { id: 'opportunite', label: 'Opportunites', icon: TrendingUp },
];

export default function ARKWatchScreen() {
  const { signals, fetchSignals, dismissSignal } = useStore();
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    fetchSignals();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchSignals();
    setRefreshing(false);
  }, []);

  const filteredSignals = signals.filter((signal) => {
    if (activeFilter === 'all') return true;
    return signal.type === activeFilter;
  });

  const handleDismiss = async (id: string) => {
    await dismissSignal(id);
  };

  const renderSignal = ({ item }: { item: typeof signals[0] }) => (
    <View style={styles.signalItem}>
      <SignalCard
        id={item.id}
        type={item.type}
        clientName={item.clientName}
        message={item.message}
        priority={item.priority}
        dueDate={item.dueDate}
        onDismiss={() => handleDismiss(item.id)}
      />
    </View>
  );

  const ListHeader = () => (
    <View style={styles.listHeader}>
      {/* Stats */}
      <LinearGradient
        colors={['rgba(139,92,246,0.15)', 'rgba(139,92,246,0.05)']}
        style={styles.statsCard}
      >
        <View style={styles.statRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{signals.length}</Text>
            <Text style={styles.statLabel}>Signaux actifs</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: '#EF4444' }]}>
              {signals.filter((s) => s.priority === 'high').length}
            </Text>
            <Text style={styles.statLabel}>Priorite haute</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: '#10B981' }]}>
              {signals.filter((s) => s.type === 'opportunite').length}
            </Text>
            <Text style={styles.statLabel}>Opportunites</Text>
          </View>
        </View>
      </LinearGradient>

      <Text style={styles.sectionTitle}>
        {filteredSignals.length} signal{filteredSignals.length > 1 ? 'x' : ''}
      </Text>
    </View>
  );

  const EmptyList = () => (
    <View style={styles.emptyContainer}>
      <Radio color="rgba(255,255,255,0.2)" size={48} />
      <Text style={styles.emptyTitle}>Aucun signal</Text>
      <Text style={styles.emptySubtitle}>
        ARK surveille votre portefeuille en continu
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitle}>
          <Radio color="#8B5CF6" size={24} />
          <Text style={styles.title}>ARK Watch</Text>
        </View>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <FlatList
          data={FILTER_TYPES}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersList}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const Icon = item.icon;
            const isActive = activeFilter === item.id;
            return (
              <TouchableOpacity
                onPress={() => setActiveFilter(item.id)}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
              >
                <Icon
                  color={isActive ? '#FFFFFF' : 'rgba(255,255,255,0.5)'}
                  size={14}
                />
                <Text
                  style={[
                    styles.filterText,
                    isActive && styles.filterTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Signals List */}
      <FlatList
        data={filteredSignals}
        renderItem={renderSignal}
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
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    color: '#FFFFFF',
    marginLeft: 10,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16,185,129,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  liveText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: '#10B981',
    letterSpacing: 1,
  },
  filtersContainer: {
    marginBottom: 8,
  },
  filtersList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  filterChipActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  filterText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginLeft: 6,
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  listHeader: {
    marginBottom: 16,
  },
  statsCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  statValue: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    color: '#8B5CF6',
  },
  statLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
  },
  sectionTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
  signalItem: {
    marginBottom: 12,
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
    textAlign: 'center',
  },
});