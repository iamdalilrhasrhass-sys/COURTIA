import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { 
  LayoutDashboard, 
  Users, 
  Radio, 
  AlertTriangle, 
  User 
} from 'lucide-react-native';

// Screens
import DashboardScreen from '../screens/DashboardScreen';
import ClientsScreen from '../screens/ClientsScreen';
import ARKWatchScreen from '../screens/ARKWatchScreen';
import SinistresScreen from '../screens/SinistresScreen';
import ProfileScreen from '../screens/ProfileScreen';

export type TabParamList = {
  Dashboard: undefined;
  Clients: undefined;
  ARKWatch: undefined;
  Sinistres: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

const VIOLET = '#8B5CF6';
const GRAY = 'rgba(255,255,255,0.4)';

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: VIOLET,
        tabBarInactiveTintColor: GRAY,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIconStyle: { marginBottom: -4 },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Accueil',
          tabBarIcon: ({ color, size }) => (
            <LayoutDashboard color={color} size={size} strokeWidth={1.5} />
          ),
        }}
      />
      <Tab.Screen
        name="Clients"
        component={ClientsScreen}
        options={{
          tabBarLabel: 'Clients',
          tabBarIcon: ({ color, size }) => (
            <Users color={color} size={size} strokeWidth={1.5} />
          ),
        }}
      />
      <Tab.Screen
        name="ARKWatch"
        component={ARKWatchScreen}
        options={{
          tabBarLabel: 'ARK',
          tabBarIcon: ({ color, size }) => (
            <View style={styles.arkIconContainer}>
              <Radio color={color} size={size} strokeWidth={1.5} />
              <View style={styles.arkPulse} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Sinistres"
        component={SinistresScreen}
        options={{
          tabBarLabel: 'Sinistres',
          tabBarIcon: ({ color, size }) => (
            <AlertTriangle color={color} size={size} strokeWidth={1.5} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profil',
          tabBarIcon: ({ color, size }) => (
            <User color={color} size={size} strokeWidth={1.5} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#0A0A1A',
    borderTopColor: 'rgba(255,255,255,0.05)',
    borderTopWidth: 1,
    height: 80,
    paddingTop: 8,
    paddingBottom: 24,
  },
  tabLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    marginTop: 4,
  },
  arkIconContainer: {
    position: 'relative',
  },
  arkPulse: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: VIOLET,
  },
});