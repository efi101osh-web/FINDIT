import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import Button from '../components/Button';
import ChoiceChips from '../components/ChoiceChips';
import SelectField from '../components/SelectField';
import ItemCard from '../components/ItemCard';
import { EmptyState, ErrorView, LoadingView } from '../components/StateViews';
import { useOptions } from '../hooks/useOptions';
import { listItems } from '../api/itemsApi';
import { CATEGORY_LABELS, COLOUR_LABELS, labelFor } from '../utils/labels';
import { colors, MIN_TOUCH, radius, spacing, typography } from '../theme';

export const PAGE_SIZE = 20;
const ANY = '';
const SORTS = [
  { value: 'newest', label: 'Newest reports first' },
  { value: 'oldest', label: 'Oldest reports first' },
  { value: 'eventNewest', label: 'Most recent date lost or found' },
  { value: 'eventOldest', label: 'Oldest date lost or found' },
];
const TYPES = [
  { value: ANY, label: 'All' },
  { value: 'LOST', label: 'Lost' },
  { value: 'FOUND', label: 'Found' },
];
const withAny = (anyLabel, list) => [{ value: ANY, label: anyLabel }, ...list];
const asOptions = (codes, labels) => (codes || []).map((code) => ({ value: code, label: labelFor(labels, code) }));

const INITIAL_FILTERS = { reportType: ANY, category: ANY, colour: ANY, location: ANY, sort: 'newest' };

