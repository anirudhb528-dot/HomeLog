// Single source of truth for colors, spacing, and type scale. Imported by the
// shared UI kit and screens so the app has one consistent look.

export const colors = {
  primary: '#0F766E', // teal-700
  primaryDark: '#115E59',
  primaryLight: '#CCFBF1',
  accent: '#F59E0B', // amber-500
  bg: '#F8FAFC', // slate-50
  surface: '#FFFFFF',
  border: '#E2E8F0', // slate-200
  text: '#0F172A', // slate-900
  textMuted: '#64748B', // slate-500
  danger: '#DC2626', // red-600
  dangerLight: '#FEE2E2',
  success: '#16A34A', // green-600
  warning: '#D97706', // amber-600
  white: '#FFFFFF',
};

// Category/priority accent colors reused across screens.
export const palette = {
  high: '#DC2626',
  medium: '#D97706',
  low: '#16A34A',
  overdue: '#DC2626',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  pill: 999,
};

export const typography = {
  h1: { fontSize: 26, fontWeight: '700', color: colors.text },
  h2: { fontSize: 20, fontWeight: '700', color: colors.text },
  h3: { fontSize: 16, fontWeight: '600', color: colors.text },
  body: { fontSize: 15, color: colors.text },
  muted: { fontSize: 13, color: colors.textMuted },
  small: { fontSize: 12, color: colors.textMuted },
};

export default { colors, palette, spacing, radius, typography };
