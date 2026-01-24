import { colors, palette } from './theme';

const tintColorLight = colors.primary;
const tintColorDark = palette.white;

export default {
  light: {
    text: colors.text,
    background: colors.background,
    tint: tintColorLight,
    tabIconDefault: colors.textTertiary,
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: palette.white,
    background: palette.black,
    tint: tintColorDark,
    tabIconDefault: palette.gray350,
    tabIconSelected: tintColorDark,
  },
};
