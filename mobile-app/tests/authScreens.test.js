import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { AuthProvider } from '../src/context/AuthContext';
import WelcomeScreen from '../src/screens/WelcomeScreen';
import LoginScreen from '../src/screens/LoginScreen';
import RegisterScreen from '../src/screens/RegisterScreen';
import { makeAuthApi } from './helpers/authApi';

const navigation = () => ({ navigate: jest.fn() });
const show = (Screen, api, nav = navigation()) =>
  render(
    <AuthProvider api={api}>
      <Screen navigation={nav} />
    </AuthProvider>
  );

describe('Welcome', () => {
  test('offers to create an account or log in', async () => {
    const nav = navigation();
    await show(WelcomeScreen, makeAuthApi(), nav);
    expect(screen.getByText('Find. Report. Reclaim.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Create an account' }));
    expect(nav.navigate).toHaveBeenLastCalledWith('Register');
    await fireEvent.press(screen.getByRole('button', { name: 'Log in' }));
    expect(nav.navigate).toHaveBeenLastCalledWith('Login');
  });
});

describe('Login', () => {
  test('an empty form shows what is missing and sends nothing', async () => {
    const api = makeAuthApi();
    await show(LoginScreen, api);
    await fireEvent.press(screen.getByRole('button', { name: 'Log in' }));
    expect(screen.getByText('Enter your email address.')).toBeOnTheScreen();
    expect(screen.getByText('Enter your password.')).toBeOnTheScreen();
    expect(api.login).not.toHaveBeenCalled();
  });

  test('a badly typed email is explained, and the password error is not shown', async () => {
    const api = makeAuthApi();
    await show(LoginScreen, api);
    await fireEvent.changeText(screen.getByLabelText('Email'), 'amina@');
    await fireEvent.changeText(screen.getByLabelText('Password'), 'whatever');
    await fireEvent.press(screen.getByRole('button', { name: 'Log in' }));
    expect(screen.getByText('Enter a valid email address.')).toBeOnTheScreen();
    expect(screen.queryByText('Enter your password.')).toBeNull();
    expect(api.login).not.toHaveBeenCalled();
  });

  test('typing in a field clears that field\'s error', async () => {
    await show(LoginScreen, makeAuthApi());
    await fireEvent.press(screen.getByRole('button', { name: 'Log in' }));
    expect(screen.getByText('Enter your email address.')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText('Email'), 'a');
    expect(screen.queryByText('Enter your email address.')).toBeNull();
    expect(screen.getByText('Enter your password.')).toBeOnTheScreen();
  });

  test('a valid form sends the trimmed email and the exact password', async () => {
    const api = makeAuthApi();
    await show(LoginScreen, api);
    await fireEvent.changeText(screen.getByLabelText('Email'), '  amina@example.com ');
    await fireEvent.changeText(screen.getByLabelText('Password'), ' Sun rise2026 ');
    await fireEvent.press(screen.getByRole('button', { name: 'Log in' }));
    await waitFor(() => expect(api.login).toHaveBeenCalledTimes(1));
    expect(api.login).toHaveBeenCalledWith({ email: 'amina@example.com', password: ' Sun rise2026 ' }); // the password is never trimmed
  });

  test('when the server refuses, its message is shown as an alert and the button works again', async () => {
    const api = makeAuthApi({ login: jest.fn().mockRejectedValue(new Error('Email or password is incorrect.')) });
    await show(LoginScreen, api);
    await fireEvent.changeText(screen.getByLabelText('Email'), 'amina@example.com');
    await fireEvent.changeText(screen.getByLabelText('Password'), 'WrongPass1');
    await fireEvent.press(screen.getByRole('button', { name: 'Log in' }));
    await waitFor(() => expect(screen.getByRole('alert')).toBeOnTheScreen());
    expect(screen.getByText('Email or password is incorrect.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Log in' })).not.toBeDisabled();
    await fireEvent.press(screen.getByRole('button', { name: 'Log in' }));
    await waitFor(() => expect(api.login).toHaveBeenCalledTimes(2));
  });

  test('has a way to the sign-up screen', async () => {
    const nav = navigation();
    await show(LoginScreen, makeAuthApi(), nav);
    await fireEvent.press(screen.getByRole('button', { name: 'Create an account' }));
    expect(nav.navigate).toHaveBeenCalledWith('Register');
  });
});

describe('Register', () => {
  test('explains each problem with the server\'s own wording', async () => {
    const api = makeAuthApi();
    await show(RegisterScreen, api);
    await fireEvent.changeText(screen.getByLabelText('Full name'), 'A');
    await fireEvent.changeText(screen.getByLabelText('Email'), 'nope');
    await fireEvent.changeText(screen.getByLabelText('Password'), 'abcdefgh');
    await fireEvent.press(screen.getByRole('button', { name: 'Create account' }));
    expect(screen.getByText('Name must be at least 2 characters.')).toBeOnTheScreen();
    expect(screen.getByText('Enter a valid email address.')).toBeOnTheScreen();
    expect(screen.getByText('Password must contain at least one number.')).toBeOnTheScreen();
    expect(api.register).not.toHaveBeenCalled();
  });

  test('shows the password rule up front', async () => {
    await show(RegisterScreen, makeAuthApi());
    expect(screen.getByText('At least 8 characters, with a letter and a number.')).toBeOnTheScreen();
  });

  test('sends ONLY the name, email and password (never a role or anything else)', async () => {
    const api = makeAuthApi();
    await show(RegisterScreen, api);
    await fireEvent.changeText(screen.getByLabelText('Full name'), '  Amina Yusuf ');
    await fireEvent.changeText(screen.getByLabelText('Email'), ' amina@example.com ');
    await fireEvent.changeText(screen.getByLabelText('Password'), 'Sunrise2026');
    await fireEvent.press(screen.getByRole('button', { name: 'Create account' }));
    await waitFor(() => expect(api.register).toHaveBeenCalledTimes(1));
    const sent = api.register.mock.calls[0][0];
    expect(sent).toEqual({ fullName: 'Amina Yusuf', email: 'amina@example.com', password: 'Sunrise2026' });
    expect(Object.keys(sent).sort()).toEqual(['email', 'fullName', 'password']);
  });

  test('shows the server\'s refusal, such as an email already in use', async () => {
    const api = makeAuthApi({ register: jest.fn().mockRejectedValue(new Error('That email is already registered.')) });
    await show(RegisterScreen, api);
    await fireEvent.changeText(screen.getByLabelText('Full name'), 'Amina Yusuf');
    await fireEvent.changeText(screen.getByLabelText('Email'), 'amina@example.com');
    await fireEvent.changeText(screen.getByLabelText('Password'), 'Sunrise2026');
    await fireEvent.press(screen.getByRole('button', { name: 'Create account' }));
    await waitFor(() => expect(screen.getByText('That email is already registered.')).toBeOnTheScreen());
  });
});
