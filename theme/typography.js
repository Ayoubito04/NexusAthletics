/**
 * NEXUS ATHLETICS — Typography System
 *
 * All font sizes are responsive (scale with screen width).
 * Line heights follow 1.4-1.6× ratio for readability.
 * Minimum body text: 14pt. Minimum tap targets: 44pt.
 *
 * Usage:
 *   import { typography } from '../theme';
 *   style={typography.h1}
 *   style={{ ...typography.body, color: colors.textSecondary }}
 */

import { rs } from './responsive';
import { colors } from './colors';

export const typography = {
  // ── Display (hero sections) ───────────────────────────────
  display: {
    fontSize: rs(42),
    fontWeight: '900',
    letterSpacing: -1.5,
    color: colors.textPrimary,
    lineHeight: rs(50),
  },

  // ── Headings ──────────────────────────────────────────────
  h1: {
    fontSize: rs(32),
    fontWeight: '900',
    letterSpacing: -1,
    color: colors.textPrimary,
    textTransform: 'uppercase',
    lineHeight: rs(38),
  },
  h2: {
    fontSize: rs(24),
    fontWeight: '800',
    letterSpacing: -0.5,
    color: colors.textPrimary,
    lineHeight: rs(30),
  },
  h3: {
    fontSize: rs(20),
    fontWeight: '800',
    letterSpacing: -0.3,
    color: colors.textPrimary,
    lineHeight: rs(26),
  },
  h4: {
    fontSize: rs(18),
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: rs(24),
  },

  // ── Body ──────────────────────────────────────────────────
  bodyLarge: {
    fontSize: rs(16),
    fontWeight: '500',
    color: colors.textSecondary,
    lineHeight: rs(24),
  },
  body: {
    fontSize: rs(15),
    fontWeight: '400',
    color: colors.textSecondary,
    lineHeight: rs(22),
  },
  bodySmall: {
    fontSize: rs(14),            // WCAG: min readable body size
    fontWeight: '400',
    color: colors.textSecondary,
    lineHeight: rs(20),
  },

  // ── Labels & Captions ─────────────────────────────────────
  label: {
    fontSize: rs(12),
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.primary,
    lineHeight: rs(16),
  },
  labelSmall: {
    fontSize: rs(10),
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.primary,
    lineHeight: rs(14),
  },
  caption: {
    fontSize: rs(12),
    fontWeight: '600',
    color: colors.textMuted,
    lineHeight: rs(16),
  },
  micro: {
    fontSize: rs(10),
    fontWeight: '800',
    letterSpacing: 0.6,
    color: colors.textMuted,
    lineHeight: rs(14),
  },

  // ── UI Elements ───────────────────────────────────────────
  buttonPrimary: {
    fontSize: rs(15),
    fontWeight: '800',
    letterSpacing: 1.5,
    color: '#000000',
    textTransform: 'uppercase',
  },
  buttonSecondary: {
    fontSize: rs(14),
    fontWeight: '700',
    color: colors.textPrimary,
  },
  inputText: {
    fontSize: rs(16),
    fontWeight: '500',
    color: colors.textPrimary,
  },
  inputLabel: {
    fontSize: rs(10),
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: colors.primary,
    opacity: 0.7,
  },
  placeholder: {
    fontSize: rs(16),
    color: colors.textPlaceholder,
  },

  // ── Numeric displays (stats, counters) ────────────────────
  statValue: {
    fontSize: rs(28),
    fontWeight: '900',
    letterSpacing: -0.8,
    color: colors.primary,
  },
  statValueLarge: {
    fontSize: rs(36),
    fontWeight: '900',
    letterSpacing: -1,
    color: colors.primary,
  },
};

export default typography;
