import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, MIN_TOUCH, radius, spacing, typography } from '../theme';

/** A selectable filter pill ("All", "Lost", "Found"). */
export default function Chip({ label, selected, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${label}${selected ? ', selected' : ''}`}
      style={[styles.chip, selected ? styles.selected : styles.idle]}
    >
      <Text style={[typography.subheading, { color: selected ? colors.white : colors.primary }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: { minHeight: MIN_TOUCH, paddingHorizontal: spacing.lg, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  selected: { backgroundColor: colors.primary, borderColor: colors.primary },
  idle: { backgroundColor: colors.surface, borderColor: colors.primary },
});
