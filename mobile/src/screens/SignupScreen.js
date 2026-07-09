import React, { useState } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5 } from '@expo/vector-icons';
import { Colors, FontFamily, SharedStyles } from '../theme';
import { api } from '../config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SignupScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [mockCode, setMockCode] = useState('');

  // Password rules checks
  const hasMinLen = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const handleSendCode = async () => {
    if (!email) {
      setErrorMsg('Please enter your email.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    setMockCode('');

    try {
      const response = await fetch(api('/api/auth/send-code'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send verification code');
      }

      setCodeSent(true);
      setSuccessMsg(data.message);

      if (data.is_mocked && data.mock_code) {
        setMockCode(data.mock_code);
        setCode(data.mock_code); // Auto-fill mock code for smoother developer/user testing
      }
    } catch (error) {
      setErrorMsg(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!email || !password || !code) {
      setErrorMsg('Please fill in all fields.');
      return;
    }

    if (!hasMinLen || !hasUpper || !hasLower || !hasDigit || !hasSpecial) {
      setErrorMsg('Password does not meet all criteria.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const response = await fetch(api('/api/auth/signup'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, code }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      if (data.user) {
        await AsyncStorage.setItem('mindscale_last_user', JSON.stringify(data.user));
      }

      navigation.navigate('Login', { message: 'Registration successful! You can now sign in.' });
    } catch (error) {
      setErrorMsg(error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderRequirement = (isChecked, text) => (
    <View style={styles.reqItem}>
      <FontAwesome5
        name={isChecked ? 'check-circle' : 'times-circle'}
        size={13}
        color={isChecked ? Colors.positive : Colors.textMuted}
      />
      <Text style={[styles.reqText, isChecked && styles.reqTextActive]}>{text}</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={SharedStyles.screenContainer}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.headerArea}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Begin your wellness journey today</Text>
        </View>

        <View style={SharedStyles.card}>
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

          {/* Email Block */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Email Address</Text>
            <View style={styles.inputWrapper}>
              <FontAwesome5 name="envelope" size={16} color={Colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[SharedStyles.input, styles.textInputWithIcon, codeSent && styles.inputDisabled]}
                placeholder="you@example.com"
                placeholderTextColor={Colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!codeSent}
                value={email}
                onChangeText={setEmail}
              />
            </View>
          </View>

          {/* Send Verification Code / Action Button */}
          {!codeSent ? (
            <TouchableOpacity onPress={handleSendCode} disabled={loading} style={{ marginBottom: 12 }}>
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
                    <Text style={styles.btnText}>Send Verification Code</Text>
                    <FontAwesome5 name="paper-plane" size={14} color={Colors.white} />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <>
              {/* Code Verification Block */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Verification Code</Text>
                <View style={styles.inputWrapper}>
                  <FontAwesome5 name="key" size={16} color={Colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={[SharedStyles.input, styles.textInputWithIcon]}
                    placeholder="Enter code"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="number-pad"
                    value={code}
                    onChangeText={setCode}
                  />
                </View>
                {mockCode ? (
                  <Text style={styles.mockCodeText}>
                    Mock Code (Local Testing): <Text style={{ fontWeight: 'bold', color: Colors.primary }}>{mockCode}</Text>
                  </Text>
                ) : null}
              </View>

              {/* Password Block */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Choose Password</Text>
                <View style={styles.inputWrapper}>
                  <FontAwesome5 name="lock" size={16} color={Colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={[SharedStyles.input, styles.textInputWithIcon, { paddingRight: 45 }]}
                    placeholder="At least 8 characters"
                    placeholderTextColor={Colors.textMuted}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    value={password}
                    onChangeText={setPassword}
                  />
                  <TouchableOpacity
                    style={styles.eyeBtn}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <FontAwesome5 name={showPassword ? 'eye-slash' : 'eye'} size={14} color={Colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Pass requirements checklist */}
              <View style={styles.reqContainer}>
                {renderRequirement(hasMinLen, 'At least 8 characters')}
                {renderRequirement(hasUpper, 'Contains uppercase letter')}
                {renderRequirement(hasLower, 'Contains lowercase letter')}
                {renderRequirement(hasDigit, 'Contains a number')}
                {renderRequirement(hasSpecial, 'Contains a special character (!@#$%^&*)')}
              </View>

              {/* Final Register Button */}
              <TouchableOpacity onPress={handleSignup} disabled={loading}>
                <LinearGradient
                  colors={[Colors.positive, '#059669']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={SharedStyles.gradientBtn}
                >
                  {loading ? (
                    <ActivityIndicator color={Colors.white} size="small" />
                  ) : (
                    <>
                      <Text style={styles.btnText}>Complete Sign Up</Text>
                      <FontAwesome5 name="user-plus" size={14} color={Colors.white} />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity style={styles.resetBtn} onPress={() => { setCodeSent(false); setMockCode(''); setCode(''); }}>
                <Text style={styles.resetBtnText}>Change Email</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.footerLink}>Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  headerArea: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontFamily: FontFamily.bold,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: FontFamily.regular,
    color: Colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: FontFamily.medium,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  inputWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
  },
  textInputWithIcon: {
    paddingLeft: 46,
  },
  inputDisabled: {
    backgroundColor: Colors.overlayLight,
    color: Colors.textMuted,
  },
  eyeBtn: {
    position: 'absolute',
    right: 16,
    padding: 6,
  },
  btnText: {
    color: Colors.white,
    fontFamily: FontFamily.bold,
    fontSize: 16,
  },
  resetBtn: {
    marginTop: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  resetBtnText: {
    color: Colors.textSecondary,
    fontFamily: FontFamily.regular,
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  alertError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  alertTextError: {
    color: Colors.negative,
    fontSize: 13,
    fontFamily: FontFamily.regular,
    flex: 1,
  },
  alertSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.2)',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  alertTextSuccess: {
    color: Colors.positive,
    fontSize: 13,
    fontFamily: FontFamily.regular,
    flex: 1,
  },
  mockCodeText: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 6,
    fontFamily: FontFamily.regular,
  },
  reqContainer: {
    marginBottom: 20,
    backgroundColor: Colors.bgDark,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  reqItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  reqText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: FontFamily.regular,
  },
  reqTextActive: {
    color: Colors.textPrimary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    color: Colors.textSecondary,
    fontFamily: FontFamily.regular,
    fontSize: 14,
  },
  footerLink: {
    color: Colors.primary,
    fontFamily: FontFamily.semibold,
    fontSize: 14,
  },
});

export default SignupScreen;
