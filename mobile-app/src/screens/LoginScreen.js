import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Screen from '../components/Screen';
import TextField from '../components/TextField';
import Button from '../components/Button';
import Notice from '../components/Notice';
import { useAuth } from '../context/AuthContext';
import { validateLogin } from '../utils/validation';
import { colors, spacing, typography } from '../theme';

export default function LoginScreen({ navigation }) {
  const { signIn } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [problem, setProblem] = useState(null);
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef(null);

  const change = (field) => (value) => {
    setForm((current) => ({ ...current, [field]: value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  };

  async function submit() {
    const found = validateLogin(form);
    setErrors(found);
    setProblem(null);
    if (Object.keys(found).length > 0) return;
    setLoading(true);
    try {
      await signIn({ email: form.email.trim(), password: form.password });
      // On success the app switches to the main screens by itself.
    } catch (error) {
      setProblem(error.message || 'Could not log in. Please try again.');
      setLoading(false);
    }
  }

  return (
    <Screen scroll edges={['left', 'right']}>
      <Text style={styles.heading}>Welcome back</Text>
      <Text style={styles.lead}>Log in to see and report lost and found items.</Text>
      <Notice message="Preview: there is no server yet, so any valid-looking email and password will open the sample app." />
      {problem ? <Notice tone="error" message={problem} /> : null}
      <TextField
        label="Email"
        value={form.email}
        onChangeText={change('email')}
        error={errors.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
      />
      <TextField
        ref={passwordRef}
        label="Password"
        value={form.password}
        onChangeText={change('password')}
        error={errors.password}
        secure
        autoCapitalize="none"
        autoComplete="password"
        textContentType="password"
        returnKeyType="done"
        onSubmitEditing={submit}
      />
      <Button title="Log in" onPress={submit} loading={loading} />
      <View style={styles.switch}>
        <Text style={styles.switchText}>New to FINDIT?</Text>
        <Button title="Create an account" variant="text" onPress={() => navigation.navigate('Register')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { ...typography.title, color: colors.text, marginTop: spacing.sm },
  lead: { ...typography.body, color: colors.muted, marginTop: spacing.xs, marginBottom: spacing.xl },
  switch: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: spacing.lg },
  switchText: { ...typography.body, color: colors.muted },
});
