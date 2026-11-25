import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import App from '../App';

// The whole app, as a person uses it: Welcome -> Log in -> Home -> Profile -> Log out.
// (It uses the built-in preview data, so no server is needed.)

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

// ---- journeys after logging in ---------------------------------------------------------------------

async function logIn() {
  await render(<App />);
  await waitFor(() => expect(screen.getByText('Find. Report. Reclaim.')).toBeOnTheScreen());
  await fireEvent.press(screen.getByRole('button', { name: 'Log in' }));
  await waitFor(() => expect(screen.getByText('Welcome back')).toBeOnTheScreen());
  await fireEvent.changeText(screen.getByLabelText('Email'), 'amina.yusuf@example.com');
  await fireEvent.changeText(screen.getByLabelText('Password'), 'Sunrise2026');
  await fireEvent.press(screen.getByRole('button', { name: 'Log in' }));
  await waitFor(() => expect(screen.getByText('Hi, Amina')).toBeOnTheScreen());
  await waitFor(() => expect(screen.getByText('Black wireless headphones')).toBeOnTheScreen());
}
const openTab = (spoken) => fireEvent.press(screen.getByLabelText(spoken));
const choose = async (selectName, optionName) => {
  await fireEvent.press(screen.getByRole('button', { name: selectName }));
  await fireEvent.press(screen.getByRole('button', { name: optionName }));
};

test('the Home button "I found something" opens the form on Found; a complete report is saved and opened', async () => {
  await logIn();
  await fireEvent.press(screen.getByRole('button', { name: 'I found something' }));
  await waitFor(() => expect(screen.getByRole('button', { name: /Where did you find it\?/ })).toBeOnTheScreen());

  await fireEvent.changeText(screen.getByLabelText('Item name'), 'Blue water flask');
  await choose('Category: not chosen', 'Other');
  await choose('Colour: not chosen', 'Blue');
  await fireEvent.changeText(screen.getByLabelText('Description'), 'A blue steel water flask with a dent.');
  await choose(/Where did you find it\?: not chosen/, 'Halls of residence (male)');
  await choose('Which hall?: not chosen', 'Emerald Hall');
  await fireEvent.press(screen.getByRole('button', { name: 'Today' }));
  await fireEvent.changeText(screen.getByLabelText('Private details (optional)'), 'Sticker of a mountain on the base');
  await fireEvent.press(screen.getByRole('button', { name: 'Submit report' }));

  // the new report opens: public facts, and (because it is mine) the private ones
  await waitFor(() => expect(screen.getByRole('header', { name: 'Blue water flask' })).toBeOnTheScreen());
  expect(screen.getByLabelText(/Where it was found: Emerald Hall/)).toBeOnTheScreen();
  expect(screen.getByText('Your report')).toBeOnTheScreen();
  expect(screen.getByText('Sticker of a mountain on the base')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Edit report' })).toBeOnTheScreen();
});

test('Search: find a report by part of a word, open it, and see only public facts', async () => {
  await logIn();
  await openTab('Search, tab, 2 of 5');
  await waitFor(() => expect(screen.getByLabelText('Search lost and found items')).toBeOnTheScreen());
  await fireEvent.changeText(screen.getByLabelText('Search lost and found items'), 'lanyar');
  await fireEvent.press(screen.getByRole('button', { name: 'Search' }));
  await waitFor(() => expect(screen.getByText('1 report for "lanyar"')).toBeOnTheScreen());
  await fireEvent.press(screen.getByRole('button', { name: /Found: Set of keys on a red lanyard/ }));
  await waitFor(() => expect(screen.getByRole('header', { name: 'Set of keys on a red lanyard' })).toBeOnTheScreen());
  expect(screen.queryByText(/Only you and administrators can see this/)).toBeNull();
  expect(screen.getByText('Is this yours? Claiming a found item opens in a later update.')).toBeOnTheScreen();
});

test('My reports lists my two reports; opening one shows my private details', async () => {
  await logIn();
  await openTab('My reports, tab, 4 of 5');
  await waitFor(() => expect(screen.getByRole('button', { name: /Lost: Student ID card/ })).toBeOnTheScreen());
  expect(screen.queryByText('Set of keys on a red lanyard')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: /Lost: Student ID card/ }));
  await waitFor(() => expect(screen.getByText('There is a small tear at the top left corner.')).toBeOnTheScreen());
});

test('Home: tapping a report opens it', async () => {
  await logIn();
  await fireEvent.press(screen.getByRole('button', { name: /Lost: Grey zip-up hoodie/ }));
  await waitFor(() => expect(screen.getByRole('header', { name: 'Grey zip-up hoodie' })).toBeOnTheScreen());
  expect(screen.queryByRole('button', { name: 'Edit report' })).toBeNull(); // not mine
});
