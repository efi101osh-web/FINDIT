import { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, MIN_TOUCH, radius, spacing, typography } from '../theme';

/** A labelled text box with an error message underneath and (for passwords) a show/hide button. */
const TextField = forwardRef(function TextField(
  { label, value, onChangeText, error, helper, secure = false, style, ...inputProps },
  ref
) {
  const [hidden, setHidden] = useState(secure);
  return (
    <View style={[styles.wrap, style]}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.box, error ? styles.boxError : null]}>
        <TextInput
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={hidden}
          placeholderTextColor={colors.muted}
          accessibilityLabel={label}
          style={styles.input}
          {...inputProps}
        />
        {secure ? (
          <Pressable
            onPress={() => setHidden((current) => !current)}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            hitSlop={8}
            style={styles.toggle}
          >
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={22} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : helper ? (
        <Text style={styles.helper}>{helper}</Text>
      ) : null}
    </View>
  );
});

export default TextField;

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.lg },
  label: { ...typography.subheading, color: colors.text, marginBottom: spacing.xs },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.inputBorder, // 3.4:1 against white (documentation/ARCHITECTURE.md section 12)
    borderRadius: radius.md,
    minHeight: MIN_TOUCH + 6,
  },
  boxError: { borderColor: colors.error, borderWidth: 2 },
  input: { flex: 1, ...typography.body, color: colors.text, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  toggle: { minWidth: MIN_TOUCH, minHeight: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
  error: { ...typography.small, color: colors.errorText, marginTop: spacing.xs },
  helper: { ...typography.small, color: colors.muted, marginTop: spacing.xs },
});
