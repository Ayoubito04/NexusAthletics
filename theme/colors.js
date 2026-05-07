/**
 * NEXUS ATHLETICS — Color Palette
 * Cyberpunk Gym aesthetic: neon green on near-black
 *
 * Usage:
 *   import { colors } from '../theme';
 *   style={{ color: colors.primary }}
 */

export const colors = {
  // ── Backgrounds ──────────────────────────────────────────
  background: '#0A0A0A',          // Main screen background
  surface: '#121212',             // Cards, modals, inputs
  surfaceHighlight: '#1A1A1A',    // Elevated cards, sidebar items
  surfaceElevated: '#1E1E1E',     // Highest elevation surface

  // ── Brand / Primary ───────────────────────────────────────
  primary: '#63ff15',             // Neon green — CTAs, icons, accents
  primaryDim: 'rgba(99,255,21,0.2)',
  primaryGlow: 'rgba(99,255,21,0.08)',
  primaryBorder: 'rgba(99,255,21,0.15)',

  // ── Accent ───────────────────────────────────────────────
  accentBlue: '#00D1FF',          // Hydration, secondary highlights
  accentPurple: '#A259FF',        // AI features
  accentGold: '#FFD700',          // Premium/Elite badges
  accentOrange: '#FF6B35',        // Calories, energy
  accentPink: '#FF3366',          // Danger, Ultimate plan, live indicators

  // ── Text ─────────────────────────────────────────────────
  textPrimary: '#FFFFFF',
  textSecondary: '#A1A1AA',
  textTertiary: '#71717A',
  textMuted: '#52525B',
  textDim: '#888888',
  textPlaceholder: '#52525B',

  // ── Semantic ─────────────────────────────────────────────
  success: '#63ff15',
  error: '#FF3B30',
  warning: '#FF9F0A',
  info: '#00D1FF',

  // ── Borders ──────────────────────────────────────────────
  border: 'rgba(99,255,21,0.1)',
  borderDim: 'rgba(99,255,21,0.06)',
  borderPrimary: 'rgba(99,255,21,0.15)',
  borderPrimaryBright: 'rgba(99,255,21,0.35)',

  // ── Overlays ─────────────────────────────────────────────
  overlay: 'rgba(0,0,0,0.85)',
  overlayLight: 'rgba(0,0,0,0.5)',

  // ── Gradients (arrays for LinearGradient) ─────────────────
  gradients: {
    primary: ['#63ff15', '#4dd10e'],
    primaryCyan: ['#63ff15', '#00D1FF'],
    dark: ['#1A1A1A', '#121212'],
    darkDeep: ['#141414', '#0c0c0c'],
    card: ['#1a1a1a', '#0a0a0a'],
    motivation: ['rgba(99,255,21,0.08)', 'rgba(0,209,255,0.05)', 'transparent'],
    kcal: ['rgba(255,107,53,0.1)', 'transparent'],
    water: ['rgba(0,209,255,0.1)', 'transparent'],
    ultimate: ['#FF3366', '#FF6B6B'],
    pro: ['#63ff15', '#00D1FF'],
    free: ['#3F3F46', '#52525B'],
  },

  // ── Tab Bar ───────────────────────────────────────────────
  tabBar: '#111111',
  tabBarActive: '#63ff15',
  tabBarInactive: '#555555',
  tabBarBorder: 'rgba(99,255,21,0.2)',
};

export default colors;
