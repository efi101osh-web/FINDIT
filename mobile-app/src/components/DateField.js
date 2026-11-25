import { StyleSheet, Text, View } from 'react-native';
import Chip from './Chip';
import TextField from './TextField';
import { daysBeforeIso } from '../utils/itemValidation';
import { colors, spacing, typography } from '../theme';

const QUICK = [
  { days: 0, label: 'Today' },
  { days: 1, label: 'Yesterday' },
  { days: 2, label: '2 days ago' },
  { days: 3, label: '3 days ago' },
];

/** Quick buttons for the last few days, plus a box to type any other date (YYYY-MM-DD). */
export default function DateField({ label, value, onChange, error, now = new Date() }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        {QUICK.map((choice) => {
          const date = daysBeforeIso(choice.days, now);
          return <Chip key={choice.days} label={choice.label} selected={value === date} onPress={() => onChange(date)} />;
        })}
      </View>
      <TextField
        label="Or type a date"
        value={value}
        onChangeText={onChange}
        error={error}
        helper="Use the form YYYY-MM-DD, for example 2026-11-14."
        placeholder="YYYY-MM-DD"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="numbers-and-punctuation"
        maxLength={10}
        style={styles.field}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.sm },
  label: { ...typography.subheading, color: colors.text, marginBottom: spacing.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  field: { marginBottom: spacing.sm },
});
