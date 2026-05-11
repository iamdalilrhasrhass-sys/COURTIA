import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import Constants from 'expo-constants';
import { Shield, Mail } from 'lucide-react-native';

import CLogo from '../components/CLogo';
import { useStore } from '../store/useStore';

// Ensure browser is dismissed on web
WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const login = useStore((state) => state.login);

  // Google OAuth configuration
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: 'YOUR_ANDROID_CLIENT_ID',
    iosClientId: 'YOUR_IOS_CLIENT_ID',
    webClientId: 'YOUR_WEB_CLIENT_ID',
  });

  useEffect(() => {
    handleGoogleResponse();
  }, [response]);

  const handleGoogleResponse = async () => {
    if (response?.type === 'success') {
      setIsLoading(true);
      try {
        const { authentication } = response;
        if (authentication?.idToken) {
          await login(authentication.idToken);
        }
      } catch (error: any) {
        Alert.alert(
          'Erreur de connexion',
          error.message || 'Une erreur est survenue lors de la connexion.'
        );
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await promptAsync();
    } catch (error) {
      console.error('Google login error:', error);
    }
  };

  return (
    <LinearGradient colors={['#050510', '#0A0A1A', '#050510']} style={styles.container}>
      {/* Background glows */}
      <View style={styles.glowContainer}>
        <View style={[styles.glow, styles.glowViolet]} />
        <View style={[styles.glow, styles.glowCyan]} />
      </View>

      {/* Logo */}
      <View style={styles.logoSection}>
        <CLogo size={100} animated showGlow />
        <Text style={styles.title}>COURTIARK</Text>
        <Text style={styles.subtitle}>Le cockpit intelligent du courtier</Text>
      </View>

      {/* Login options */}
      <View style={styles.loginSection}>
        <TouchableOpacity
          onPress={handleGoogleLogin}
          disabled={!request || isLoading}
          activeOpacity={0.8}
          style={styles.googleButton}
        >
          <LinearGradient
            colors={['#FFFFFF', '#F3F4F6']}
            style={styles.googleButtonGradient}
          >
            {isLoading ? (
              <ActivityIndicator color="#050510" />
            ) : (
              <>
                <View style={styles.googleIcon}>
                  <Text style={styles.googleIconText}>G</Text>
                </View>
                <Text style={styles.googleButtonText}>Continuer avec Google</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>ou</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.emailButton}
        >
          <Mail color="rgba(255,255,255,0.7)" size={20} />
          <Text style={styles.emailButtonText}>Continuer avec email</Text>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.securityBadge}>
          <Shield color="#10B981" size={14} />
          <Text style={styles.securityText}>Connexion securisee SSL</Text>
        </View>
        <Text style={styles.terms}>
          En continuant, vous acceptez nos{' '}
          <Text style={styles.termsLink}>Conditions</Text> et{' '}
          <Text style={styles.termsLink}>Politique de confidentialite</Text>
        </Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  glowContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    opacity: 0.2,
  },
  glowViolet: {
    backgroundColor: '#8B5CF6',
    top: '10%',
    left: '-30%',
  },
  glowCyan: {
    backgroundColor: '#22D3EE',
    bottom: '30%',
    right: '-30%',
  },
  logoSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    color: '#FFFFFF',
    letterSpacing: 3,
    marginTop: 16,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 8,
  },
  loginSection: {
    paddingBottom: 40,
  },
  googleButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  googleButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  googleIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4285F4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  googleIconText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  googleButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#050510',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  dividerText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    marginHorizontal: 16,
  },
  emailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  emailButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginLeft: 12,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16,185,129,0.1)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginBottom: 16,
  },
  securityText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: '#10B981',
    marginLeft: 6,
  },
  terms: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    color: '#8B5CF6',
  },
});