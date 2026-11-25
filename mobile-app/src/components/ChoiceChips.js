import { StyleSheet, Text, View } from 'react-native';
import Chip from './Chip';
import { colors, spacing, typography } from '../theme';

/** A row of pills where exactly one can be chosen. `options` is [{ value, label }]. */
export default function ChoiceChips({ label, options, value, onChange, error, style }) {
  return (
    <View style={[styles.wrap, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.row}>
        {options.map((option) => (
          <Chip key={String(option.value)} label={option.label} selected={option.value === value} onPress={() => onChange(option.value)} />
        ))}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.lg },
  label: { ...typography.subheading, color: colors.text, marginBottom: spacing.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  error: { ...typography.small, color: colors.errorText, marginTop: spacing.xs },
});
