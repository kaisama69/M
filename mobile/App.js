import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, TouchableOpacity, Text, SafeAreaView, Platform, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts, Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold, Outfit_800ExtraBold } from '@expo-google-fonts/outfit';
import { FontAwesome5 } from '@expo/vector-icons';

import AppNavigator from './src/navigation/AppNavigator';
import SoundscapePlayer from './src/components/SoundscapePlayer';
import { Colors, FontFamily } from './src/theme';

// ─── Inject global CSS on web to style the outer page ─────────────────
if (Platform.OS === 'web') {
  const globalCSS = document.createElement('style');
  globalCSS.textContent = `
    html, body, #root {
      margin: 0;
      padding: 0;
      height: 100%;
      background: #f0f2f5;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    /* Subtle radial glow behind the phone */
    body::before {
      content: '';
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 500px;
      height: 500px;
      background: radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%);
      pointer-events: none;
      z-index: 0;
    }
  `;
  document.head.appendChild(globalCSS);
}

// Phone frame dimensions (iPhone 14 Pro-like)
const PHONE_WIDTH = 393;
const PHONE_HEIGHT = 852;

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Load premium Outfit font family
  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Outfit_800ExtraBold,
  });

  useEffect(() => {
    checkUserSession();
  }, []);

  const checkUserSession = async () => {
    try {
      const storedUser = await AsyncStorage.getItem('mindscale_user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (e) {
      console.log('Error checking user session', e);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLoginSuccess = (userData) => {
    setUser(userData);
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('mindscale_user');
      setUser(null);
    } catch (e) {
      console.log('Error logging out', e);
    }
  };

  // If fonts are loading or session checking is incomplete, display spinner
  if (!fontsLoaded || authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // The actual app content
  const appContent = (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" backgroundColor={Colors.bgDark} />
      
      {/* Top Header Row for logged in users */}
      {user && (
        <View style={styles.topBar}>
          <View style={styles.logoRow}>
            <FontAwesome5 name="brain" size={20} color={Colors.primary} />
            <Text style={styles.logoText}>MindScale</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn} title="Sign Out">
            <FontAwesome5 name="sign-out-alt" size={14} color={Colors.textSecondary} />
            <Text style={styles.logoutBtnText}>Logout</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Global Ambient Soundscape Player widget (at top of dashboard when logged in) */}
      {user && (
        <View style={styles.playerWrapper}>
          <SoundscapePlayer />
        </View>
      )}

      {/* Navigation Container */}
      <View style={styles.navWrapper}>
        <NavigationContainer>
          <AppNavigator
            user={user}
            onLoginSuccess={handleLoginSuccess}
            onLogout={handleLogout}
          />
        </NavigationContainer>
      </View>
    </SafeAreaView>
  );

  // On web, wrap inside a phone-shaped container
  if (Platform.OS === 'web') {
    return (
      <View style={styles.webOuterWrapper}>
        {/* Phone label */}
        <Text style={styles.webDeviceLabel}>
          <FontAwesome5 name="mobile-alt" size={14} color={Colors.textMuted} />
          {'  '}MindScale — Mobile Preview
        </Text>

        {/* Phone frame */}
        <View style={styles.phoneFrame}>
          {/* Notch / Dynamic Island */}
          <View style={styles.dynamicIsland} />

          {/* App content inside the phone */}
          <View style={styles.phoneScreen}>
            {appContent}
          </View>

          {/* Bottom home indicator */}
          <View style={styles.homeIndicatorBar}>
            <View style={styles.homeIndicator} />
          </View>
        </View>
      </View>
    );
  }

  // On native, render normally
  return appContent;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgDark,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.bgDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
    backgroundColor: Colors.bgDark,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoText: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.bold,
    fontSize: 18,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.overlayLight,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  logoutBtnText: {
    color: Colors.textSecondary,
    fontFamily: FontFamily.medium,
    fontSize: 12,
  },
  playerWrapper: {
    paddingHorizontal: 20,
    backgroundColor: Colors.bgDark,
  },
  navWrapper: {
    flex: 1,
  },

  /* ─── Web Phone Frame Styles ───────────────────────────── */
  webOuterWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    zIndex: 1,
  },
  webDeviceLabel: {
    color: Colors.textMuted,
    fontFamily: FontFamily.medium,
    fontSize: 13,
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  phoneFrame: {
    width: PHONE_WIDTH,
    height: PHONE_HEIGHT,
    borderRadius: 48,
    borderWidth: 10,
    borderColor: '#0f172a',
    backgroundColor: Colors.bgDark,
    overflow: 'hidden',
    position: 'relative',
    // Shadow glow
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 30,
  },
  dynamicIsland: {
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
    width: 120,
    height: 34,
    borderRadius: 20,
    backgroundColor: '#000',
    zIndex: 100,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    left: (PHONE_WIDTH - 120) / 2 - 3,  // center accounting for border
  },
  phoneScreen: {
    flex: 1,
    marginTop: 0,
    overflow: 'hidden',
    borderRadius: 45,
  },
  homeIndicatorBar: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
  },
  homeIndicator: {
    width: 134,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
});
