import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  User,
  Mail,
  Building,
  Bell,
  Shield,
  HelpCircle,
  LogOut,
  ChevronRight,
  Moon,
  Smartphone,
  CreditCard,
  FileText,
} from 'lucide-react-native';

import { useStore } from '../store/useStore';

interface MenuItem {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  onPress?: () => void;
  danger?: boolean;
}

export default function ProfileScreen() {
  const { user, logout } = useStore();

  const handleLogout = () => {
    Alert.alert(
      'Deconnexion',
      'Voulez-vous vraiment vous deconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Deconnecter', style: 'destructive', onPress: logout },
      ]
    );
  };

  const menuSections: { title: string; items: MenuItem[] }[] = [
    {
      title: 'Compte',
      items: [
        {
          icon: <Building color="#8B5CF6" size={20} />,
          label: 'Mon cabinet',
          sublabel: user?.cabinet || 'Configurer',
        },
        {
          icon: <CreditCard color="#22D3EE" size={20} />,
          label: 'Abonnement',
          sublabel: 'Plan Pro',
        },
        {
          icon: <FileText color="#F59E0B" size={20} />,
          label: 'Factures',
        },
      ],
    },
    {
      title: 'Preferences',
      items: [
        {
          icon: <Bell color="#8B5CF6" size={20} />,
          label: 'Notifications',
          sublabel: 'Activees',
        },
        {
          icon: <Moon color="#22D3EE" size={20} />,
          label: 'Apparence',
          sublabel: 'Mode sombre',
        },
        {
          icon: <Smartphone color="#10B981" size={20} />,
          label: 'Synchronisation',
          sublabel: 'Automatique',
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          icon: <HelpCircle color="#8B5CF6" size={20} />,
          label: 'Centre d\'aide',
        },
        {
          icon: <Shield color="#22D3EE" size={20} />,
          label: 'Securite',
        },
      ],
    },
    {
      title: '',
      items: [
        {
          icon: <LogOut color="#EF4444" size={20} />,
          label: 'Se deconnecter',
          onPress: handleLogout,
          danger: true,
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Profil</Text>
        </View>

        {/* Profile Card */}
        <LinearGradient
          colors={['rgba(139,92,246,0.15)', 'rgba(139,92,246,0.05)']}
          style={styles.profileCard}
        >
          <View style={styles.avatar}>
            <User color="#8B5CF6" size={32} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.userName}>{user?.name || 'Courtier'}</Text>
            <View style={styles.emailRow}>
              <Mail color="rgba(255,255,255,0.4)" size={14} />
              <Text style={styles.userEmail}>{user?.email || 'email@example.com'}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.editButton}>
            <Text style={styles.editButtonText}>Modifier</Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>127</Text>
            <Text style={styles.statLabel}>Clients</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>243</Text>
            <Text style={styles.statLabel}>Contrats</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>12</Text>
            <Text style={styles.statLabel}>mois actif</Text>
          </View>
        </View>

        {/* Menu Sections */}
        {menuSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.menuSection}>
            {section.title && (
              <Text style={styles.sectionTitle}>{section.title}</Text>
            )}
            <View style={styles.menuCard}>
              {section.items.map((item, itemIndex) => (
                <TouchableOpacity
                  key={itemIndex}
                  style={[
                    styles.menuItem,
                    itemIndex < section.items.length - 1 && styles.menuItemBorder,
                  ]}
                  onPress={item.onPress}
                  activeOpacity={0.7}
                >
                  <View style={styles.menuItemIcon}>{item.icon}</View>
                  <View style={styles.menuItemContent}>
                    <Text
                      style={[
                        styles.menuItemLabel,
                        item.danger && styles.menuItemLabelDanger,
                      ]}
                    >
                      {item.label}
                    </Text>
                    {item.sublabel && (
                      <Text style={styles.menuItemSublabel}>{item.sublabel}</Text>
                    )}
                  </View>
                  {!item.danger && (
                    <ChevronRight color="rgba(255,255,255,0.3)" size={18} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Version */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>COURTIARK Mobile v1.0.0</Text>
          <Text style={styles.versionSubtext}>Intelligence Proactive</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050510',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    color: '#FFFFFF',
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(139,92,246,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 14,
  },
  userName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 17,
    color: '#FFFFFF',
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  userEmail: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginLeft: 6,
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(139,92,246,0.2)',
  },
  editButtonText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: '#8B5CF6',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    color: '#FFFFFF',
  },
  statLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  menuSection: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 10,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  menuItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: '#FFFFFF',
  },
  menuItemLabelDanger: {
    color: '#EF4444',
  },
  menuItemSublabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  versionText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
  },
  versionSubtext: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: 'rgba(255,255,255,0.2)',
    marginTop: 4,
  },
});