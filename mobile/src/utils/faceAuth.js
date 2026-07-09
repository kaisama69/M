/**
 * Face Unlock API helpers — enroll and verify real face data on the backend.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../config';

/**
 * Register a captured face image for the given user profile.
 * @param {object} profile — { id, email }
 * @param {string} faceImageBase64 — base64 JPEG from camera (no data-uri prefix required)
 * @returns {Promise<boolean>}
 */
export async function enrollFaceInDatabase(profile, faceImageBase64) {
  const response = await fetch(api('/api/auth/face-enroll'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: profile.id,
      face_image: faceImageBase64,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to register face in database.');
  }

  const bioProfile = { ...profile, biometric_enabled: true };
  await AsyncStorage.setItem('mindscale_biometric_user', JSON.stringify(bioProfile));
  return true;
}

/**
 * Verify a live face capture against the enrolled face stored on the server.
 * @param {object} profile — { id, email }
 * @param {string} faceImageBase64
 * @returns {Promise<object>} authenticated user object from server
 */
export async function verifyFaceLogin(profile, faceImageBase64) {
  const response = await fetch(api('/api/auth/face-verify'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: profile.email,
      face_image: faceImageBase64,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Face verification failed.');
  }

  await AsyncStorage.setItem('mindscale_user', JSON.stringify(data.user));
  return data.user;
}

export async function loadBiometricProfile() {
  try {
    const userStr = await AsyncStorage.getItem('mindscale_biometric_user');
    if (!userStr) return null;

    const user = JSON.parse(userStr);
    return user.biometric_enabled ? user : null;
  } catch {
    return null;
  }
}
