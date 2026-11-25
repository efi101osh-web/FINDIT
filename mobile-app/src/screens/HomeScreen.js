import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import Button from '../components/Button';
import Chip from '../components/Chip';
import Notice from '../components/Notice';
import ItemCard from '../components/ItemCard';
import { EmptyState, ErrorView, LoadingView } from '../components/StateViews';
import { useAuth } from '../context/AuthContext';
import { useOptions } from '../hooks/useOptions';
import { listItems } from '../api/itemsApi';
import { firstName } from '../utils/format';
import { colors, MIN_TOUCH, radius, spacing, typography } from '../theme';

const FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: 'LOST', label: 'Lost' },
  { key: 'FOUND', label: 'Found' },
];

const EMPTY_TEXT = {
  ALL: 'Nobody has reported anything yet. Be the first.',
  LOST: 'No lost items are reported right now.',
  FOUND: 'No found items are reported right now.',
};

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const { zones } = useOptions();
  const [filter, setFilter] = useState('ALL');
  const [state, setState] = useState({ phase: 'loading', items: [], message: null });
  const [refreshing, setRefreshing] = useState(false);
  const latestRequest = useRef(0); // so a slow, old answer never replaces a newer one

  const load = useCallback(async (selected, { refresh = false } = {}) => {
    const id = ++latestRequest.current;
    if (refresh) setRefreshing(true);
    else setState((current) => ({ ...current, phase: 'loading' }));
    try {
      const { items } = await listItems({ reportType: selected === 'ALL' ? undefined : selected });
      if (id === latestRequest.current) setState({ phase: 'ready', items, message: null });
    } catch (error) {
      if (id === latestRequest.current) setState({ phase: 'error', items: [], message: error.message || 'Please check your connection.' });
    } finally {
      if (id === latestRequest.current) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(filter);
  }, [filter, load]);

  const header = (
    <View>
      <Text style={styles.greeting}>Hi, {firstName(user && user.fullName) || 'there'}</Text>
      <Text style={styles.lead}>What would you like to do?</Text>

      <View style={styles.actions}>
        <Button title="I lost something" onPress={() => navigation.navigate('Report', { reportType: 'LOST' })} style={styles.action} />
        <Button title="I found something" variant="outline" onPress={() => navigation.navigate('Report', { reportType: 'FOUND' })} style={styles.action} />
      </View>

      <Pressable
        onPress={() => navigation.navigate('Search')}
        accessibilityRole="search"
        accessibilityLabel="Search lost and found items"
        style={styles.search}
      >
        <Ionicons name="search-outline" size={22} color={colors.muted} />
        <Text style={styles.searchText}>Search lost and found items</Text>
      </Pressable>

      <Notice message="Preview: these are sample reports. The real list appears when the app connects to the server." />

      <View style={styles.sectionRow}>
        <Text style={styles.section}>Recent reports</Text>
      </View>
      <View style={styles.chips}>
        {FILTERS.map((option) => (
          <Chip key={option.key} label={option.label} selected={filter === option.key} onPress={() => setFilter(option.key)} />
        ))}
      </View>
    </View>
  );

  let empty = null;
  if (state.phase === 'loading') empty = <LoadingView message="Loading reports…" />;
  else if (state.phase === 'error') empty = <ErrorView message={state.message} onRetry={() => load(filter)} />;
  else if (state.items.length === 0) empty = <EmptyState title="Nothing here yet" message={EMPTY_TEXT[filter]} />;

  return (
    <Screen>
      <FlatList
        testID="items-list"
        data={state.phase === 'ready' ? state.items : []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ItemCard item={item} zones={zones} />}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(filter, { refresh: true })} colors={[colors.primary]} tintColor={colors.primary} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg, flexGrow: 1 },
  greeting: { ...typography.title, color: colors.text },
  lead: { ...typography.body, color: colors.muted, marginTop: spacing.xs, marginBottom: spacing.lg },
  actions: { gap: spacing.md, marginBottom: spacing.lg },
  action: { alignSelf: 'stretch' },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: MIN_TOUCH + 6,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.inputBorder,
    borderRadius: radius.md,
    marginBottom: spacing.lg,
  },
  searchText: { ...typography.body, color: colors.muted },
  sectionRow: { marginTop: spacing.sm, marginBottom: spacing.sm },
  section: { ...typography.heading, color: colors.text },
  chips: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
});
