import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../theme';
import { StatusBadge, TypeBadge } from './StatusBadge';
import { CATEGORY_ICONS, CATEGORY_LABELS, COLOUR_LABELS, REPORT_TYPE_LABELS, STATUS_LABELS, labelFor } from '../utils/labels';
import { formatRelativeDay } from '../utils/format';
import { placeText, placeZoneLine } from '../utils/place';

/**
 * One report in a list. It shows only PUBLIC fields (the server never sends private ones).
 * `zones` is the server's place list, used to turn the place code into words.
 */
export default function ItemCard({ item, zones, onPress, now }) {
  const place = placeText(zones, item.generalLocation, item.locationDetail);
  const zoneLine = placeZoneLine(zones, item.generalLocation, item.locationDetail);
  const when = formatRelativeDay(item.dateOccurred, now);
  const category = labelFor(CATEGORY_LABELS, item.category);
  const colour = labelFor(COLOUR_LABELS, item.colour);

  const summary =
    `${labelFor(REPORT_TYPE_LABELS, item.reportType)}: ${item.title}. ${category}, ${colour}. ` +
    `${place}. ${when}. Status ${labelFor(STATUS_LABELS, item.status)}.` +
    (item.isMine ? ' This is your report.' : '');

  const Wrapper = onPress ? Pressable : View;
  const wrapperProps = onPress
    ? { onPress: () => onPress(item), accessibilityRole: 'button', accessibilityHint: 'Opens the report' }
    : {};

  return (
    <Wrapper style={styles.card} accessible accessibilityLabel={summary} {...wrapperProps}>
      <View style={styles.tile}>
        <Ionicons name={CATEGORY_ICONS[item.category] || 'cube-outline'} size={28} color={colors.primary} />
      </View>
      <View style={styles.body}>
        <View style={styles.badges}>
          <TypeBadge reportType={item.reportType} />
          <StatusBadge status={item.status} />
        </View>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {category} · {colour}
        </Text>
        <View style={styles.row}>
          <Ionicons name="location-outline" size={16} color={colors.muted} />
          <Text style={styles.rowText} numberOfLines={1}>
            {place}
            {zoneLine ? ` · ${zoneLine}` : ''}
          </Text>
        </View>
        <View style={styles.row}>
          <Ionicons name="calendar-outline" size={16} color={colors.muted} />
          <Text style={styles.rowText}>{when}</Text>
          {item.isMine ? <Text style={styles.mine}>Your report</Text> : null}
        </View>
      </View>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutralTint,
  },
  tile: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  body: { flex: 1 },
  badges: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xs, flexWrap: 'wrap' },
  title: { ...typography.subheading, color: colors.text },
  meta: { ...typography.small, color: colors.muted, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  rowText: { ...typography.small, color: colors.muted, flexShrink: 1 },
  mine: { ...typography.caption, color: colors.primary, marginLeft: 'auto' },
});
