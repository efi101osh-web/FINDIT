import { render, screen, fireEvent } from '@testing-library/react-native';
import Button from '../src/components/Button';
import TextField from '../src/components/TextField';
import Chip from '../src/components/Chip';
import Notice from '../src/components/Notice';
import ItemCard from '../src/components/ItemCard';
import { StatusBadge, TypeBadge } from '../src/components/StatusBadge';
import { EmptyState, ErrorView, LoadingView } from '../src/components/StateViews';
import { STATUS_LABELS } from '../src/utils/labels';

const ZONES = [{ code: 'MALE_HALLS', label: 'Halls of residence (male)' }, { code: 'LIBRARY', label: 'Library' }];
const NOW = new Date('2026-11-25T12:00:00.000Z');
const ITEM = {
  id: 'a1', reportType: 'FOUND', title: 'Set of keys on a red lanyard', category: 'KEYS', colour: 'RED',
  generalLocation: 'MALE_HALLS', locationDetail: 'Winslow', dateOccurred: '2026-11-24T00:00:00.000Z',
  status: 'OPEN', image: null, isMine: false, createdAt: '2026-11-24T10:00:00.000Z',
};

describe('Button', () => {
  test('shows its title and calls onPress', async () => {
    const onPress = jest.fn();
    await render(<Button title="Save" onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test('does nothing while disabled', async () => {
    const onPress = jest.fn();
    await render(<Button title="Save" onPress={onPress} disabled />);
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(onPress).not.toHaveBeenCalled();
  });

  test('does nothing while loading (no double sending), and tells a screen reader it is busy', async () => {
    const onPress = jest.fn();
    await render(<Button title="Save" onPress={onPress} loading />);
    const button = screen.getByRole('button', { name: 'Save' });
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
    expect(button).toHaveProp('accessibilityState', { disabled: true, busy: true });
    expect(screen.queryByText('Save')).toBeNull(); // the spinner replaces the words
  });
});

describe('TextField', () => {
  test('shows its label and passes typing on', async () => {
    const onChangeText = jest.fn();
    await render(<TextField label="Email" value="" onChangeText={onChangeText} />);
    await fireEvent.changeText(screen.getByLabelText('Email'), 'a@b.co');
    expect(onChangeText).toHaveBeenCalledWith('a@b.co');
  });

  test('shows an error instead of the helper text', async () => {
    await render(<TextField label="Email" value="" onChangeText={() => {}} helper="Use your own email" error="Enter a valid email address." />);
    expect(screen.getByText('Enter a valid email address.')).toBeOnTheScreen();
    expect(screen.queryByText('Use your own email')).toBeNull();
  });

  test('shows the helper text when there is no error', async () => {
    await render(<TextField label="Password" value="" onChangeText={() => {}} helper="At least 8 characters." />);
    expect(screen.getByText('At least 8 characters.')).toBeOnTheScreen();
  });

  test('a password is hidden, and the eye button shows and hides it', async () => {
    await render(<TextField label="Password" value="secret1A" onChangeText={() => {}} secure />);
    expect(screen.getByLabelText('Password')).toHaveProp('secureTextEntry', true);
    await fireEvent.press(screen.getByRole('button', { name: 'Show password' }));
    expect(screen.getByLabelText('Password')).toHaveProp('secureTextEntry', false);
    await fireEvent.press(screen.getByRole('button', { name: 'Hide password' }));
    expect(screen.getByLabelText('Password')).toHaveProp('secureTextEntry', true);
  });

  test('an ordinary field has no show/hide button', async () => {
    await render(<TextField label="Name" value="" onChangeText={() => {}} />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('badges', () => {
  test('every status shows its plain-English name', async () => {
    for (const [status, label] of Object.entries(STATUS_LABELS)) {
      await render(<StatusBadge status={status} />);
      expect(screen.getByText(label)).toBeOnTheScreen();
      await screen.unmount();
    }
  });
  test('an unknown status does not crash', async () => {
    await render(<StatusBadge status="SOMETHING_NEW" />);
    expect(screen.getByText('Something new')).toBeOnTheScreen();
  });
  test('Lost and Found', async () => {
    await render(<><TypeBadge reportType="LOST" /><TypeBadge reportType="FOUND" /></>);
    expect(screen.getByText('Lost')).toBeOnTheScreen();
    expect(screen.getByText('Found')).toBeOnTheScreen();
  });
});

describe('ItemCard', () => {
  test('shows the public facts of a report in plain words', async () => {
    await render(<ItemCard item={ITEM} zones={ZONES} now={NOW} />);
    expect(screen.getByText('Set of keys on a red lanyard')).toBeOnTheScreen();
    expect(screen.getByText('Keys · Red')).toBeOnTheScreen();
    expect(screen.getByText('Winslow · Halls of residence (male)')).toBeOnTheScreen();
    expect(screen.getByText('Yesterday')).toBeOnTheScreen();
    expect(screen.getByText('Found')).toBeOnTheScreen();
    expect(screen.getByText('Open')).toBeOnTheScreen();
    expect(screen.queryByText('Your report')).toBeNull();
  });

  test('marks your own reports', async () => {
    await render(<ItemCard item={{ ...ITEM, isMine: true }} zones={ZONES} now={NOW} />);
    expect(screen.getByText('Your report')).toBeOnTheScreen();
  });

  test('with no detail it shows the zone name once', async () => {
    await render(<ItemCard item={{ ...ITEM, generalLocation: 'LIBRARY', locationDetail: null }} zones={ZONES} now={NOW} />);
    expect(screen.getAllByText('Library')).toHaveLength(1);
  });

  test('has one spoken description for screen readers, with the key facts', async () => {
    await render(<ItemCard item={ITEM} zones={ZONES} now={NOW} />);
    const label = screen.getByLabelText(/Found: Set of keys on a red lanyard/).props.accessibilityLabel;
    for (const part of ['Keys', 'Red', 'Winslow', 'Yesterday', 'Status Open']) expect(label).toContain(part);
  });

  test('is a button only when it can be opened', async () => {
    const onPress = jest.fn();
    await render(<ItemCard item={ITEM} zones={ZONES} now={NOW} />);
    expect(screen.queryByRole('button')).toBeNull();
    await screen.unmount();
    await render(<ItemCard item={ITEM} zones={ZONES} now={NOW} onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledWith(ITEM);
  });

  test('never shows private-looking fields, even if one were sent by mistake', async () => {
    const leaky = { ...ITEM, privateDetails: 'SECRET-MARK-123', privateStorageLocation: 'VAULT-9', reporterId: 'user-77', reporter: { email: 'who@example.com' } };
    await render(<ItemCard item={leaky} zones={ZONES} now={NOW} />);
    const everything = JSON.stringify(screen.toJSON());
    for (const secret of ['SECRET-MARK-123', 'VAULT-9', 'user-77', 'who@example.com']) expect([secret, everything.includes(secret)]).toEqual([secret, false]);
  });
});

describe('state views', () => {
  test('loading shows its message', async () => {
    await render(<LoadingView message="Loading reports…" />);
    expect(screen.getByText('Loading reports…')).toBeOnTheScreen();
  });
  test('empty shows a title, a message and an optional action', async () => {
    const onAction = jest.fn();
    await render(<EmptyState title="Nothing here yet" message="Be the first." actionTitle="Report" onAction={onAction} />);
    expect(screen.getByText('Nothing here yet')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Report' }));
    expect(onAction).toHaveBeenCalled();
  });
  test('error shows the message and a retry button only when it can retry', async () => {
    const onRetry = jest.fn();
    await render(<ErrorView message="No connection." onRetry={onRetry} />);
    expect(screen.getByText('No connection.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalled();
    await screen.unmount();
    await render(<ErrorView message="No connection." />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('Chip and Notice', () => {
  test('a chip says whether it is selected', async () => {
    const onPress = jest.fn();
    await render(<Chip label="Lost" selected onPress={onPress} />);
    const chip = screen.getByRole('button', { name: 'Lost, selected' });
    expect(chip).toHaveProp('accessibilityState', { selected: true });
    await fireEvent.press(chip);
    expect(onPress).toHaveBeenCalled();
  });
  test('an error notice is announced as an alert; an info notice is not', async () => {
    await render(<><Notice tone="error" message="Wrong password." /><Notice message="Just so you know." /></>);
    expect(screen.getByRole('alert')).toHaveProp('accessibilityLiveRegion', 'assertive');
    expect(screen.getByText('Just so you know.')).toBeOnTheScreen();
  });
});
