import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors, MIN_TOUCH, radius, spacing, typography } from '../theme';

// One button style per level of importance.
const VARIANTS = {
  primary: { background: colors.primary, text: colors.white, border: colors.primary },
  secondary: { background: colors.primaryLight, text: colors.primary, border: colors.primaryLight },
  outline: { background: colors.surface, text: colors.primary, border: colors.primary },
  text: { background: 'transparent', text: colors.primary, border: 'transparent' },
};

export default function Button({ title, onPress, variant = 'primary', loading = false, disabled = false, style, accessibilityLabel }) {
  const look = VARIANTS[variant] || VARIANTS.primary;
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={inactive ? undefined : onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: look.background, borderColor: look.border },
        pressed && !inactive && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={look.text} />
      ) : (
        <Text style={[typography.button, { color: look.text }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: MIN_TOUCH + 4,
    borderRadius: radius.md,
    borderWidth: 2,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
});
