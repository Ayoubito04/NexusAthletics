/**
 * NEXUS ATHLETICS — Responsive Utilities
 *
 * Base design width: 375px (iPhone SE / standard Android)
 * Scales proportionally to device screen width.
 *
 * Usage:
 *   import { rs, rw, rh, isSmall, isTablet } from '../theme/responsive';
 *   style={{ fontSize: rs(16), width: rw(80) }}
 */

import { Dimensions, PixelRatio, Platform } from 'react-native';

const BASE_WIDTH = 375;   // iPhone SE 2 / iPhone 8 — design baseline
const BASE_HEIGHT = 812;  // iPhone X — design baseline

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/** Scale a value proportional to screen width */
export const rw = (value) => (SCREEN_WIDTH / BASE_WIDTH) * value;

/** Scale a value proportional to screen height */
export const rh = (value) => (SCREEN_HEIGHT / BASE_HEIGHT) * value;

/**
 * Responsive Scale — scales sizes based on screen width.
 * Clamped so nothing becomes unusably small on tiny screens
 * or absurdly large on tablets.
 */
export const rs = (size) => {
  const scale = SCREEN_WIDTH / BASE_WIDTH;
  const newSize = size * scale;
  // Clamp: never shrink more than 15% or grow more than 40%
  return Math.round(
    PixelRatio.roundToNearestPixel(
      Math.min(Math.max(newSize, size * 0.85), size * 1.4)
    )
  );
};

/** Device category helpers */
export const isSmall = SCREEN_WIDTH < 360;      // iPhone SE 1st gen, small Android
export const isStandard = SCREEN_WIDTH >= 360 && SCREEN_WIDTH < 414;
export const isLarge = SCREEN_WIDTH >= 414 && SCREEN_WIDTH < 768;
export const isTablet = SCREEN_WIDTH >= 768;

/** Max content width for tablet layouts */
export const maxContentWidth = isTablet ? 600 : SCREEN_WIDTH;

/** Safe bottom padding for tab bar or home indicator */
export const TAB_BAR_HEIGHT = isTablet ? 80 : 80;
export const BOTTOM_PADDING = TAB_BAR_HEIGHT + 16;

/** Horizontal page padding — more breathing room on tablets */
export const PAGE_PADDING = isTablet ? 32 : isSmall ? 16 : 20;

/** Grid column count */
export const GRID_COLUMNS = isTablet ? 3 : 2;

/** Card half-width for grid layouts */
export const CARD_HALF = (SCREEN_WIDTH - PAGE_PADDING * 2 - 12) / 2;

export const SCREEN = {
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
};

export default {
  rs,
  rw,
  rh,
  isSmall,
  isStandard,
  isLarge,
  isTablet,
  maxContentWidth,
  TAB_BAR_HEIGHT,
  BOTTOM_PADDING,
  PAGE_PADDING,
  GRID_COLUMNS,
  CARD_HALF,
  SCREEN,
};
