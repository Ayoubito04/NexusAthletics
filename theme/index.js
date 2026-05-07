/**
 * NEXUS ATHLETICS — Theme System
 *
 * Central export for the entire design system.
 * Import from here in all screens and components.
 *
 * Usage:
 *   import { colors, typography, spacing, radius, shadows } from '../theme';
 *   import theme from '../theme';  // access via theme.colors.primary
 */

export { colors } from './colors';
export { typography } from './typography';
export { spacing, rSpacing, radius } from './spacing';
export { shadows } from './shadows';
export {
  rs, rw, rh,
  isSmall, isStandard, isLarge, isTablet,
  maxContentWidth, TAB_BAR_HEIGHT, BOTTOM_PADDING,
  PAGE_PADDING, GRID_COLUMNS, CARD_HALF, SCREEN,
} from './responsive';

import { colors } from './colors';
import { typography } from './typography';
import { spacing, rSpacing, radius } from './spacing';
import { shadows } from './shadows';
import responsive from './responsive';

const theme = {
  colors,
  typography,
  spacing,
  rSpacing,
  radius,
  shadows,
  ...responsive,
};

export default theme;
