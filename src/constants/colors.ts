// Palette — design ZOEY HUD (ADR OS), thème Nébuleuse : violet profond, cyan vivant, verre bleuté
import { Platform } from 'react-native';

export const Colors = {
  background: '#07090f',
  surface: '#0b0e16',
  surfaceElevated: '#11151f',
  accent: '#7c3aed',
  accentLight: 'rgba(124, 58, 237, 0.15)',
  accentMedium: 'rgba(124, 58, 237, 0.32)',
  cyan: '#22d3ee',
  cyanLight: 'rgba(34, 211, 238, 0.14)',
  success: '#34d399',
  successLight: 'rgba(52, 211, 153, 0.15)',
  danger: '#fb7185',
  dangerLight: 'rgba(251, 113, 133, 0.15)',
  orange: '#f59e0b',
  orangeLight: 'rgba(245, 158, 11, 0.15)',
  textPrimary: '#eef2f8',
  textSecondary: 'rgba(238, 242, 248, 0.60)',
  textMuted: 'rgba(238, 242, 248, 0.38)',
  cardBorder: 'rgba(255, 255, 255, 0.07)',
  cardBorderActive: 'rgba(124, 58, 237, 0.42)',
  separator: 'rgba(255, 255, 255, 0.07)',
  overlay: 'rgba(3, 5, 12, 0.72)',
  glow: 'rgba(124, 58, 237, 0.18)',
  white: '#ffffff',
  transparent: 'transparent',
} as const;

// Typo signalétique HUD : mono pour l'identité (titres, labels, chiffres), sans pour le contenu
export const Fonts = {
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: "'JetBrains Mono', 'SF Mono', ui-monospace, monospace" }),
} as const;

// Style de label HUD réutilisable (uppercase mono espacé, façon ADR OS)
export const HudLabel = {
  fontFamily: Fonts.mono,
  textTransform: 'uppercase' as const,
  letterSpacing: 1.2,
} as const;

export const PriorityColors = {
  high: Colors.danger,
  normal: Colors.orange,
  low: Colors.accent,
} as const;

export const EnergyColors = {
  high: Colors.success,
  medium: Colors.orange,
  low: Colors.textSecondary,
} as const;
