import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { AuthProvider } from '../src/context/AuthContext';
import HomeScreen from '../src/screens/HomeScreen';
import { fire, makeNavigation } from './helpers/navigation';
import { listItems } from '../src/api/itemsApi';
import { sampleItems } from '../src/api/sampleData';
import { signedInApi } from './helpers/authApi';

jest.mock('../src/api/itemsApi', () => ({ listItems: jest.fn() }));

const reply = (items) => ({ items, meta: { page: 1, limit: 20, total: items.length, totalPages: 1 } });
const deferred = () => {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

async function showHome() {
  const navigation = makeNavigation();
  await render(
    <AuthProvider api={signedInApi()}>
      <HomeScreen navigation={navigation} />
    </AuthProvider>
  );
  return navigation;
}

beforeEach(() => {
  listItems.mockReset();
});

test('greets the person by first name', async () => {
  listItems.mockResolvedValue(reply([]));
  await showHome();
  await waitFor(() => expect(screen.getByText('Hi, Amina')).toBeOnTheScreen());
});

test('shows a loading message first, then the reports', async () => {
  const pending = deferred();
  listItems.mockReturnValue(pending.promise);
  await showHome();
  expect(screen.getByText('Loading reports…')).toBeOnTheScreen();
  await act(async () => pending.resolve(reply(sampleItems.slice(0, 2))));
  expect(screen.queryByText('Loading reports…')).toBeNull();
  expect(screen.getByText('Black wireless headphones')).toBeOnTheScreen();
  expect(screen.getByText('Set of keys on a red lanyard')).toBeOnTheScreen();
});

test('turns place codes into words using the places list', async () => {
  listItems.mockResolvedValue(reply([sampleItems[1]]));
  await showHome();
  await waitFor(() => expect(screen.getByText('Winslow · Halls of residence (male)')).toBeOnTheScreen());
});

test('with no reports it says so, kindly, and does not show an error', async () => {
  listItems.mockResolvedValue(reply([]));
  await showHome();
  await waitFor(() => expect(screen.getByText('Nothing here yet')).toBeOnTheScreen());
  expect(screen.getByText('Nobody has reported anything yet. Be the first.')).toBeOnTheScreen();
  expect(screen.queryByText('We could not load this')).toBeNull();
});

test('when loading fails it shows the problem and "Try again" works', async () => {
  listItems.mockRejectedValueOnce(new Error('Could not reach the server.')).mockResolvedValueOnce(reply([sampleItems[0]]));
  await showHome();
  await waitFor(() => expect(screen.getByText('Could not reach the server.')).toBeOnTheScreen());
  expect(screen.getByText('We could not load this')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
  await waitFor(() => expect(screen.getByText('Black wireless headphones')).toBeOnTheScreen());
  expect(screen.queryByText('We could not load this')).toBeNull();
});

test('the Lost and Found chips ask for just that kind; All asks for everything', async () => {
  listItems.mockResolvedValue(reply([]));
  await showHome();
  await waitFor(() => expect(listItems).toHaveBeenCalledWith({ reportType: undefined }));
  await fireEvent.press(screen.getByRole('button', { name: 'Lost' }));
  await waitFor(() => expect(listItems).toHaveBeenLastCalledWith({ reportType: 'LOST' }));
  expect(screen.getByRole('button', { name: 'Lost, selected' })).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Found' }));
  await waitFor(() => expect(listItems).toHaveBeenLastCalledWith({ reportType: 'FOUND' }));
  await fireEvent.press(screen.getByRole('button', { name: 'All' }));
  await waitFor(() => expect(listItems).toHaveBeenLastCalledWith({ reportType: undefined }));
});

test('the empty message matches the chosen filter', async () => {
  listItems.mockResolvedValue(reply([]));
  await showHome();
  await fireEvent.press(screen.getByRole('button', { name: 'Found' }));
  await waitFor(() => expect(screen.getByText('No found items are reported right now.')).toBeOnTheScreen());
});

test('a slow OLD answer never replaces a newer one', async () => {
  const slowAll = deferred();
  const fastLost = deferred();
  listItems.mockReturnValueOnce(slowAll.promise).mockReturnValueOnce(fastLost.promise);
  await showHome(); // starts loading "All"
  await fireEvent.press(screen.getByRole('button', { name: 'Lost' })); // starts loading "Lost"
  await act(async () => fastLost.resolve(reply([sampleItems[0]]))); // the newer request answers first
  expect(screen.getByText('Black wireless headphones')).toBeOnTheScreen();
  await act(async () => slowAll.resolve(reply([sampleItems[1]]))); // then the old one arrives late
  expect(screen.queryByText('Set of keys on a red lanyard')).toBeNull();
  expect(screen.getByText('Black wireless headphones')).toBeOnTheScreen();
});

test('pulling down to refresh asks again', async () => {
  listItems.mockResolvedValue(reply([sampleItems[0]]));
  await showHome();
  await waitFor(() => expect(screen.getByText('Black wireless headphones')).toBeOnTheScreen());
  const calls = listItems.mock.calls.length;
  await act(async () => {
    screen.getByTestId('items-list').props.refreshControl.props.onRefresh();
  });
  await waitFor(() => expect(listItems.mock.calls.length).toBe(calls + 1));
});

test('the two big buttons and the search box lead to the right tabs', async () => {
  listItems.mockResolvedValue(reply([]));
  const navigation = await showHome();
  await fireEvent.press(screen.getByRole('button', { name: 'I lost something' }));
  expect(navigation.navigate).toHaveBeenLastCalledWith('Report', { reportType: 'LOST' });
  await fireEvent.press(screen.getByRole('button', { name: 'I found something' }));
  expect(navigation.navigate).toHaveBeenLastCalledWith('Report', { reportType: 'FOUND' });
  await fireEvent.press(screen.getByRole('search', { name: 'Search lost and found items' }));
  expect(navigation.navigate).toHaveBeenLastCalledWith('Search');
});

test('says plainly that the reports are a preview', async () => {
  listItems.mockResolvedValue(reply([]));
  await showHome();
  expect(screen.getByText(/Preview: these are sample reports/)).toBeOnTheScreen();
});

test('tapping a report opens it', async () => {
  listItems.mockResolvedValue(reply([sampleItems[1]]));
  const navigation = await showHome();
  await waitFor(() => expect(screen.getByText('Set of keys on a red lanyard')).toBeOnTheScreen());
  await fireEvent.press(screen.getByRole('button', { name: /Found: Set of keys on a red lanyard/ }));
  expect(navigation.navigate).toHaveBeenLastCalledWith('ItemDetails', { id: 's2' });
});

test('coming back to the tab refreshes the list without showing the loading message again', async () => {
  listItems.mockResolvedValueOnce(reply([sampleItems[0]])).mockResolvedValueOnce(reply([sampleItems[0], sampleItems[1]]));
  const navigation = await showHome();
  await waitFor(() => expect(screen.getByText('Black wireless headphones')).toBeOnTheScreen());
  await act(async () => fire(navigation, 'focus'));
  await waitFor(() => expect(screen.getByText('Set of keys on a red lanyard')).toBeOnTheScreen());
  expect(screen.queryByText('Loading reports…')).toBeNull();
});
