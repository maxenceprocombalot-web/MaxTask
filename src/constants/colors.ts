// Palette de couleurs — design Linear/Notion sombre premium
export const Colors = {
  background: '#080a0e',
  surface: '#0f1117',
  surfaceElevated: '#141720',
  accent: '#7c6dfa',
  accentLight: 'rgba(124, 109, 250, 0.15)',
  accentMedium: 'rgba(124, 109, 250, 0.3)',
  success: '#22c97a',
  successLight: 'rgba(34, 201, 122, 0.15)',
  danger: '#e8445a',
  dangerLight: 'rgba(232, 68, 90, 0.15)',
  orange: '#f07830',
  orangeLight: 'rgba(240, 120, 48, 0.15)',
  textPrimary: '#f0f2fa',
  textSecondary: '#565d7a',
  textMuted: '#3a4060',
  cardBorder: 'rgba(255, 255, 255, 0.05)',
  cardBorderActive: 'rgba(124, 109, 250, 0.3)',
  separator: 'rgba(255, 255, 255, 0.06)',
  overlay: 'rgba(0, 0, 0, 0.7)',
  white: '#ffffff',
  transparent: 'transparent',
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
