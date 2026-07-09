import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontAwesome5 } from '@expo/vector-icons';
import { Colors, FontFamily, SharedStyles } from '../theme';
import { api } from '../config';
import Toast from '../components/Toast';
import { CameraView, useCameraPermissions } from 'expo-camera';
import {
  enrollFaceInDatabase,
  verifyFaceLogin,
  loadBiometricProfile,
} from '../utils/faceAuth';

const MAX_CAPTURE_ATTEMPTS = 10;
const CAPTURE_INTERVAL_MS = 1800;
const CAMERA_WARMUP_MS = 2000;

const LoginScreen = ({ navigation, route, onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState(route.params?.message || '');

  const [biometricUser, setBiometricUser] = useState(null);
  const [enrollModalVisible, setEnrollModalVisible] = useState(false);
  const [pendingUser, setPendingUser] = useState(null);

  const [scannerVisible, setScannerVisible] = useState(false);
  const [scanMode, setScanMode] = useState('enroll');
  const [scanStatus, setScanStatus] = useState('Initializing...');
  const [scanProgress, setScanProgress] = useState(0);
  const [faceDetected, setFaceDetected] = useState(false);

  const laserAnim = useRef(new Animated.Value(0)).current;
  const cameraRef = useRef(null);
  const scanProfileRef = useRef(null);
  const scanModeRef = useRef('enroll');
  const isProcessingRef = useRef(false);
  const captureAttemptRef = useRef(0);
  const captureTimerRef = useRef(null);
  const warmupTimerRef = useRef(null);

  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    refreshBiometricUser();
    return () => clearCaptureTimers();
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
  };

  const refreshBiometricUser = async () => {
    const profile = await loadBiometricProfile();
    setBiometricUser(profile);
  };

  const clearCaptureTimers = () => {
    if (captureTimerRef.current) {
      clearInterval(captureTimerRef.current);
      captureTimerRef.current = null;
    }
    if (warmupTimerRef.current) {
      clearTimeout(warmupTimerRef.current);
      warmupTimerRef.current = null;
    }
  };

  const startLaserAnimation = () => {
    laserAnim.setValue(0);
    Animated.loop(
      Animated.sequence([
        Animated.timing(laserAnim, { toValue: 240, duration: 1500, useNativeDriver: true }),
        Animated.timing(laserAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  };

  const resetScannerState = () => {
    clearCaptureTimers();
    isProcessingRef.current = false;
    captureAttemptRef.current = 0;
    setFaceDetected(false);
    setScanProgress(0);
    laserAnim.stopAnimation();
    laserAnim.setValue(0);
  };

  const closeCameraScanner = () => {
    setScannerVisible(false);
    resetScannerState();
    scanProfileRef.current = null;
  };

  const capturePhoto = async () => {
    if (!cameraRef.current) {
      throw new Error('Camera is not ready yet.');
    }

    const photo = await cameraRef.current.takePictureAsync({
      quality: 0.5,
      base64: true,
      skipProcessing: Platform.OS === 'android',
    });

    if (!photo?.base64) {
      throw new Error('Failed to capture face image.');
    }

    return photo.base64;
  };

  const processCapturedFace = useCallback(async (faceImageBase64) => {
    const profile = scanProfileRef.current;
    const mode = scanModeRef.current;

    if (mode === 'enroll') {
      await enrollFaceInDatabase(profile, faceImageBase64);
      await refreshBiometricUser();
      setScanStatus('Face registered successfully!');
      setScanProgress(1);
      showToast('Face enrolled and saved to database!', 'success');

      setTimeout(() => {
        closeCameraScanner();
        if (onLoginSuccess) onLoginSuccess(profile);
        setPendingUser(null);
      }, 700);
      return;
    }

    const user = await verifyFaceLogin(profile, faceImageBase64);
    setScanStatus('Face matched!');
    setScanProgress(1);
    showToast(`Welcome back, ${user.email}!`, 'success');

    setTimeout(() => {
      closeCameraScanner();
      if (onLoginSuccess) onLoginSuccess(user);
    }, 700);
  }, [onLoginSuccess]);

  const attemptFaceCapture = useCallback(async () => {
    if (isProcessingRef.current || !scanProfileRef.current) {
      return;
    }

    isProcessingRef.current = true;
    captureAttemptRef.current += 1;

    const attempt = captureAttemptRef.current;
    const progress = Math.min(0.85, attempt / MAX_CAPTURE_ATTEMPTS);
    setScanProgress(progress);
    setScanStatus(`Scanning face (attempt ${attempt}/${MAX_CAPTURE_ATTEMPTS})...`);

    try {
      const faceImageBase64 = await capturePhoto();
      setFaceDetected(true);
      setScanStatus('Face found — analyzing features...');
      setScanProgress(0.9);

      await processCapturedFace(faceImageBase64);
    } catch (error) {
      const message = error.message || 'Face scan failed.';
      const isNoFace = message.toLowerCase().includes('no face');
      const isMismatch = message.toLowerCase().includes('did not match');

      if (isMismatch) {
        closeCameraScanner();
        showToast(message, 'error');
        return;
      }

      if (isNoFace && attempt < MAX_CAPTURE_ATTEMPTS) {
        setFaceDetected(false);
        setScanStatus('No face detected — center your face and hold still');
        isProcessingRef.current = false;
        return;
      }

      if (attempt >= MAX_CAPTURE_ATTEMPTS) {
        closeCameraScanner();
        showToast(
          isNoFace
            ? 'Could not detect your face. Try better lighting and try again.'
            : message,
          'error'
        );

        if (scanModeRef.current === 'enroll' && pendingUser) {
          if (onLoginSuccess) onLoginSuccess(pendingUser);
          setPendingUser(null);
        }
        return;
      }

      setFaceDetected(false);
      setScanStatus(message);
      isProcessingRef.current = false;
    }
  }, [pendingUser, processCapturedFace]);

  const startCaptureLoop = useCallback(() => {
    clearCaptureTimers();
    captureAttemptRef.current = 0;
    setScanStatus('Position your face in the frame');
    setScanProgress(0.1);

    warmupTimerRef.current = setTimeout(() => {
      attemptFaceCapture();
      captureTimerRef.current = setInterval(attemptFaceCapture, CAPTURE_INTERVAL_MS);
    }, CAMERA_WARMUP_MS);
  }, [attemptFaceCapture]);

  const handleCameraReady = useCallback(() => {
    setScanStatus('Camera ready — align your face');
    startCaptureLoop();
  }, [startCaptureLoop]);

  const openCameraScanner = async (profile, mode) => {
    if (requestPermission) {
      const result = await requestPermission();
      if (!result?.granted) {
        showToast('Camera permission is required for Face Unlock.', 'error');
        if (mode === 'enroll' && pendingUser) {
          if (onLoginSuccess) onLoginSuccess(pendingUser);
          setPendingUser(null);
        }
        return;
      }
    }

    scanProfileRef.current = profile;
    scanModeRef.current = mode;
    setScanMode(mode);
    resetScannerState();
    setScanStatus('Opening camera...');
    setScannerVisible(true);
    startLaserAnimation();
  };

  const cancelCameraScanner = () => {
    closeCameraScanner();
    showToast('Face scan cancelled.', 'info');
    if (scanModeRef.current === 'enroll' && pendingUser) {
      if (onLoginSuccess) onLoginSuccess(pendingUser);
      setPendingUser(null);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const response = await fetch(api('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Login failed');

      await AsyncStorage.setItem('mindscale_user', JSON.stringify(data.user));

      const existingBio = await loadBiometricProfile();
      if (existingBio && existingBio.id === data.user.id) {
        if (onLoginSuccess) onLoginSuccess(data.user);
        return;
      }

      setPendingUser(data.user);
      setEnrollModalVisible(true);
    } catch (error) {
      setErrorMsg(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEnrollBiometric = async () => {
    if (!pendingUser) return;
    setEnrollModalVisible(false);
    await openCameraScanner(pendingUser, 'enroll');
  };

  const handleSkipEnrollment = () => {
    setEnrollModalVisible(false);
    if (pendingUser && onLoginSuccess) {
      onLoginSuccess(pendingUser);
      setPendingUser(null);
    }
  };

  const handleFaceUnlock = async () => {
    setErrorMsg('');
    setSuccessMsg('');

    if (!biometricUser?.biometric_enabled) {
      showToast('No Face Unlock profile found. Please sign in with password first.', 'error');
      return;
    }

    await openCameraScanner(biometricUser, 'unlock');
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const response = await fetch(api('/api/auth/demo'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Demo login failed');
      await AsyncStorage.setItem('mindscale_user', JSON.stringify(data.user));
      if (onLoginSuccess) onLoginSuccess(data.user);
    } catch (error) {
      setErrorMsg(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={SharedStyles.screenContainer}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.headerArea}>
          <View style={styles.logoBadge}>
            <FontAwesome5 name="brain" size={28} color={Colors.white} />
          </View>
          <Text style={styles.title}>MindScale</Text>
          <Text style={styles.subtitle}>Your AI Mental Wellness Companion</Text>
        </View>

        <View style={SharedStyles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Sign In</Text>
            {biometricUser && (
              <TouchableOpacity onPress={handleFaceUnlock} style={styles.faceUnlockBtn}>
                <FontAwesome5 name="smile-beam" size={18} color={Colors.primary} />
                <Text style={styles.faceUnlockBtnText}>Face Unlock</Text>
              </TouchableOpacity>
            )}
          </View>

          {errorMsg ? (
            <View style={styles.alertError}>
              <FontAwesome5 name="exclamation-circle" size={14} color={Colors.negative} />
              <Text style={styles.alertTextError}>{errorMsg}</Text>
            </View>
          ) : null}

          {successMsg ? (
            <View style={styles.alertSuccess}>
              <FontAwesome5 name="check-circle" size={14} color={Colors.positive} />
              <Text style={styles.alertTextSuccess}>{successMsg}</Text>
            </View>
          ) : null}

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Email Address</Text>
            <View style={styles.inputWrapper}>
              <FontAwesome5 name="envelope" size={16} color={Colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[SharedStyles.input, styles.textInputWithIcon]}
                placeholder="you@example.com"
                placeholderTextColor={Colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.inputWrapper}>
              <FontAwesome5 name="lock" size={16} color={Colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[SharedStyles.input, styles.textInputWithIcon, { paddingRight: 45 }]}
                placeholder="Enter password"
                placeholderTextColor={Colors.textMuted}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
                <FontAwesome5 name={showPassword ? 'eye-slash' : 'eye'} size={14} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={{ alignSelf: 'flex-end', marginBottom: 20 }}>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleLogin} disabled={loading}>
            <LinearGradient
              colors={[Colors.primary, '#7c3aed']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={SharedStyles.gradientBtn}
            >
              {loading ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <>
                  <Text style={styles.btnText}>Login</Text>
                  <FontAwesome5 name="sign-in-alt" size={14} color={Colors.white} />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.demoBtn} onPress={handleDemoLogin}>
            <Text style={styles.demoBtnText}>Sign In as Demo User</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
            <Text style={styles.footerLink}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal visible={enrollModalVisible} transparent animationType="fade" onRequestClose={handleSkipEnrollment}>
        <View style={styles.enrollOverlay}>
          <View style={[SharedStyles.card, styles.enrollCard]}>
            <View style={styles.enrollIconWrap}>
              <FontAwesome5 name="user-shield" size={28} color={Colors.primary} />
            </View>
            <Text style={styles.enrollTitle}>Enable Face Unlock?</Text>
            <Text style={styles.enrollDesc}>
              Your camera will capture your real face and save a secure facial profile to the database for quick sign-in.
            </Text>
            <TouchableOpacity onPress={handleEnrollBiometric} style={styles.enrollEnableBtn}>
              <LinearGradient
                colors={[Colors.primary, '#7c3aed']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[SharedStyles.gradientBtn, { paddingVertical: 12 }]}
              >
                <FontAwesome5 name="camera" size={16} color={Colors.white} />
                <Text style={styles.btnText}>Scan My Face</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSkipEnrollment} style={styles.enrollSkipBtn}>
              <Text style={styles.enrollSkipText}>Skip for now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={scannerVisible} animationType="slide" onRequestClose={cancelCameraScanner}>
        <View style={styles.cameraContainer}>
          <CameraView
            ref={cameraRef}
            style={styles.cameraPreview}
            facing="front"
            ratio={Platform.OS === 'android' ? '4:3' : undefined}
            onCameraReady={handleCameraReady}
          />

          <View style={styles.cameraOverlay}>
            <View style={styles.camTopBar}>
              <Text style={styles.camTitle}>
                {scanMode === 'enroll' ? 'Register Your Face' : 'Face Verification'}
              </Text>
              <TouchableOpacity onPress={cancelCameraScanner} style={styles.camCloseBtn}>
                <FontAwesome5 name="times" size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.camFrameContainer}>
              <View style={styles.camFrame}>
                <View style={[styles.camCorner, styles.camCornerTL]} />
                <View style={[styles.camCorner, styles.camCornerTR]} />
                <View style={[styles.camCorner, styles.camCornerBL]} />
                <View style={[styles.camCorner, styles.camCornerBR]} />
                <Animated.View style={[styles.camLaser, { transform: [{ translateY: laserAnim }] }]} />
              </View>

              {faceDetected && (
                <View style={styles.faceDetectedBadge}>
                  <FontAwesome5 name="check-circle" size={12} color={Colors.positive} />
                  <Text style={styles.faceDetectedText}>Face Detected</Text>
                </View>
              )}
            </View>

            <View style={styles.camBottomPanel}>
              <Text style={styles.camStatusText}>{scanStatus}</Text>
              <View style={styles.camProgressBg}>
                <View style={[styles.camProgressFill, { width: `${scanProgress * 100}%` }]} />
              </View>
              <Text style={styles.camHint}>
                {faceDetected ? 'Hold still while we verify...' : 'Look directly at the camera with good lighting'}
              </Text>
            </View>
          </View>
        </View>
      </Modal>

      <Toast
        visible={toast.show}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast({ ...toast, show: false })}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  headerArea: { alignItems: 'center', marginBottom: 32 },
  logoBadge: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  title: { fontSize: 32, fontFamily: FontFamily.bold, color: Colors.textPrimary },
  subtitle: { fontSize: 14, fontFamily: FontFamily.regular, color: Colors.textSecondary, marginTop: 4 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  cardTitle: { fontSize: 22, fontFamily: FontFamily.semibold, color: Colors.textPrimary },
  faceUnlockBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.primaryGlow, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10,
  },
  faceUnlockBtnText: {
    color: Colors.primary, fontFamily: FontFamily.bold, fontSize: 11,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  inputContainer: { marginBottom: 16 },
  inputLabel: { fontSize: 14, fontFamily: FontFamily.medium, color: Colors.textSecondary, marginBottom: 8 },
  inputWrapper: { position: 'relative', justifyContent: 'center' },
  inputIcon: { position: 'absolute', left: 16, zIndex: 10 },
  textInputWithIcon: { paddingLeft: 46 },
  eyeBtn: { position: 'absolute', right: 16, padding: 6 },
  forgotText: { color: Colors.primary, fontFamily: FontFamily.medium, fontSize: 13 },
  btnText: { color: Colors.white, fontFamily: FontFamily.bold, fontSize: 16 },
  demoBtn: { marginTop: 14, paddingVertical: 10, alignItems: 'center' },
  demoBtnText: {
    color: Colors.textSecondary, fontFamily: FontFamily.regular,
    fontSize: 13, textDecorationLine: 'underline',
  },
  alertError: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(244,63,94,0.08)', borderWidth: 1,
    borderColor: 'rgba(244,63,94,0.15)', padding: 12, borderRadius: 10, marginBottom: 16,
  },
  alertTextError: { color: Colors.negative, fontSize: 13, fontFamily: FontFamily.regular, flex: 1 },
  alertSuccess: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(16,185,129,0.08)', borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.15)', padding: 12, borderRadius: 10, marginBottom: 16,
  },
  alertTextSuccess: { color: Colors.positive, fontSize: 13, fontFamily: FontFamily.regular, flex: 1 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText: { color: Colors.textSecondary, fontFamily: FontFamily.regular, fontSize: 14 },
  footerLink: { color: Colors.primary, fontFamily: FontFamily.semibold, fontSize: 14 },
  enrollOverlay: {
    flex: 1, backgroundColor: 'rgba(15,23,42,0.5)',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  enrollCard: { width: '100%', maxWidth: 320, alignItems: 'center', padding: 28, borderRadius: 24 },
  enrollIconWrap: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primaryGlow,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  enrollTitle: { fontSize: 20, fontFamily: FontFamily.bold, color: Colors.textPrimary, marginBottom: 8 },
  enrollDesc: {
    fontSize: 13, fontFamily: FontFamily.regular, color: Colors.textSecondary,
    textAlign: 'center', lineHeight: 19, marginBottom: 20,
  },
  enrollEnableBtn: { width: '100%', marginBottom: 12 },
  enrollSkipBtn: { paddingVertical: 8 },
  enrollSkipText: { color: Colors.textMuted, fontFamily: FontFamily.medium, fontSize: 13 },
  cameraContainer: { flex: 1, backgroundColor: '#000' },
  cameraPreview: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  camTopBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 60, paddingHorizontal: 24, paddingBottom: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  camTitle: { fontSize: 18, fontFamily: FontFamily.bold, color: '#fff' },
  camCloseBtn: { padding: 8 },
  camFrameContainer: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  camFrame: {
    width: 260, height: 260, position: 'relative',
  },
  camCorner: {
    position: 'absolute', width: 40, height: 40,
    borderColor: Colors.primary, borderWidth: 3,
  },
  camCornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 16 },
  camCornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 16 },
  camCornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 16 },
  camCornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 16 },
  camLaser: {
    position: 'absolute', left: 8, right: 8, top: 10, height: 3,
    backgroundColor: Colors.primary, borderRadius: 2,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9, shadowRadius: 8,
  },
  faceDetectedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(16,185,129,0.2)', paddingVertical: 6,
    paddingHorizontal: 14, borderRadius: 20, marginTop: 16,
  },
  faceDetectedText: { color: Colors.positive, fontFamily: FontFamily.semibold, fontSize: 13 },
  camBottomPanel: {
    backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 24,
    paddingVertical: 28, paddingBottom: 48, alignItems: 'center',
  },
  camStatusText: { fontSize: 16, fontFamily: FontFamily.semibold, color: '#fff', marginBottom: 14 },
  camProgressBg: {
    width: '100%', height: 6, backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 3, overflow: 'hidden', marginBottom: 12,
  },
  camProgressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 3 },
  camHint: { fontSize: 13, fontFamily: FontFamily.regular, color: 'rgba(255,255,255,0.6)' },
});

export default LoginScreen;
