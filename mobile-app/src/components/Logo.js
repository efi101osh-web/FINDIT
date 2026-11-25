import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../theme';

/** The FINDIT mark: a magnifier on a purple tile, the name, and the tagline. */
export default function Logo({ compact = false }) {
  const size = compact ? 48 : 88;
  return (
    <View style={styles.wrap} accessible accessibilityRole="header" accessibilityLabel="FINDIT. Find. Report. Reclaim.">
      <View style={[styles.tile, { width: size, height: size, borderRadius: size * 0.28 }]}>
        <Ionicons name="search" size={size * 0.5} color={colors.white} />
      </View>
      <Text style={[compact ? typography.title : typography.display, styles.name]}>FINDIT</Text>
      {!compact ? <Text style={styles.tagline}>Find. Report. Reclaim.</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  tile: { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  name: { color: colors.primary, letterSpacing: 2 },
  tagline: { ...typography.subheading, color: colors.muted, marginTop: spacing.xs, borderRadius: radius.sm },
});
