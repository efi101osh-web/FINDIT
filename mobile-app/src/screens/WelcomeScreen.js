import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import Logo from '../components/Logo';
import Button from '../components/Button';
import { colors, spacing, typography } from '../theme';

const POINTS = [
  { icon: 'hand-left-outline', text: 'Report what you lost or found on campus' },
  { icon: 'sparkles-outline', text: 'See likely matches, with the reasons why' },
  { icon: 'shield-checkmark-outline', text: 'Get it back safely, checked by an administrator' },
];

export default function WelcomeScreen({ navigation }) {
  return (
    <Screen scroll>
      <View style={styles.top}>
        <Logo />
      </View>
      <View style={styles.points}>
        {POINTS.map((point) => (
          <View key={point.icon} style={styles.point}>
            <View style={styles.pointIcon}>
              <Ionicons name={point.icon} size={22} color={colors.primary} />
            </View>
            <Text style={styles.pointText}>{point.text}</Text>
          </View>
        ))}
      </View>
      <View style={styles.actions}>
        <Button title="Create an account" onPress={() => navigation.navigate('Register')} />
        <Button title="Log in" variant="outline" onPress={() => navigation.navigate('Login')} style={styles.second} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { alignItems: 'center', marginTop: spacing.xxl, marginBottom: spacing.xxl },
  points: { gap: spacing.lg, marginBottom: spacing.xxl },
  point: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  pointIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  pointText: { ...typography.body, color: colors.text, flex: 1 },
  actions: { marginTop: 'auto', paddingBottom: spacing.lg },
  second: { marginTop: spacing.md },
});
