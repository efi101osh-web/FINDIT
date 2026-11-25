import { StyleSheet, Switch, Text, View } from 'react-native';
import { colors, MIN_TOUCH, spacing, typography } from '../theme';

/** A yes/no switch with a label (and optional explanation) beside it. */
export default function SwitchRow({ label, description, value, onValueChange }) {
  return (
    <View style={styles.row}>
      <View style={styles.text}>
        <Text style={styles.label}>{label}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        accessibilityLabel={label}
        trackColor={{ false: colors.inputBorder, true: colors.primary }}
        thumbColor={colors.white}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: MIN_TOUCH, marginBottom: spacing.lg },
  text: { flex: 1 },
  label: { ...typography.subheading, color: colors.text },
  description: { ...typography.small, color: colors.muted, marginTop: 2 },
});
