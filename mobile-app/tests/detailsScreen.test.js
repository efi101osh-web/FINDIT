import { Alert } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import ItemDetailsScreen from '../src/screens/ItemDetailsScreen';
import * as itemsApi from '../src/api/itemsApi';
import { ApiError } from '../src/api/ApiError';
import { fire, makeNavigation } from './helpers/navigation';

const show = async (id) => {
  const navigation = makeNavigation();
  await render(<ItemDetailsScreen navigation={navigation} route={{ params: { id } }} />);
  return navigation;
};
const ready = (title) => waitFor(() => expect(screen.getByRole('header', { name: title })).toBeOnTheScreen());

afterEach(() => jest.restoreAllMocks());

test('shows a loading message first, then the report', async () => {
  let finish;
  const real = itemsApi.getItem;
  jest.spyOn(itemsApi, 'getItem').mockImplementationOnce(() => new Promise((resolve) => { finish = () => resolve(real('s2')); }));
  await show('s2');
  expect(screen.getByText('Loading the report…')).toBeOnTheScreen();
  await act(async () => finish());
  await ready('Set of keys on a red lanyard');
  expect(screen.queryByText('Loading the report…')).toBeNull();
});

describe('someone else\'s found report (the public view)', () => {
  beforeEach(async () => {
    await show('s2');
    await ready('Set of keys on a red lanyard');
  });

  test('shows the public facts in plain words', () => {
    expect(screen.getByLabelText('Category: Keys')).toBeOnTheScreen();
    expect(screen.getByLabelText('Colour: Red')).toBeOnTheScreen();
    expect(screen.getByLabelText(/Where it was found: Winslow \(Halls of residence \(male\)\)/)).toBeOnTheScreen();
    expect(screen.getByLabelText(/When it was found: .*Morning/)).toBeOnTheScreen();
    expect(screen.getByText('Three keys on a red lanyard, found on a bench outside.')).toBeOnTheScreen();
    expect(screen.getByText('This item was handed to an authorised office.')).toBeOnTheScreen();
    expect(screen.getByText('Found')).toBeOnTheScreen();
    expect(screen.getByText('Open')).toBeOnTheScreen();
  });

  test('shows NOTHING private, and no edit or close buttons', () => {
    expect(screen.queryByText(/Only you and administrators can see this/)).toBeNull();
    expect(screen.queryByText('Private details')).toBeNull();
    expect(screen.queryByText('Where it is kept')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Edit report' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Close report' })).toBeNull();
    expect(screen.queryByText('Your report')).toBeNull();
  });

  test('says honestly that claiming is not available yet', () => {
    expect(screen.getByText('Is this yours? Claiming a found item opens in a later update.')).toBeOnTheScreen();
  });
});

describe('someone else\'s lost report', () => {
  test('has no found-only notices at all', async () => {
    await show('s4');
    await ready('Grey zip-up hoodie');
    expect(screen.queryByText(/authorised office/)).toBeNull();
    expect(screen.queryByText(/Claiming a found item/)).toBeNull();
    expect(screen.getByLabelText(/Where it was lost: Queen Esther/)).toBeOnTheScreen();
  });
});

describe('my own report', () => {
  test('shows my private details, and Edit and Close', async () => {
    const navigation = await show('s1');
    await ready('Black wireless headphones');
    expect(screen.getByText('Your report')).toBeOnTheScreen();
    expect(screen.getByText('Only you and administrators can see this')).toBeOnTheScreen();
    expect(screen.getByText('Small scratch on the left earcup; blue sticker inside the case.')).toBeOnTheScreen();
    expect(screen.getByLabelText('Brand: Sony')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Edit report' }));
    expect(navigation.navigate).toHaveBeenCalledWith('EditReport', { id: 's1' });
  });

  test('a report that is being handled can be neither edited nor closed, and says why', async () => {
    await show('s5');
    await ready('Student ID card');
    expect(screen.getByText('Under verification')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Edit report' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Close report' })).toBeNull();
    expect(screen.getByText(/This report is being handled/)).toBeOnTheScreen();
  });

  test('closing asks first; "Keep it open" does nothing', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await show('s1');
    await ready('Black wireless headphones');
    await fireEvent.press(screen.getByRole('button', { name: 'Close report' }));
    expect(alert).toHaveBeenCalledTimes(1);
    const [title, message, buttons] = alert.mock.calls[0];
    expect(title).toBe('Close this report?');
    expect(message).toMatch(/disappear from the public list/);
    expect(buttons.map((button) => button.text)).toEqual(['Keep it open', 'Close report']);
    expect(buttons[0].style).toBe('cancel');
    expect(buttons[1].style).toBe('destructive');
    expect(screen.getByText('Open')).toBeOnTheScreen(); // nothing happened yet
  });

  test('confirming closes it: the status changes, the buttons go, and the closing is recorded', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await show('s1');
    await ready('Black wireless headphones');
    await fireEvent.press(screen.getByRole('button', { name: 'Close report' }));
    await act(async () => alert.mock.calls[0][2][1].onPress());
    await waitFor(() => expect(screen.getByText('Closed')).toBeOnTheScreen()); // the status badge
    expect(screen.getByText('Closed on')).toBeOnTheScreen(); // the private note says when
    expect(screen.queryByRole('button', { name: 'Edit report' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Close report' })).toBeNull();
  });

  test('if closing fails, the reason is shown and the report stays open', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    jest.spyOn(itemsApi, 'closeItem').mockRejectedValue(new ApiError('This report cannot be closed in its current state.', { status: 409, code: 'INVALID_STATE_TRANSITION' }));
    await show('s1');
    await ready('Black wireless headphones');
    await fireEvent.press(screen.getByRole('button', { name: 'Close report' }));
    await act(async () => alert.mock.calls[0][2][1].onPress());
    await waitFor(() => expect(screen.getByText('This report cannot be closed in its current state.')).toBeOnTheScreen());
    expect(screen.getByRole('button', { name: 'Close report' })).not.toBeDisabled();
  });

  test('coming back from the edit screen shows the changes', async () => {
    const navigation = await show('s1');
    await ready('Black wireless headphones');
    await itemsApi.updateItem('s1', { title: 'Black Sony headphones' });
    await act(async () => fire(navigation, 'focus'));
    await waitFor(() => expect(screen.getByRole('header', { name: 'Black Sony headphones' })).toBeOnTheScreen());
  });
});

describe('when it cannot be shown', () => {
  test('an unknown or closed report: a clear message, and a way back', async () => {
    const navigation = await show('nope');
    await waitFor(() => expect(screen.getByText('This report is not available')).toBeOnTheScreen());
    await fireEvent.press(screen.getByRole('button', { name: 'Go back' }));
    expect(navigation.goBack).toHaveBeenCalled();
  });

  test('a network failure: the message and Try again', async () => {
    jest.spyOn(itemsApi, 'getItem').mockRejectedValueOnce(new Error('Could not reach the server.'));
    await show('s2');
    await waitFor(() => expect(screen.getByText('Could not reach the server.')).toBeOnTheScreen());
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    await ready('Set of keys on a red lanyard');
  });
});
