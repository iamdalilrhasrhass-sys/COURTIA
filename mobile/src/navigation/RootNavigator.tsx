import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useStore } from '../store/useStore';

// Screens
import SplashScreen from '../screens/SplashScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import LoginScreen from '../screens/LoginScreen';
import ClientDetailScreen from '../screens/ClientDetailScreen';
import TabNavigator from './TabNavigator';

// Navigation types
export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Login: undefined;
  App: undefined;
  ClientDetail: { clientId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// Custom dark theme
const DarkTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: '#8B5CF6',
    background: '#050510',
    card: '#0A0A1A',
    text: '#FFFFFF',
    border: 'rgba(255,255,255,0.1)',
    notification: '#8B5CF6',
  },
};

export default function RootNavigator() {
  const { isAuthenticated, isLoading, hasCompletedOnboarding } = useStore();

  if (isLoading) {
    return (
      <NavigationContainer theme={DarkTheme}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Splash" component={SplashScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer theme={DarkTheme}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          contentStyle: { backgroundColor: '#050510' },
        }}
      >
        {!isAuthenticated ? (
          // Auth flow
          <>
            {!hasCompletedOnboarding && (
              <Stack.Screen 
                name="Onboarding" 
                component={OnboardingScreen}
                options={{ animation: 'fade' }}
              />
            )}
            <Stack.Screen 
              name="Login" 
              component={LoginScreen}
              options={{ animation: 'slide_from_right' }}
            />
          </>
        ) : (
          // Main app
          <>
            <Stack.Screen name="App" component={TabNavigator} />
            <Stack.Screen
              name="ClientDetail"
              component={ClientDetailScreen}
              options={{
                animation: 'slide_from_right',
                presentation: 'card',
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}