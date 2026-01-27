import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TAB_BAR_HEIGHT, CONTENT_PADDING_EXTRA } from '@/constants/layout';

export function useTabSafePadding() {
  const insets = useSafeAreaInsets();

  const bottomPadding = TAB_BAR_HEIGHT + insets.bottom + CONTENT_PADDING_EXTRA;

  return {
    bottomPadding,
    bottomInset: insets.bottom,
    tabBarHeight: TAB_BAR_HEIGHT,
  };
}
