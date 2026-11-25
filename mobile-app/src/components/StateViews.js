import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Button from './Button';
import { colors, spacing, typography } from '../theme';

// The three situations every data screen must handle: loading, nothing to show, and failure.

export function LoadingView({ message = 'Loading…' }) {
  return (
    <View style={styles.center} accessibilityLiveRegion="polite">
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

export function EmptyState({ icon = 'search-outline', title, message, actionTitle, onAction }) {
  return (
    <View style={styles.center}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={36} color={colors.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {actionTitle ? <Button title={actionTitle} onPress={onAction} variant="secondary" style={styles.action} /> : null}
    </View>
  );
}

export function ErrorView({ message = 'Something went wrong.', onRetry }) {
  return (
    <View style={styles.center} accessibilityLiveRegion="polite">
      <View style={[styles.iconCircle, styles.errorCircle]}>
        <Ionicons name="alert-circle-outline" size={36} color={colors.errorText} />
      </View>
      <Text style={styles.title}>We could not load this</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? <Button title="Try again" onPress={onRetry} variant="outline" style={styles.action} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  errorCircle: { backgroundColor: colors.errorTint },
  title: { ...typography.heading, color: colors.text, textAlign: 'center' },
  message: { ...typography.body, color: colors.muted, textAlign: 'center', marginTop: spacing.sm },
  action: { marginTop: spacing.lg, alignSelf: 'stretch' },
});
