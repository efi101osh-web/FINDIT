import { StyleSheet, Text, View } from 'react-native';
import { radius, spacing, typography } from '../theme';
import { STATUS_COLORS, TYPE_COLORS } from '../theme/statusColors';
import { REPORT_TYPE_LABELS, STATUS_LABELS, labelFor } from '../utils/labels';

const FALLBACK = STATUS_COLORS.CLOSED;

/** A small coloured pill: the status of a report ("Open", "Possible match", ...). */
export function StatusBadge({ status }) {
  const look = STATUS_COLORS[status] || FALLBACK;
  return (
    <View style={[styles.pill, { backgroundColor: look.background }]} accessible accessibilityLabel={`Status: ${labelFor(STATUS_LABELS, status)}`}>
      <Text style={[styles.text, { color: look.text }]}>{labelFor(STATUS_LABELS, status)}</Text>
    </View>
  );
}

/** The same kind of pill for "Lost" or "Found". */
export function TypeBadge({ reportType }) {
  const look = TYPE_COLORS[reportType] || FALLBACK;
  return (
    <View style={[styles.pill, { backgroundColor: look.background }]}>
      <Text style={[styles.text, { color: look.text }]}>{labelFor(REPORT_TYPE_LABELS, reportType)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, alignSelf: 'flex-start' },
  text: { ...typography.caption },
});
