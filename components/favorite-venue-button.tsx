import { Heart } from "lucide-react-native";
import { GestureResponderEvent, TouchableOpacity } from "react-native";

import { useAppTheme } from "@/hooks/use-app-theme";

type FavoriteVenueButtonProps = {
  isFavorite: boolean;
  onPress: () => void | Promise<void>;
  disabled?: boolean;
  isLoading?: boolean;
  size?: number;
};

export function FavoriteVenueButton({
  isFavorite,
  onPress,
  disabled = false,
  isLoading = false,
  size = 18,
}: FavoriteVenueButtonProps) {
  const { colors, isDark } = useAppTheme();

  const handlePress = (event: GestureResponderEvent) => {
    event.stopPropagation();
    if (disabled || isLoading) {
      return;
    }
    void onPress();
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      accessibilityLabel={isFavorite ? "Remove from favorites" : "Add to favorites"}
      accessibilityState={{ busy: isLoading, disabled: disabled || isLoading }}
      disabled={disabled || isLoading}
      onPress={handlePress}
      style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled || isLoading ? 0.55 : 1,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: isFavorite ? colors.accentSoft : colors.borderSoft,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isDark ? 0.22 : 0.08,
        shadowRadius: 10,
        elevation: 3,
      }}
    >
      <Heart
        size={size}
        color={isFavorite ? colors.accent : colors.icon}
        fill={isFavorite ? colors.accent : "transparent"}
      />
    </TouchableOpacity>
  );
}
