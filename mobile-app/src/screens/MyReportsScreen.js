import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import Screen from '../components/Screen';
import Chip from '../components/Chip';
import ItemCard from '../components/ItemCard';
import { EmptyState, ErrorView, LoadingView } from '../components/StateViews';
import { useOptions } from '../hooks/useOptions';
import { listMine } from '../api/itemsApi';
import { colors, spacing, typography } from '../theme';

const FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: 'LOST', label: 'Lost' },
  { key: 'FOUND', label: 'Found' },
];

/** Everything you have reported, newest first, including reports you closed. */
export default function MyReportsScreen({ navigation }) {
  const { zones } = useOptions();
  const [filter, setFilter] = useState('ALL');
  const [state, setState] = useState({ phase: 'loading', items: [], message: null });
  const [refreshing, setRefreshing] = useState(false);
  const latest = useRef(0);

  const load = useCallback(async (selected, { refresh = false, quiet = false } = {}) => {
    const id = ++latest.current;
    if (refresh) setRefreshing(true);
    else if (!quiet) setState((current) => ({ ...current, phase: 'loading' }));
    try {
      const { items } = await listMine({ reportType: selected === 'ALL' ? undefined : selected });
      if (id === latest.current) setState({ phase: 'ready', items, message: null });
    } catch (error) {
      if (id === latest.current) setState({ phase: 'error', items: [], message: error.message || 'Please check your connection.' });
    } finally {
      if (id === latest.current) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(filter);
    // Coming back to this tab (for example after reporting or closing something): refresh quietly.
    return navigation.addListener ? navigation.addListener('focus', () => load(filter, { quiet: true })) : undefined;
  }, [filter, load, navigation]);

  const header = (
    <View>
      <Text style={styles.heading}>My reports</Text>
      <Text style={styles.lead}>Everything you have reported, including reports you closed.</Text>
      <View style={styles.chips}>
        {FILTERS.map((option) => (
          <Chip key={option.key} label={option.label} selected={filter === option.key} onPress={() => setFilter(option.key)} />
        ))}
      </View>
    </View>
  );

  let empty = null;
  if (state.phase === 'loading') empty = <LoadingView message="Loading your reports…" />;
  else if (state.phase === 'error') empty = <ErrorView message={state.message} onRetry={() => load(filter)} />;
  else if (state.items.length === 0) {
    empty = (
      <EmptyState
        icon="list-outline"
        title="No reports here yet"
        message={filter === 'ALL' ? 'When you report something lost or found, it will appear here.' : `You have no ${filter.toLowerCase()} reports.`}
        actionTitle="Report something"
        onAction={() => navigation.navigate('Report')}
      />
    );
  }

  return (
    <Screen>
      <FlatList
        testID="my-reports-list"
        data={state.phase === 'ready' ? state.items : []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ItemCard item={item} zones={zones} onPress={() => navigation.navigate('ItemDetails', { id: item.id })} />}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(filter, { refresh: true })} colors={[colors.primary]} tintColor={colors.primary} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg, flexGrow: 1 },
  heading: { ...typography.title, color: colors.text },
  lead: { ...typography.body, color: colors.muted, marginTop: spacing.xs, marginBottom: spacing.lg },
  chips: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
});
