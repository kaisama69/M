import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Switch,
  ScrollView,
  Platform,
} from 'react-native';
import { Audio } from 'expo-av';
import { FontAwesome5 } from '@expo/vector-icons';
import { Colors, FontFamily, SharedStyles } from '../theme';
import Header from '../components/Header';

const BREATH_MODES = {
  relax: {
    name: '4-7-8 Relaxing Breath',
    desc: 'Deep relaxation and stress reduction. Helps with anxiety and sleep.',
    steps: [
      { action: 'Inhale', duration: 4, color: Colors.positive, scale: 1.5 },
      { action: 'Hold', duration: 7, color: Colors.primary, scale: 1.5 },
      { action: 'Exhale', duration: 8, color: Colors.neutral, scale: 1.0 },
    ],
  },
  box: {
    name: '4-4-4-4 Box Breathing',
    desc: 'Used by Navy SEALs to reset focus, reduce panic, and maintain calm under pressure.',
    steps: [
      { action: 'Inhale', duration: 4, color: Colors.positive, scale: 1.5 },
      { action: 'Hold', duration: 4, color: Colors.primary, scale: 1.5 },
      { action: 'Exhale', duration: 4, color: Colors.neutral, scale: 1.0 },
      { action: 'Hold Empty', duration: 4, color: Colors.textMuted, scale: 1.0 },
    ],
  },
  equal: {
    name: '5-5 Balanced Breath',
    desc: 'Coherent breathing to balance the autonomic nervous system and synchronize heart rhythm.',
    steps: [
      { action: 'Inhale', duration: 5, color: Colors.positive, scale: 1.5 },
      { action: 'Exhale', duration: 5, color: Colors.neutral, scale: 1.0 },
    ],
  },
};

