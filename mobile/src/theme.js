/**
 * MindScale Mobile — Design Tokens & Theme
 *
 * A clean, vibrant, and lively light-mode theme with high-contrast slate text,
 * playful indigo primaries, and rich pastel-glow card structures.
 */

import { StyleSheet, Platform } from 'react-native';

/* ─── Color Palette ─────────────────────────────────────────── */
export const Colors = {
  bgDark:        '#f8fafc', // Crisp slate background
  bgCard:        '#ffffff', // Pure white card
  bgCardSolid:   '#ffffff', 
  cardBorder:    'rgba(99,102,241,0.08)', // Delicate warm border

  textPrimary:   '#0f172a', // Deep slate 900
  textSecondary: '#475569', // Slate 600
  textMuted:     '#94a3b8', // Slate 400

  primary:       '#6366f1', // Vibrant Indigo
  primaryGlow:   'rgba(99,102,241,0.12)',

  positive:      '#10b981', // Vibrant Mint
  positiveGlow:  'rgba(16,185,129,0.12)',

  negative:      '#f43f5e', // Vibrant Rose
  negativeGlow:  'rgba(244,63,94,0.12)',

  neutral:       '#0ea5e9', // Vibrant Sky Blue
  neutralGlow:   'rgba(14,165,233,0.12)',

  // Sentiment Badges & Specific Elements
  indigo:        '#4f46e5',
  amber:         '#f59e0b',
  orange:        '#f97316',
  pink:          '#ec4899',

  white:         '#ffffff',
  black:         '#000000',
  transparent:   'transparent',

  // UI Overlays for Light Theme
  overlayLight:  'rgba(15,23,42,0.03)',
  overlayMedium: 'rgba(15,23,42,0.06)',
};

/* ─── Sentiment Class Metadata ──────────────────────────────── */
export const CLASS_META = {
  Normal:                { color: Colors.positive, icon: 'smile',           label: 'Normal' },
  Depression:            { color: Colors.indigo,   icon: 'cloud-rain',      label: 'Depression' },
  Anxiety:               { color: Colors.amber,    icon: 'heartbeat',       label: 'Anxiety' },
  Suicidal:              { color: Colors.negative,  icon: 'phone',           label: 'Suicidal' },
  Stress:                { color: Colors.orange,   icon: 'fire',            label: 'Stress' },
  Bipolar:               { color: Colors.primary,  icon: 'arrows-alt-v',    label: 'Bipolar' },
  'Personality disorder':{ color: Colors.pink,     icon: 'puzzle-piece',    label: 'Personality Disorder' },
};

/* ─── Font Family ───────────────────────────────────────────── */
export const FontFamily = {
  regular:   'Outfit_400Regular',
  medium:    'Outfit_500Medium',
  semibold:  'Outfit_600SemiBold',
  bold:      'Outfit_700Bold',
  extrabold: 'Outfit_800ExtraBold',
};

/* ─── Shared Card / Container Styles ────────────────────────── */
export const SharedStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 20,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#6366f1',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: { elevation: 3 },
      web: {
        shadowColor: '#6366f1',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      }
    }),
  },
  cardSolid: {
    backgroundColor: Colors.bgCardSolid,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 20,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#6366f1',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: { elevation: 3 },
      web: {
        shadowColor: '#6366f1',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      }
    }),
  },
  gradientBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  input: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: Colors.textPrimary,
    fontSize: 16,
    fontFamily: 'Outfit_400Regular',
  },
  screenContainer: {
    flex: 1,
    backgroundColor: Colors.bgDark,
  },
  screenScroll: {
    padding: 20,
    paddingBottom: 100,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
});

/* ─── Spacing ───────────────────────────────────────────────── */
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};