/** Search everyone's reports by words (partial words work) and filters. */
export default function SearchScreen({ navigation }) {
  const { options, zones } = useOptions();
  const [draft, setDraft] = useState('');
  const [query, setQuery] = useState('');
  const [textError, setTextError] = useState(null);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [state, setState] = useState({ phase: 'loading', items: [], meta: null, message: null });
  const [loadingMore, setLoadingMore] = useState(false);
  const latest = useRef(0);

  const run = useCallback(
    async ({ page = 1, append = false } = {}) => {
      const id = ++latest.current;
      if (append) setLoadingMore(true);
      else setState((current) => ({ ...current, phase: 'loading' }));
      try {
        const reply = await listItems({
          q: query || undefined,
          reportType: filters.reportType || undefined,
          category: filters.category || undefined,
          colour: filters.colour || undefined,
          location: filters.location || undefined,
          sort: filters.sort,
          page,
          limit: PAGE_SIZE,
        });
        if (id !== latest.current) return;
        setState((current) => ({ phase: 'ready', items: append ? [...current.items, ...reply.items] : reply.items, meta: reply.meta, message: null }));
      } catch (error) {
        if (id === latest.current) setState({ phase: 'error', items: [], meta: null, message: error.message || 'Please check your connection.' });
      } finally {
        if (id === latest.current) setLoadingMore(false);
      }
    },
    [query, filters]
  );

  useEffect(() => {
    run();
  }, [run]);

  function submit() {
    const text = draft.trim();
    if (text.length === 1) {
      setTextError('Type at least 2 letters.');
      return;
    }
    setTextError(null);
    setQuery(text);
  }

  function clearText() {
    setDraft('');
    setQuery('');
    setTextError(null);
  }

  const setFilter = (field) => (value) => setFilters((current) => ({ ...current, [field]: value }));
  const activeFilters = ['reportType', 'category', 'colour', 'location'].filter((field) => filters[field] !== ANY).length;
  const meta = state.meta;
  const canLoadMore = state.phase === 'ready' && meta && meta.page < meta.totalPages;

  const header = (
    <View>
      <Text style={styles.heading}>Search</Text>
      <View style={[styles.box, textError ? styles.boxError : null]}>
        <Ionicons name="search-outline" size={22} color={colors.muted} />
        <TextInput
          value={draft}
          onChangeText={(text) => {
            setDraft(text);
            if (textError) setTextError(null);
          }}
          onSubmitEditing={submit}
          placeholder="Try: keys, black headphones, Winslow"
          placeholderTextColor={colors.muted}
          accessibilityLabel="Search lost and found items"
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={60}
          style={styles.input}
        />
        {draft ? (
          <Pressable onPress={clearText} accessibilityRole="button" accessibilityLabel="Clear the search" style={styles.clear}>
            <Ionicons name="close-circle" size={22} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>
      {textError ? <Text style={styles.error}>{textError}</Text> : null}
      <Button title="Search" onPress={submit} style={styles.searchButton} />

      <ChoiceChips label="Show" value={filters.reportType} onChange={setFilter('reportType')} options={TYPES} style={styles.typeChips} />
      <Pressable
        onPress={() => setShowFilters((current) => !current)}
        accessibilityRole="button"
        accessibilityState={{ expanded: showFilters }}
        accessibilityLabel={`More filters${activeFilters ? `, ${activeFilters} on` : ''}`}
        style={styles.moreRow}
      >
        <Text style={styles.moreText}>More filters{activeFilters ? ` (${activeFilters} on)` : ''}</Text>
        <Ionicons name={showFilters ? 'chevron-up' : 'chevron-down'} size={20} color={colors.primary} />
      </Pressable>
      {showFilters ? (
        <View>
          <SelectField label="Category" value={filters.category} options={withAny('Any category', asOptions(options && options.categories, CATEGORY_LABELS))} onChange={setFilter('category')} />
          <SelectField label="Colour" value={filters.colour} options={withAny('Any colour', asOptions(options && options.colours, COLOUR_LABELS))} onChange={setFilter('colour')} />
          <SelectField label="Place" value={filters.location} options={withAny('Anywhere', zones.map((zone) => ({ value: zone.code, label: zone.label })))} onChange={setFilter('location')} />
          <SelectField label="Order" value={filters.sort} options={SORTS} onChange={setFilter('sort')} searchable={false} />
          {activeFilters > 0 ? <Button title="Clear filters" variant="text" onPress={() => setFilters((current) => ({ ...INITIAL_FILTERS, sort: current.sort }))} /> : null}
        </View>
      ) : null}
      {state.phase === 'ready' ? (
        <Text style={styles.count} accessibilityLiveRegion="polite">
          {meta.total === 1 ? '1 report' : `${meta.total} reports`}
          {query ? ` for "${query}"` : ''}
        </Text>
      ) : null}
    </View>
  );

  let empty = null;
  if (state.phase === 'loading') empty = <LoadingView message="Searching…" />;
  else if (state.phase === 'error') empty = <ErrorView message={state.message} onRetry={() => run()} />;
  else if (state.items.length === 0) {
    empty = <EmptyState title="No matching reports" message="Try fewer or shorter words, or clear a filter. Partial words work: 'head' finds 'headphones'." />;
  }

  return (
    <Screen>
      <FlatList
        testID="search-results"
        data={state.phase === 'ready' ? state.items : []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ItemCard item={item} zones={zones} onPress={() => navigation.navigate('ItemDetails', { id: item.id })} />}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        ListFooterComponent={canLoadMore ? <Button title="Load more" variant="outline" loading={loadingMore} onPress={() => run({ page: meta.page + 1, append: true })} /> : null}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg, flexGrow: 1 },
  heading: { ...typography.title, color: colors.text, marginBottom: spacing.lg },
  box: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: MIN_TOUCH + 6, paddingHorizontal: spacing.md, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.inputBorder, borderRadius: radius.md },
  boxError: { borderColor: colors.error, borderWidth: 2 },
  input: { ...typography.body, color: colors.text, flex: 1, paddingVertical: spacing.sm },
  clear: { minWidth: MIN_TOUCH, minHeight: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
  error: { ...typography.small, color: colors.errorText, marginTop: spacing.xs },
  searchButton: { marginTop: spacing.md, marginBottom: spacing.lg },
  typeChips: { marginBottom: spacing.sm },
  moreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: MIN_TOUCH, marginBottom: spacing.sm },
  moreText: { ...typography.subheading, color: colors.primary },
  count: { ...typography.small, color: colors.muted, marginVertical: spacing.md },
});
