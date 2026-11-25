import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import App from '../App';
import { resetOptionsCache } from '../src/hooks/useOptions';

// The whole app, as a person uses it: Welcome -> Log in -> Home -> Profile -> Log out.
// (It uses the built-in preview data, so no server is needed.)

// The preview API pretends the network is slow so people can SEE the loading states. Tests skip the pause.
jest.mock('../src/api/delay', () => ({ delay: () => Promise.resolve() }));

beforeEach(() => resetOptionsCache());

test('Welcome, log in, see the reports, open the profile, log out', async () => {
  await render(<App />);

  // 1. a logged-out person lands on Welcome
  await waitFor(() => expect(screen.getByText('Find. Report. Reclaim.')).toBeOnTheScreen(), { timeout: 4000 });

  // 2. Log in
  await fireEvent.press(screen.getByRole('button', { name: 'Log in' }));
  await waitFor(() => expect(screen.getByText('Welcome back')).toBeOnTheScreen());
  await fireEvent.changeText(screen.getByLabelText('Email'), 'amina.yusuf@example.com');
  await fireEvent.changeText(screen.getByLabelText('Password'), 'Sunrise2026');
  await fireEvent.press(screen.getByRole('button', { name: 'Log in' }));

  // 3. Home: a greeting from the email, and the sample reports
  await waitFor(() => expect(screen.getByText('Hi, Amina')).toBeOnTheScreen(), { timeout: 4000 });
  await waitFor(() => expect(screen.getByText('Black wireless headphones')).toBeOnTheScreen(), { timeout: 4000 });
  expect(screen.getByText('Recent reports')).toBeOnTheScreen();

  // 4. the five tabs are there
  ['Home, tab, 1 of 5', 'Search, tab, 2 of 5', 'Report, tab, 3 of 5', 'My reports, tab, 4 of 5', 'Profile, tab, 5 of 5'].forEach((spoken) => {
    expect(screen.getByLabelText(spoken)).toBeOnTheScreen(); // this is also what a screen reader says
  });

  // 5. Profile shows who is logged in, then Log out returns to Welcome
  await fireEvent.press(screen.getByLabelText('Profile, tab, 5 of 5'));
  await waitFor(() => expect(screen.getByText('amina.yusuf@example.com')).toBeOnTheScreen());
  await fireEvent.press(screen.getByRole('button', { name: 'Log out' }));
  await waitFor(() => expect(screen.getByText('Find. Report. Reclaim.')).toBeOnTheScreen());
});

test('a form with mistakes does not log in: the person stays on the Login screen', async () => {
  await render(<App />);
  await waitFor(() => expect(screen.getByText('Find. Report. Reclaim.')).toBeOnTheScreen(), { timeout: 4000 });
  await fireEvent.press(screen.getByRole('button', { name: 'Log in' }));
  await waitFor(() => expect(screen.getByText('Welcome back')).toBeOnTheScreen());
  await fireEvent.press(screen.getByRole('button', { name: 'Log in' }));
  expect(screen.getByText('Enter your email address.')).toBeOnTheScreen();
  expect(screen.queryByText('Recent reports')).toBeNull();
});
