import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../theme';

/** A message box. `tone="error"` for problems (read out by screen readers), `tone="info"` for notes. */
export default function Notice({ message, tone = 'info' }) {
  const error = tone === 'error';
  return (
    <View
      style={[styles.box, { backgroundColor: error ? colors.errorTint : colors.primaryLight }]}
      accessible
      accessibilityRole={error ? 'alert' : undefined}
      accessibilityLiveRegion={error ? 'assertive' : 'none'}
    >
      <Ionicons name={error ? 'alert-circle-outline' : 'sparkles-outline'} size={20} color={error ? colors.errorText : colors.primary} />
      <Text style={[styles.text, { color: error ? colors.errorText : colors.text }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.lg },
  text: { ...typography.small, flex: 1 },
});
