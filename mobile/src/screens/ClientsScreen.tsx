import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Search, Filter, Plus, Users } from 'lucide-react-native';

import ClientCard from '../components/ClientCard';
import { useStore } from '../store/useStore';
import { RootStackParamList } from '../navigation/RootNavigator';

type ClientsNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ClientsScreen() {
  const navigation = useNavigation<ClientsNavigationProp>();
  const { clients, fetchClients } = useStore();
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchClients();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchClients(search);
    setRefreshing(false);
  }, [search]);

  const handleSearch = (text: string) => {
    setSearch(text);
    // Debounced search
    const timeout = setTimeout(() => {
      fetchClients(text);
    }, 300);
    return () => clearTimeout(timeout);
  };

  const handleClientPress = (clientId: string) => {
    navigation.navigate('ClientDetail', { clientId });
  };

  const filteredClients = clients.filter((client) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      client.nom?.toLowerCase().includes(searchLower) ||
      client.prenom?.toLowerCase().includes(searchLower) ||
      client.email?.toLowerCase().includes(searchLower)
    );
  });

  const renderClient = ({ item }: { item: typeof clients[0] }) => (
    <View style={styles.clientItem}>
      <ClientCard
        id={item.id}
        nom={item.nom}
        prenom={item.prenom}
        email={item.email}
        telephone={item.telephone}
        arkScore={item.arkScore}
        contratsCount={item.contratsCount}
        onPress={() => handleClientPress(item.id)}
      />
    </View>
  );

  const ListHeader = () => (
    <View style={styles.listHeader}>
      <View style={styles.statsRow}>
        <View style={styles.statBadge}>
          <Users color="#8B5CF6" size={14} />
          <Text style={styles.statText}>{filteredClients.length} clients</Text>
        </View>
      </View>
    </View>
  );

  const EmptyList = () => (
    <View style={styles.emptyContainer}>
      <Users color="rgba(255,255,255,0.2)" size={48} />
      <Text style={styles.emptyTitle}>Aucun client trouve</Text>
      <Text style={styles.emptySubtitle}>
        {search ? 'Modifiez votre recherche' : 'Commencez par ajouter un client'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Clients</Text>
        <TouchableOpacity style={styles.addButton}>
          <Plus color="#FFFFFF" size={20} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInput}>
          <Search color="rgba(255,255,255,0.4)" size={18} />
          <TextInput
            style={styles.searchText}
            placeholder="Rechercher un client..."
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={search}
            onChangeText={handleSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
        <TouchableOpacity style={styles.filterButton}>
          <Filter color="#8B5CF6" size={18} />
        </TouchableOpacity>
      </View>

      {/* Client List */}
      <FlatList
        data={filteredClients}
        renderItem={renderClient}
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
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  searchText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: '#FFFFFF',
    marginLeft: 10,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(139,92,246,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.3)',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  listHeader: {
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139,92,246,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: '#8B5CF6',
    marginLeft: 6,
  },
  clientItem: {
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
  },
});