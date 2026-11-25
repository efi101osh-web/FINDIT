import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Screen from '../components/Screen';
import TextField from '../components/TextField';
import Button from '../components/Button';
import Notice from '../components/Notice';
import { useAuth } from '../context/AuthContext';
import { validateRegister } from '../utils/validation';
import { colors, spacing, typography } from '../theme';

export default function RegisterScreen({ navigation }) {
  const { signUp } = useAuth();
  const [form, setForm] = useState({ fullName: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [problem, setProblem] = useState(null);
  const [loading, setLoading] = useState(false);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  const change = (field) => (value) => {
    setForm((current) => ({ ...current, [field]: value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  };

  async function submit() {
    const found = validateRegister(form);
    setErrors(found);
    setProblem(null);
    if (Object.keys(found).length > 0) return;
    setLoading(true);
    try {
      await signUp({ fullName: form.fullName.trim(), email: form.email.trim(), password: form.password });
    } catch (error) {
      setProblem(error.message || 'Could not create the account. Please try again.');
      setLoading(false);
    }
  }

  return (
    <Screen scroll edges={['left', 'right']}>
      <Text style={styles.heading}>Create your account</Text>
      <Text style={styles.lead}>It takes a minute. Everyone who signs up is a regular user.</Text>
      <Notice message="Preview: there is no server yet, so no account is really created." />
      {problem ? <Notice tone="error" message={problem} /> : null}
      <TextField
        label="Full name"
        value={form.fullName}
        onChangeText={change('fullName')}
        error={errors.fullName}
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        returnKeyType="next"
        onSubmitEditing={() => emailRef.current?.focus()}
      />
      <TextField
        ref={emailRef}
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
        helper="At least 8 characters, with a letter and a number."
        secure
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="done"
        onSubmitEditing={submit}
      />
      <Button title="Create account" onPress={submit} loading={loading} />
      <View style={styles.switch}>
        <Text style={styles.switchText}>Already have an account?</Text>
        <Button title="Log in" variant="text" onPress={() => navigation.navigate('Login')} />
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
