import { StyleSheet, Text, View } from 'react-native';
import Screen from '../components/Screen';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { colors, radius, spacing, typography } from '../theme';
import { expo } from '../../app.json';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const name = (user && user.fullName) || 'Your account';
  return (
    <Screen scroll>
      <View style={styles.header}>
        <View style={styles.avatar} accessible={false}>
          <Text style={styles.initial}>{name.trim().charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>{name}</Text>
        {user && user.email ? <Text style={styles.email}>{user.email}</Text> : null}
      </View>
      <View style={styles.card}>
        <Text style={styles.cardLabel}>App version</Text>
        <Text style={styles.cardValue}>
          {expo.version} (preview)
        </Text>
      </View>
      <Button title="Log out" variant="outline" onPress={signOut} style={styles.logout} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', marginTop: spacing.xl, marginBottom: spacing.xl },
  avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  initial: { ...typography.display, color: colors.white },
  name: { ...typography.title, color: colors.text },
  email: { ...typography.body, color: colors.muted, marginTop: spacing.xs },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.neutralTint },
  cardLabel: { ...typography.small, color: colors.muted },
  cardValue: { ...typography.subheading, color: colors.text, marginTop: spacing.xs },
  logout: { marginTop: spacing.xl },
});