const BreathingScreen = () => {
  const [modeKey, setModeKey] = useState('relax');
  const [isActive, setIsActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(BREATH_MODES['relax'].steps[0].duration);
  const [cycleCount, setCycleCount] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(false);

  const currentMode = BREATH_MODES[modeKey];
  const currentStep = currentMode.steps[stepIndex];

  // Animation values
  const scaleAnim = useRef(new Animated.Value(1.0)).current;
  const timerRef = useRef(null);

  // Use refs for values accessed in the timer callback to avoid stale closures
  const isActiveRef = useRef(isActive);
  const stepIndexRef = useRef(stepIndex);
  const modeKeyRef = useRef(modeKey);
  const soundEnabledRef = useRef(soundEnabled);

  // Keep refs in sync with state
  useEffect(() => { isActiveRef.current = isActive; }, [isActive]);
  useEffect(() => { stepIndexRef.current = stepIndex; }, [stepIndex]);
  useEffect(() => { modeKeyRef.current = modeKey; }, [modeKey]);
  useEffect(() => { soundEnabledRef.current = soundEnabled; }, [soundEnabled]);

  // Sound object ref
  const soundRef = useRef(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
      }
    };
  }, []);

  // Play a soft chime when a new step starts
  const playSound = useCallback(async () => {
    if (!soundEnabledRef.current) return;
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      const { sound } = await Audio.Sound.createAsync(
        { uri: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-84.wav' },
        { shouldPlay: true, volume: 0.3 }
      );
      soundRef.current = sound;
    } catch (e) {
      console.log('Error playing breath sound chime', e);
    }
  }, []);

  // Pulse the circle animation
  const runAnimation = useCallback((targetScale, durationSec) => {
    Animated.timing(scaleAnim, {
      toValue: targetScale,
      duration: durationSec * 1000,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [scaleAnim]);

  // Start a new step: kick off animation + sound + countdown
  const startStep = useCallback((mode, sIdx) => {
    const step = BREATH_MODES[mode].steps[sIdx];
    setTimeLeft(step.duration);
    runAnimation(step.scale, step.duration);
    playSound();

    // Clear previous interval
    if (timerRef.current) clearInterval(timerRef.current);

    let remaining = step.duration;

    timerRef.current = setInterval(() => {
      remaining -= 1;

      if (remaining <= 0) {
        clearInterval(timerRef.current);
        timerRef.current = null;

        // Advance to the next step
        const curMode = BREATH_MODES[modeKeyRef.current];
        const nextIdx = (stepIndexRef.current + 1) % curMode.steps.length;

        if (nextIdx === 0) {
          setCycleCount((c) => c + 1);
        }

        setStepIndex(nextIdx);
        // We don't call startStep here — the useEffect on [stepIndex, isActive]
        // will handle it below
      } else {
        setTimeLeft(remaining);
      }
    }, 1000);
  }, [runAnimation, playSound]);

  // When the session is started/paused or the step changes, manage the timer
  useEffect(() => {
    if (isActive) {
      startStep(modeKey, stepIndex);
    } else {
      // Paused
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      scaleAnim.stopAnimation();
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
    // We intentionally only trigger on isActive + stepIndex changes.
    // modeKey changes are handled via handleModeChange which resets everything.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, stepIndex]);

  const handleModeChange = (key) => {
    // Stop everything and reset
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsActive(false);
    setModeKey(key);
    setStepIndex(0);
    setTimeLeft(BREATH_MODES[key].steps[0].duration);
    setCycleCount(0);
    scaleAnim.setValue(1.0);
  };

  const toggleActive = () => {
    if (!isActive) {
      // Starting fresh if timer already ran out
      setIsActive(true);
    } else {
      setIsActive(false);
    }
  };

  const handleReset = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsActive(false);
    setStepIndex(0);
    setTimeLeft(currentMode.steps[0].duration);
    setCycleCount(0);
    scaleAnim.setValue(1.0);
  };

  return (
    <View style={SharedStyles.screenContainer}>
      <ScrollView contentContainerStyle={SharedStyles.screenScroll} keyboardShouldPersistTaps="handled">
        <Header title="Breathing Room" subtitle="Slow down, release stress, and center yourself" />

        {/* Bubble container */}
        <View style={[SharedStyles.card, styles.bubbleContainer]}>
          {/* Animated Glow and Bubble */}
          <View style={styles.bubbleArea}>
            {/* Pulsing ring */}
            <Animated.View
              style={[
                styles.pulsingRing,
                {
                  transform: [{ scale: scaleAnim }],
                  backgroundColor: `${currentStep.color}10`,
                  borderColor: `${currentStep.color}35`,
                },
              ]}
            />

            {/* Inner center bubble */}
            <Animated.View
              style={[
                styles.bubble,
                {
                  transform: [{ scale: scaleAnim }],
                  borderColor: currentStep.color,
                  backgroundColor: `${currentStep.color}25`,
                },
              ]}
            >
              <Text style={[styles.actionText, { color: currentStep.color }]}>
                {currentStep.action}
              </Text>
              <Text style={styles.timerText}>{timeLeft}s</Text>
            </Animated.View>
          </View>

          {/* Description */}
          <Text style={styles.instructionText}>
            {isActive
              ? `Focus on the rhythm. ${currentStep.action} for ${timeLeft} more seconds.`
              : "Tap Begin Session to start your guided practice."}
          </Text>

          {/* Controls button row */}
          <View style={styles.btnRow}>
            <TouchableOpacity
              onPress={toggleActive}
              style={[styles.primaryBtn, isActive && styles.pausedBtn]}
            >
              <FontAwesome5 name={isActive ? 'pause' : 'play'} size={14} color={Colors.white} />
              <Text style={styles.btnText}>{isActive ? 'Pause' : 'Begin Session'}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleReset} style={styles.resetBtn}>
              <Text style={styles.resetBtnText}>Reset</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Settings Controls */}
        <View style={[SharedStyles.card, styles.settingsCard]}>
          <Text style={styles.sectionTitle}>
            <FontAwesome5 name="sliders-h" size={14} color={Colors.primary} style={{ marginRight: 8 }} />
            Session Controls
          </Text>

          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>Audio Chime Guides</Text>
            <Switch
              value={soundEnabled}
              onValueChange={setSoundEnabled}
              trackColor={{ false: Colors.overlayMedium, true: Colors.primary }}
              thumbColor={Colors.white}
            />
          </View>

          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>Completed Cycles</Text>
            <Text style={styles.cyclesVal}>{cycleCount}</Text>
          </View>
        </View>

        {/* Breathing Techniques Modes */}
        <View style={[SharedStyles.card, { marginTop: 10 }]}>
          <Text style={styles.sectionTitle}>
            <FontAwesome5 name="wind" size={14} color={Colors.neutral} style={{ marginRight: 8 }} />
            Breathing Techniques
          </Text>

          <View style={styles.modesContainer}>
            {Object.entries(BREATH_MODES).map(([key, mode]) => {
              const isSelected = modeKey === key;
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => handleModeChange(key)}
                  style={[styles.modeItem, isSelected && styles.modeItemActive]}
                >
                  <Text style={[styles.modeName, isSelected && { color: Colors.primary }]}>
                    {mode.name}
                  </Text>
                  <Text style={styles.modeDesc}>{mode.desc}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  bubbleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    marginBottom: 20,
    minHeight: 400,
  },
  bubbleArea: {
    width: 250,
    height: 250,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 24,
  },
  pulsingRing: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1,
  },
  bubble: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 16,
    fontFamily: FontFamily.bold,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  timerText: {
    fontSize: 32,
    fontFamily: FontFamily.extrabold,
    color: Colors.textPrimary,
    marginTop: 4,
  },
  instructionText: {
    fontSize: 14,
    fontFamily: FontFamily.regular,
    color: Colors.textSecondary,
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 20,
    marginBottom: 24,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  primaryBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pausedBtn: {
    backgroundColor: Colors.overlayMedium,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  btnText: {
    color: Colors.white,
    fontFamily: FontFamily.bold,
    fontSize: 15,
  },
  resetBtn: {
    backgroundColor: Colors.overlayLight,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  resetBtnText: {
    color: Colors.textSecondary,
    fontFamily: FontFamily.medium,
    fontSize: 15,
  },
  settingsCard: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: FontFamily.semibold,
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  controlLabel: {
    fontSize: 14,
    fontFamily: FontFamily.medium,
    color: Colors.textSecondary,
  },
  cyclesVal: {
    fontSize: 16,
    fontFamily: FontFamily.bold,
    color: Colors.textPrimary,
  },
  modesContainer: {
    gap: 10,
  },
  modeItem: {
    backgroundColor: Colors.bgDark,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 14,
    borderRadius: 12,
  },
  modeItemActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(139,92,246,0.05)',
  },
  modeName: {
    fontSize: 14,
    fontFamily: FontFamily.bold,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  modeDesc: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
    color: Colors.textMuted,
    lineHeight: 16,
  },
});

export default BreathingScreen;
