import { PlatformOSType } from "react-native";

type AdaptiveTabBarMetricsParams = {
  bottomInset: number;
  platform: PlatformOSType;
  screenWidth: number;
};

export type AdaptiveTabBarMetrics = {
  bottomOffset: number;
  contentPaddingBottom: number;
  height: number;
  horizontalInset: number;
  itemPaddingVertical: number;
  labelFontSize: number;
  labelMarginTop: number;
  outerHorizontalMargin: number;
  paddingBottom: number;
  paddingTop: number;
};

export function getAdaptiveTabBarMetrics({
  bottomInset,
  platform,
  screenWidth,
}: AdaptiveTabBarMetricsParams): AdaptiveTabBarMetrics {
  const isAndroid = platform === "android";
  const isCompactWidth = screenWidth < 380;
  const isVeryCompactWidth = screenWidth < 360;

  const horizontalInset = 0;
  const outerHorizontalMargin = 16;
  const height = isCompactWidth ? 64 : 68;
  const bottomOffset = Math.max(bottomInset, isAndroid ? 12 : 16);
  const paddingTop = isCompactWidth ? 5 : 6;
  const paddingBottom = isCompactWidth ? 13 : 14;
  const itemPaddingVertical = 0;
  const labelFontSize = isCompactWidth ? 11 : 12;
  const labelMarginTop = 1;
  const contentPaddingBottom = bottomOffset + height + 24;

  return {
    bottomOffset,
    contentPaddingBottom,
    height,
    horizontalInset,
    itemPaddingVertical,
    labelFontSize,
    labelMarginTop,
    outerHorizontalMargin,
    paddingBottom,
    paddingTop,
  };
}
