/**
 * NEXUS ATHLETICS — Spacing System
 *
 * Proportional spacing based on a 4pt base grid.
 * All padding, margin, gap, and border-radius values
 * should come from this file.
 *
 * Usage:
 *   import { spacing, radius } from '../theme';
 *   style={{ padding: spacing.md, borderRadius: radius.lg }}
 */

import { rs } from './responsive';

/** Base spacing scale (fixed values — use for layout structure) */
export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  section: 40,
};

/**
 * Responsive spacing — scales with screen size.
 * Use for font-related spacing or when you need
 * proportional growth on tablets.
 */
export const rSpacing = {
  xxs: rs(2),
  xs: rs(4),
  sm: rs(8),
  md: rs(12),
  base: rs(16),
  lg: rs(20),
  xl: rs(24),
  xxl: rs(32),
  xxxl: rs(48),
};

/**
 * Border radius system — consistent rounded corners throughout the app.
 * Values chosen to match cyberpunk geometric aesthetic.
 */
export const radius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 28,
  xxxl: 32,
  full: 999,       // Pills, circles
  card: 24,        // Feature cards
  modal: 32,       // Bottom sheets, modals
  tab: 28,         // Tab bar
};

export default { spacing, rSpacing, radius };
