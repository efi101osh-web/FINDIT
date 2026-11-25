import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, MIN_TOUCH, radius, spacing, typography } from '../theme';

/**
 * A box that shows the chosen option and, when tapped, opens a full-screen list to choose from.
 * Used for long lists (the campus zones, the halls, the churches). `options` is [{ value, label }].
 * A list of more than 12 gets a search box.
 */
export default function SelectField({ label, value, options, onChange, error, helper, placeholder = 'Choose…', searchable, style }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const selected = options.find((option) => option.value === value);
  const showSearch = searchable === undefined ? options.length > 12 : searchable;

  const shown = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    return needle ? options.filter((option) => option.label.toLowerCase().includes(needle)) : options;
  }, [options, filter]);

  const close = () => {
    setOpen(false);
    setFilter('');
  };
  const choose = (option) => {
    onChange(option.value);
    close();
  };

  return (
    <View style={[styles.wrap, style]}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected ? selected.label : 'not chosen'}`}
        accessibilityHint="Opens a list to choose from"
        style={[styles.box, error ? styles.boxError : null]}
      >
        <Text style={[styles.value, !selected && styles.placeholder]} numberOfLines={2}>
          {selected ? selected.label : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={20} color={colors.muted} />
      </Pressable>
      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : helper ? (
        <Text style={styles.helper}>{helper}</Text>
      ) : null}

      <Modal visible={open} animationType="slide" onRequestClose={close}>
        <SafeAreaView style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle} accessibilityRole="header">
              {label}
            </Text>
            <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Close the list" style={styles.close}>
              <Ionicons name="close" size={26} color={colors.primary} />
            </Pressable>
          </View>
          {showSearch ? (
            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={20} color={colors.muted} />
              <TextInput
                value={filter}
                onChangeText={setFilter}
                placeholder="Type to find…"
                placeholderTextColor={colors.muted}
                accessibilityLabel="Type to find an option"
                autoCorrect={false}
                style={styles.searchInput}
              />
            </View>
          ) : null}
          <FlatList
            data={shown}
            initialNumToRender={Math.max(shown.length, 1)} // these lists are short (at most about 30 names): draw them all
            keyExtractor={(option) => String(option.value)}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={<Text style={styles.none}>Nothing matches. Try different letters.</Text>}
            renderItem={({ item: option }) => {
              const isSelected = option.value === value;
              return (
                <Pressable
                  onPress={() => choose(option)}
                  accessibilityRole="button"
                  accessibilityLabel={option.label}
                  accessibilityState={{ selected: isSelected }}
                  style={[styles.option, isSelected && styles.optionSelected]}
                >
                  <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>{option.label}</Text>
                  {isSelected ? <Ionicons name="checkmark" size={22} color={colors.primary} /> : null}
                </Pressable>
              );
            }}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.lg },
  label: { ...typography.subheading, color: colors.text, marginBottom: spacing.xs },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.inputBorder,
    borderRadius: radius.md,
    minHeight: MIN_TOUCH + 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  boxError: { borderColor: colors.error, borderWidth: 2 },
  value: { ...typography.body, color: colors.text, flex: 1 },
  placeholder: { color: colors.muted },
  error: { ...typography.small, color: colors.errorText, marginTop: spacing.xs },
  helper: { ...typography.small, color: colors.muted, marginTop: spacing.xs },
  sheet: { flex: 1, backgroundColor: colors.background },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg },
  sheetTitle: { ...typography.title, color: colors.text, flex: 1 },
  close: { minWidth: MIN_TOUCH, minHeight: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.inputBorder,
    borderRadius: radius.md,
    minHeight: MIN_TOUCH + 6,
  },
  searchInput: { ...typography.body, color: colors.text, flex: 1, paddingVertical: spacing.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: MIN_TOUCH + 4,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutralTint,
    backgroundColor: colors.surface,
  },
  optionSelected: { backgroundColor: colors.primaryLight },
  optionText: { ...typography.body, color: colors.text, flex: 1, paddingVertical: spacing.sm },
  optionTextSelected: { color: colors.primary, fontWeight: '700' },
  none: { ...typography.body, color: colors.muted, textAlign: 'center', padding: spacing.xl },
});
