/**
 * MindScale Mobile — API Configuration
 *
 * In development the Flask backend runs on your local machine.
 * Expo Go on a physical phone cannot reach "localhost", so we
 * resolve the dev-machine IP from Expo's manifest.
 *
 * For production, replace API_BASE_URL with your deployed server URL.
 */

import Constants from 'expo-constants';

// Try multiple methods to find the dev server's IP address
const getDevServerIp = () => {
  // Method 1: expoConfig.hostUri (Expo SDK 49+)
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    return hostUri.split(':')[0];
  }

  // Method 2: manifest2 (newer Expo)
  const manifest2Host = Constants.manifest2?.extra?.expoGo?.debuggerHost;
  if (manifest2Host) {
    return manifest2Host.split(':')[0];
  }

  // Method 3: legacy manifest (Expo SDK < 49)
  const legacyHost = Constants.manifest?.debuggerHost || Constants.manifest?.hostUri;
  if (legacyHost) {
    return legacyHost.split(':')[0];
  }

  // Fallback to localhost (works on emulators / web)
  return '127.0.0.1';
};

const localIp = getDevServerIp();

// Flask backend port
const FLASK_PORT = 5000;

export const API_BASE_URL = `http://${localIp}:${FLASK_PORT}`;

/**
 * Helper – prepend the base URL to a relative path.
 * Usage:  fetch(api('/api/analyze'), { ... })
 */
export const api = (path) => `${API_BASE_URL}${path}`;

// Log the resolved API URL for debugging
console.log(`[MindScale] API_BASE_URL resolved to: ${API_BASE_URL}`);
