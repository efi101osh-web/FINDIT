import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../components/Button';
import Notice from '../components/Notice';
import { StatusBadge, TypeBadge } from '../components/StatusBadge';
import { EmptyState, ErrorView, LoadingView } from '../components/StateViews';
import { useOptions } from '../hooks/useOptions';
import { closeItem, getItem } from '../api/itemsApi';
import { CATEGORY_ICONS, CATEGORY_LABELS, COLOUR_LABELS, TIME_BAND_LABELS, labelFor } from '../utils/labels';
import { formatDate, formatRelativeDay } from '../utils/format';
import { placeText, zoneLabel } from '../utils/place';
import { colors, radius, spacing, typography } from '../theme';

const OWNER_CAN_CHANGE = ['OPEN', 'POTENTIAL_MATCH'];

function Fact({ icon, label, value }) {
  return (
    <View style={styles.fact} accessible accessibilityLabel={`${label}: ${value}`}>
      <Ionicons name={icon} size={20} color={colors.primary} />
      <View style={styles.factText}>
        <Text style={styles.factLabel}>{label}</Text>
        <Text style={styles.factValue}>{value}</Text>
      </View>
    </View>
  );
}

/** One report in full. Everyone sees the public facts; only the reporter sees the private ones. */
export default function ItemDetailsScreen({ navigation, route }) {
  const { id } = route.params;
  const { zones } = useOptions();
  const [state, setState] = useState({ phase: 'loading', item: null, message: null, status: null });
  const [closing, setClosing] = useState(false);
  const [problem, setProblem] = useState(null);

  const load = useCallback(
    async (quiet = false) => {
      if (!quiet) setState({ phase: 'loading', item: null, message: null, status: null });
      try {
        const item = await getItem(id);
        setState({ phase: 'ready', item, message: null, status: null });
      } catch (failure) {
        setState({ phase: 'error', item: null, message: failure.message || 'Please check your connection.', status: failure.status });
      }
    },
    [id]
  );

  useEffect(() => {
    load();
    // Coming back from the edit screen: show the changes.
    return navigation.addListener ? navigation.addListener('focus', () => load(true)) : undefined;
  }, [load, navigation]);

  async function doClose() {
    setClosing(true);
    setProblem(null);
    try {
      const item = await closeItem(id, {});
      setState({ phase: 'ready', item, message: null, status: null });
    } catch (failure) {
      setProblem(failure.message || 'Could not close the report. Please try again.');
    }
    setClosing(false);
  }

  function confirmClose() {
    Alert.alert('Close this report?', 'It will disappear from the public list. You will still see it in My reports.', [
      { text: 'Keep it open', style: 'cancel' },
      { text: 'Close report', style: 'destructive', onPress: doClose },
    ]);
  }

  const frame = (child) => <SafeAreaView style={styles.safe} edges={['left', 'right']}>{child}</SafeAreaView>;

  if (state.phase === 'loading') return frame(<LoadingView message="Loading the report…" />);
  if (state.phase === 'error') {
    if (state.status === 404) return frame(<EmptyState icon="eye-off-outline" title="This report is not available" message="It may have been closed or removed." actionTitle="Go back" onAction={() => navigation.goBack()} />);
    return frame(<ErrorView message={state.message} onRetry={() => load()} />);
  }

  const { item } = state;
  const found = item.reportType === 'FOUND';
  const zone = zoneLabel(zones, item.generalLocation);
  const place = placeText(zones, item.generalLocation, item.locationDetail);
  const when = `${formatDate(item.dateOccurred)}${item.approximateTime && item.approximateTime !== 'UNKNOWN' ? ` · ${labelFor(TIME_BAND_LABELS, item.approximateTime)}` : ''}`;
  const canChange = item.isMine && OWNER_CAN_CHANGE.includes(item.status);

  return frame(
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.tile} accessible={false}>
        <Ionicons name={CATEGORY_ICONS[item.category] || 'cube-outline'} size={44} color={colors.primary} />
      </View>
      <View style={styles.badges}>
        <TypeBadge reportType={item.reportType} />
        <StatusBadge status={item.status} />
        {item.isMine ? <Text style={styles.mine}>Your report</Text> : null}
      </View>
      <Text style={styles.title} accessibilityRole="header">
        {item.title}
      </Text>
      <Text style={styles.reported}>Reported {formatRelativeDay(item.createdAt).toLowerCase()}</Text>

      <View style={styles.card}>
        <Fact icon="pricetag-outline" label="Category" value={labelFor(CATEGORY_LABELS, item.category)} />
        <Fact icon="color-palette-outline" label="Colour" value={labelFor(COLOUR_LABELS, item.colour)} />
        {item.brand ? <Fact icon="ribbon-outline" label="Brand" value={item.brand} /> : null}
        <Fact icon="location-outline" label={found ? 'Where it was found' : 'Where it was lost'} value={zone && zone !== place ? `${place} (${zone})` : place} />
        <Fact icon="calendar-outline" label={found ? 'When it was found' : 'When it was lost'} value={when} />
      </View>

      <Text style={styles.section}>Description</Text>
      <Text style={styles.body}>{item.description}</Text>

      {found ? (
        <Notice message={item.handedToOffice ? 'This item was handed to an authorised office.' : 'This item has not been handed to an office yet.'} />
      ) : null}

      {item.isMine ? (
        <View style={styles.privateBox}>
          <Text style={styles.privateTitle}>Only you and administrators can see this</Text>
          <Text style={styles.privateLabel}>Private details</Text>
          <Text style={styles.body}>{item.privateDetails || 'None added.'}</Text>
          {found ? (
            <>
              <Text style={styles.privateLabel}>Where it is kept</Text>
              <Text style={styles.body}>{item.privateStorageLocation || 'Not added.'}</Text>
            </>
          ) : null}
          {item.status === 'CLOSED' ? (
            <>
              <Text style={styles.privateLabel}>Closed on</Text>
              <Text style={styles.body}>
                {formatDate(item.closedAt)}
                {item.closeReason ? `. Reason: ${item.closeReason}` : ''}
              </Text>
            </>
          ) : null}
        </View>
      ) : null}

      {problem ? <Notice tone="error" message={problem} /> : null}

      {canChange ? (
        <View style={styles.actions}>
          <Button title="Edit report" onPress={() => navigation.navigate('EditReport', { id })} />
          <Button title="Close report" variant="outline" onPress={confirmClose} loading={closing} style={styles.second} />
        </View>
      ) : null}
      {item.isMine && !canChange && item.status !== 'CLOSED' ? <Notice message="This report is being handled, so it can no longer be edited or closed from here." /> : null}
      {!item.isMine && found ? <Notice message="Is this yours? Claiming a found item opens in a later update." /> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  tile: { width: 96, height: 96, borderRadius: radius.lg, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: spacing.lg },
  badges: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap', marginBottom: spacing.sm },
  mine: { ...typography.caption, color: colors.primary, marginLeft: 'auto' },
  title: { ...typography.title, color: colors.text },
  reported: { ...typography.small, color: colors.muted, marginTop: spacing.xs, marginBottom: spacing.lg },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.neutralTint, padding: spacing.md, gap: spacing.md, marginBottom: spacing.lg },
  fact: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  factText: { flex: 1 },
  factLabel: { ...typography.caption, color: colors.muted },
  factValue: { ...typography.body, color: colors.text },
  section: { ...typography.heading, color: colors.text, marginBottom: spacing.xs },
  body: { ...typography.body, color: colors.text, marginBottom: spacing.md },
  privateBox: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.primary, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.lg },
  privateTitle: { ...typography.subheading, color: colors.primary, marginBottom: spacing.sm },
  privateLabel: { ...typography.caption, color: colors.muted },
  actions: { marginTop: spacing.sm },
  second: { marginTop: spacing.md },
});
