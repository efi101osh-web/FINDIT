import { Text } from 'react-native';
import { act, render, screen, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { AMINA, makeAuthApi, signedInApi } from './helpers/authApi';

let latest;
function Probe() {
  latest = useAuth();
  return <Text>{`${latest.status}:${latest.user ? latest.user.fullName : 'nobody'}`}</Text>;
}
const mount = (api) => render(<AuthProvider api={api}><Probe /></AuthProvider>);

describe('AuthProvider', () => {
  test('starts "loading", then "signedOut" when no login was saved', async () => {
    await mount(makeAuthApi());
    await waitFor(() => expect(screen.getByText('signedOut:nobody')).toBeOnTheScreen());
  });

  test('is "signedIn" straight away when a saved login is found', async () => {
    await mount(signedInApi());
    await waitFor(() => expect(screen.getByText('signedIn:Amina Yusuf')).toBeOnTheScreen());
  });

  test('a failure while looking for a saved login means "signedOut", never stuck loading', async () => {
    await mount(makeAuthApi({ restoreSession: jest.fn().mockRejectedValue(new Error('storage broke')) }));
    await waitFor(() => expect(screen.getByText('signedOut:nobody')).toBeOnTheScreen());
  });

  test('signIn passes the credentials on and signs in', async () => {
    const api = makeAuthApi();
    await mount(api);
    await waitFor(() => expect(latest.status).toBe('signedOut'));
    await act(async () => {
      await latest.signIn({ email: 'amina@example.com', password: 'Sunrise2026' });
    });
    expect(api.login).toHaveBeenCalledWith({ email: 'amina@example.com', password: 'Sunrise2026' });
    expect(latest.status).toBe('signedIn');
    expect(latest.user).toEqual(AMINA);
  });

  test('a refused login passes the error on and stays signed out', async () => {
    const api = makeAuthApi({ login: jest.fn().mockRejectedValue(new Error('Email or password is incorrect.')) });
    await mount(api);
    await waitFor(() => expect(latest.status).toBe('signedOut'));
    let caught;
    await act(async () => {
      try {
        await latest.signIn({ email: 'a@example.com', password: 'x' });
      } catch (error) {
        caught = error;
      }
    });
    expect(caught.message).toBe('Email or password is incorrect.');
    expect(latest.status).toBe('signedOut');
    expect(latest.user).toBeNull();
  });

  test('signUp signs in the new account', async () => {
    const api = makeAuthApi();
    await mount(api);
    await waitFor(() => expect(latest.status).toBe('signedOut'));
    await act(async () => {
      await latest.signUp({ fullName: 'Amina Yusuf', email: 'amina@example.com', password: 'Sunrise2026' });
    });
    expect(api.register).toHaveBeenCalledTimes(1);
    expect(latest.status).toBe('signedIn');
  });

  test('signOut clears the user and tells the API', async () => {
    const api = signedInApi();
    await mount(api);
    await waitFor(() => expect(latest.status).toBe('signedIn'));
    await act(async () => {
      await latest.signOut();
    });
    expect(api.logout).toHaveBeenCalledTimes(1);
    expect(latest.status).toBe('signedOut');
    expect(latest.user).toBeNull();
    expect(latest.token).toBeNull();
  });

  test('useAuth outside the provider is a clear mistake, not a silent bug', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(render(<Probe />)).rejects.toThrow('useAuth must be used inside <AuthProvider>.');
    spy.mockRestore();
  });
});
