/**
 * Peach & Pine Theme
 * Centralized color system for the Reperoo app
 */

// Core color palette
export const colors = {
  // Primary colors
  background: '#FAF5EF',
  surface: '#FFFFFF',

  // Pine (Primary action color)
  primary: '#1F8A5B',
  primaryDark: '#156A45',

  // Accent colors
  peach: '#F4A261',
  gold: '#E9C46A',

  // Text colors
  text: '#1F2937',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  textLight: '#FFFFFF',

  // Border colors
  border: '#E8DED3',
  borderLight: '#F0EAE2',

  // Semantic colors
  success: '#1F8A5B',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',

  // Legacy support
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

// Shared palette for UI states and component-specific accents
export const palette = {
  // Base
  white: '#FFFFFF',
  black: '#000000',

  // Ink/Slate
  slate950: '#030712',
  slate940: '#050814',
  slate930: '#041019',
  slate920: '#04160c',
  slate910: '#0B1222',
  slate905: '#0B1525',
  slate900: '#0F172A',
  slate880: '#111B2F',
  slate870: '#1F2933',
  slate800: '#1F2937',
  slate700: '#334155',
  slate600: '#475569',
  slate500: '#64748B',
  slate400: '#94A3B8',
  slate300: '#CBD5E1',
  slate280: '#CDD1D7',
  slate270: '#D0DAE5',
  slate260: '#D1D5DB',
  slate250: '#D4D4D8',
  slate240: '#D6D3CE',
  slate230: '#E2E8F0',
  slate220: '#E5E7EB',
  slate210: '#F1F5F9',
  slate205: '#F2F2F7',
  slate200: '#F3F4F6',
  slate190: '#F8FAFC',
  slate180: '#F9FAFB',
  slate170: '#FAFAFA',
  slate160: '#FBFBF7',
  slate150: '#FDFDFC',

  // Gray
  gray900: '#111827',
  gray700: '#374151',
  gray600: '#4B5563',
  gray500: '#6B7280',
  gray450: '#666666',
  gray400: '#9CA3AF',
  gray350: '#CCCCCC',

  // Sand/Beige
  sand200: '#EDE7DC',
  sand180: '#F3EDE1',
  sand170: '#F2E8DA',
  sand160: '#F2E4D1',
  sand150: '#EFE6D7',
  sand140: '#EDE5D8',
  sand130: '#F6F3ED',
  sand120: '#F7F4EF',
  sand110: '#FFFDFA',

  // Blue
  blue900: '#0F3C91',
  blue800: '#1E40AF',
  blue700: '#2563EB',
  blue600: '#3B82F6',
  blue500: '#2E78B7',
  blue400: '#93C5FD',
  blue350: '#9EC5FF',
  blue300: '#C7DBFF',
  blue250: '#BFDBFE',
  blue200: '#DBEAFE',
  blue180: '#E0E7FF',
  blue160: '#EDF4FF',
  blue150: '#EFF6FF',

  // Green/Mint/Teal
  green900: '#0F5132',
  green800: '#166534',
  green700: '#15803D',
  green600: '#22C55E',
  green500: '#14B8A6',
  green450: '#0D9488',
  green400: '#BBF7D0',
  green350: '#F0FDF4',
  green300: '#DCFCE7',
  green250: '#E6F4EA',
  green240: '#C1E3CF',
  green230: '#E2F5E9',
  green220: '#F2FDF7',
  green210: '#CCFBF1',
  green200: '#E7F6EF',
  green180: '#D3EFE2',
  green160: '#B9E3D2',
  green140: '#9AD4BE',
  green120: '#7CC7AA',
  green100: '#5EB992',
  green80: '#3EA77A',
  teal500: '#20B2C5',

  // Amber/Yellow/Orange
  amber900: '#854D0E',
  amber800: '#92400E',
  amber600: '#F59E0B',
  amber500: '#FBBF24',
  amber400: '#FCD34D',
  amber300: '#FDE68A',
  amber200: '#FEF3C7',
  amber180: '#FEF7CD',
  amber170: '#FEF9C3',
  amber160: '#FFFBEB',
  orange600: '#F97316',

  // Lime
  lime400: '#A3E635',
  lime100: '#ECFCCB',

  // Red/Pink
  red800: '#991B1B',
  red700: '#B91C1C',
  red600: '#DC2626',
  red900: '#7F1D1D',
  red300: '#FCA5A5',
  red200: '#FECACA',
  red150: '#FEE2E2',
  red120: '#FEF2F2',
  rose100: '#FFE4E6',
  pink300: '#F472B6',
  pink200: '#FCE7F3',

  // Purple
  purple500: '#A855F7',
  purple100: '#EDE9FE',

  // Cyan
  cyan500: '#00CED1',

  // Metallics
  metalBronze: '#CD7F32',
  metalBronzeDark: '#A0522D',
  metalSilver: '#C0C0C0',
  metalSilverDark: '#808080',
  metalGold: '#FFD700',
  metalGoldDark: '#DAA520',
  metalPlatinum: '#E5E4E2',
  metalPlatinumDark: '#A8A8A8',
  metalDiamond: '#B9F2FF',

  // Accent tones
  goldMuted: '#D4B45A',
  peachMuted: '#DE8B53',
} as const;

// Alpha variants for overlays, borders, and shadows
export const alpha = {
  ink95: 'rgba(15, 23, 42, 0.95)',
  ink90: 'rgba(15, 23, 42, 0.9)',
  ink80: 'rgba(15, 23, 42, 0.8)',
  ink50: 'rgba(15, 23, 42, 0.5)',
  ink35: 'rgba(15, 23, 42, 0.35)',
  ink20: 'rgba(15, 23, 42, 0.2)',
  ink08: 'rgba(15, 23, 42, 0.08)',
  slate35: 'rgba(148, 163, 184, 0.35)',
  slate30: 'rgba(148, 163, 184, 0.3)',
  slate16: 'rgba(148, 163, 184, 0.16)',
  slate60: 'rgba(148, 163, 184, 0.6)',
  slate75: 'rgba(226, 232, 240, 0.75)',
  slate80: 'rgba(226, 232, 240, 0.8)',
  offWhite85: 'rgba(255, 255, 255, 0.85)',
  offWhite90: 'rgba(255, 255, 255, 0.9)',
  offWhite80: 'rgba(255, 255, 255, 0.8)',
  offWhite75: 'rgba(255, 255, 255, 0.75)',
  offWhite70: 'rgba(255, 255, 255, 0.7)',
  offWhite50: 'rgba(255, 255, 255, 0.5)',
  offWhite12: 'rgba(255, 255, 255, 0.12)',
  offWhite05: 'rgba(255, 255, 255, 0.05)',
  blue20: 'rgba(59, 130, 246, 0.2)',
  green35: 'rgba(34, 197, 94, 0.35)',
  green10: 'rgba(34, 197, 94, 0.1)',
  red90: 'rgba(248, 113, 113, 0.9)',
  red80: 'rgba(248, 113, 113, 0.8)',
  red70: 'rgba(248, 113, 113, 0.7)',
  red45: 'rgba(248, 113, 113, 0.45)',
  red40: 'rgba(239, 68, 68, 0.4)',
  red60: 'rgba(239, 68, 68, 0.6)',
  red12: 'rgba(239, 68, 68, 0.12)',
  rose60: 'rgba(254, 226, 226, 0.6)',
  green40: 'rgba(22, 163, 74, 0.4)',
  green12: 'rgba(22, 163, 74, 0.12)',
  amber40: 'rgba(234, 179, 8, 0.4)',
  amber16: 'rgba(234, 179, 8, 0.16)',
  deepInk75: 'rgba(3, 7, 18, 0.75)',
  black35: 'rgba(0, 0, 0, 0.35)',
  plum70: 'rgba(30, 8, 8, 0.7)',
  cyan10: 'rgba(32, 178, 197, 0.1)',
  bronze30: 'rgba(205, 127, 50, 0.3)',
  silver30: 'rgba(192, 192, 192, 0.3)',
  gold40: 'rgba(255, 215, 0, 0.4)',
  platinum40: 'rgba(229, 228, 226, 0.4)',
  diamond50: 'rgba(185, 242, 255, 0.5)',
} as const;

// Gradient definitions
export const gradients = {
  // Streak gradient (Peach-based)
  streak: ['#F4A261', '#E9965A', '#DE8B53'] as const,

  // Pine gradient for CTAs
  pine: ['#1F8A5B', '#156A45'] as const,

  // Gold gradient for XP/rewards
  gold: ['#E9C46A', '#D4B45A'] as const,

  // Background gradient
  background: ['#FAF5EF', '#F5EDE4'] as const,
} as const;

// Badge tier colors (PRESERVED - do not change)
export const badgeTiers = {
  bronze: {
    primary: '#CD7F32',
    secondary: '#8B4513',
    background: 'rgba(205, 127, 50, 0.1)',
  },
  silver: {
    primary: '#C0C0C0',
    secondary: '#808080',
    background: 'rgba(192, 192, 192, 0.1)',
  },
  gold: {
    primary: '#FFD700',
    secondary: '#B8860B',
    background: 'rgba(255, 215, 0, 0.1)',
  },
  platinum: {
    primary: '#E5E4E2',
    secondary: '#A0A0A0',
    background: 'rgba(229, 228, 226, 0.1)',
  },
  diamond: {
    primary: '#B9F2FF',
    secondary: '#4AA8C7',
    background: 'rgba(185, 242, 255, 0.1)',
  },
} as const;

// Spending category colors (legacy fallback; DB colors are source of truth)
export const categoryColors = {
  food: '#FF6B6B',
  transportation: '#4ECDC4',
  entertainment: '#95E1D3',
  shopping: '#F38181',
  utilities: '#AA96DA',
  healthcare: '#FCBAD3',
  education: '#A8D8EA',
  personal: '#FFD93D',
  housing: '#6BCB77',
  travel: '#4D96FF',
  other: '#C4C4C4',
} as const;

// Shadow definitions
export const shadows = {
  small: {
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  medium: {
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  large: {
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
} as const;

// Spacing scale
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

// Border radius scale
export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

// Type exports
export type Colors = typeof colors;
export type ColorKey = keyof typeof colors;
export type GradientKey = keyof typeof gradients;
export type BadgeTier = keyof typeof badgeTiers;
export type CategoryColor = keyof typeof categoryColors;

// Default export for convenience
export default {
  colors,
  gradients,
  badgeTiers,
  categoryColors,
  shadows,
  spacing,
  borderRadius,
};
