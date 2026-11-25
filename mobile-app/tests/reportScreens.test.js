import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import ReportScreen from '../src/screens/ReportScreen';
import EditReportScreen from '../src/screens/EditReportScreen';
import * as itemsApi from '../src/api/itemsApi';
import { ApiError } from '../src/api/ApiError';
import { allRecords } from '../src/api/previewStore';
import { daysBeforeIso } from '../src/utils/itemValidation';
import { makeNavigation } from './helpers/navigation';

const choose = async (selectName, optionName) => {
  await fireEvent.press(screen.getByRole('button', { name: selectName }));
  await fireEvent.press(screen.getByRole('button', { name: optionName }));
};

async function fillLostForm() {
  await fireEvent.changeText(screen.getByLabelText('Item name'), '  Red folding umbrella ');
  await choose('Category: not chosen', 'Other');
  await choose('Colour: not chosen', 'Red');
  await fireEvent.changeText(screen.getByLabelText('Description'), 'A red folding umbrella with a wooden handle.');
  await choose(/Where do you think you lost it\?: not chosen/, 'Library');
  await fireEvent.changeText(screen.getByLabelText('More about the place'), 'Reading room, first floor');
  await fireEvent.press(screen.getByRole('button', { name: 'Yesterday' }));
}

const showReport = async (params) => {
  const navigation = makeNavigation();
  await render(<ReportScreen navigation={navigation} route={{ params }} />);
  await waitFor(() => expect(screen.getByLabelText('Item name')).toBeOnTheScreen());
  return navigation;
};

afterEach(() => jest.restoreAllMocks());

describe('Report screen: making a report', () => {
  test('says that this is a preview, and that the report is kept on the phone only', async () => {
    await showReport();
    expect(screen.getByText(/Preview: reports you make now are kept on this phone only/)).toBeOnTheScreen();
  });

  test('a complete lost report is saved with the cleaned-up values, then opened', async () => {
    const navigation = await showReport();
    await fillLostForm();
    await fireEvent.press(screen.getByRole('button', { name: 'Submit report' }));
    await waitFor(() => expect(navigation.navigate).toHaveBeenCalled());

    const saved = allRecords()[0];
    expect(saved).toMatchObject({
      reportType: 'LOST', title: 'Red folding umbrella', category: 'OTHER', colour: 'RED', generalLocation: 'LIBRARY',
      locationDetail: 'Reading room, first floor', approximateTime: 'UNKNOWN', status: 'OPEN', isMine: true,
    });
    expect(saved.dateOccurred.slice(0, 10)).toBe(daysBeforeIso(1));
    expect(navigation.navigate).toHaveBeenCalledWith('ItemDetails', { id: saved.id });
  });

  test('after saving, the form is empty again for the next report', async () => {
    await showReport();
    await fillLostForm();
    await fireEvent.press(screen.getByRole('button', { name: 'Submit report' }));
    await waitFor(() => expect(screen.getByLabelText('Item name').props.value).toBe(''));
  });

  test('a found report chosen from the Home button starts on "found", and keeps the office details', async () => {
    const navigation = await showReport({ reportType: 'FOUND' });
    expect(screen.getByRole('button', { name: /Where did you find it\?/ })).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText('Item name'), 'Blue water flask');
    await choose('Category: not chosen', 'Other');
    await choose('Colour: not chosen', 'Blue');
    await fireEvent.changeText(screen.getByLabelText('Description'), 'A blue steel water flask with a dent.');
    await choose(/Where did you find it\?: not chosen/, 'Halls of residence (male)');
    await choose('Which hall?: not chosen', 'Winslow');
    await fireEvent.press(screen.getByRole('button', { name: 'Today' }));
    await fireEvent(screen.getByLabelText('I handed it to an authorised office'), 'valueChange', true);
    await fireEvent.changeText(screen.getByLabelText('Where is it kept? (optional)'), 'Security Office, shelf B');
    await fireEvent.press(screen.getByRole('button', { name: 'Submit report' }));
    await waitFor(() => expect(navigation.navigate).toHaveBeenCalled());
    expect(allRecords()[0]).toMatchObject({ reportType: 'FOUND', handedToOffice: true, privateStorageLocation: 'Security Office, shelf B', locationDetail: 'Winslow' });
  });

  test('an incomplete form is not sent, and says what is missing', async () => {
    const navigation = await showReport();
    const before = allRecords().length;
    await fireEvent.changeText(screen.getByLabelText('Item name'), 'ab');
    await fireEvent.press(screen.getByRole('button', { name: 'Submit report' }));
    expect(screen.getByText('Item name must be at least 3 characters.')).toBeOnTheScreen();
    expect(screen.getByText('Choose a category.')).toBeOnTheScreen();
    expect(screen.getByText('Please fix the highlighted boxes.')).toBeOnTheScreen();
    expect(allRecords()).toHaveLength(before);
    expect(navigation.navigate).not.toHaveBeenCalled();
  });

  test('typing in a box clears its message', async () => {
    await showReport();
    await fireEvent.press(screen.getByRole('button', { name: 'Submit report' }));
    expect(screen.getByText('Choose a category.')).toBeOnTheScreen();
    await choose('Category: not chosen', 'Keys');
    expect(screen.queryByText('Choose a category.')).toBeNull();
    expect(screen.getByText('Choose a colour.')).toBeOnTheScreen();
  });

  test('when the server refuses, its message and the fields it names are shown, and nothing is lost', async () => {
    jest.spyOn(itemsApi, 'createItem').mockRejectedValue(new ApiError('Some fields are invalid.', { status: 400, code: 'VALIDATION_ERROR', details: [{ field: 'title', message: 'Item name contains characters that are not allowed.' }] }));
    const navigation = await showReport();
    await fillLostForm();
    await fireEvent.press(screen.getByRole('button', { name: 'Submit report' }));
    await waitFor(() => expect(screen.getByText('Some fields are invalid.')).toBeOnTheScreen());
    expect(screen.getByText('Item name contains characters that are not allowed.')).toBeOnTheScreen();
    expect(screen.getByLabelText('Item name').props.value).toBe('  Red folding umbrella '); // what was typed is still there
    expect(navigation.navigate).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Submit report' })).not.toBeDisabled(); // can try again
  });

  test('a network failure is shown in words', async () => {
    jest.spyOn(itemsApi, 'createItem').mockRejectedValue(new Error('Could not reach the server.'));
    await showReport();
    await fillLostForm();
    await fireEvent.press(screen.getByRole('button', { name: 'Submit report' }));
    await waitFor(() => expect(screen.getByText('Could not reach the server.')).toBeOnTheScreen());
  });
});

describe('Edit screen', () => {
  const showEdit = async (id) => {
    const navigation = makeNavigation();
    await render(<EditReportScreen navigation={navigation} route={{ params: { id } }} />);
    await waitFor(() => expect(screen.getByLabelText('Item name')).toBeOnTheScreen());
    return navigation;
  };

  test('opens with the report\'s own values, including the private ones', async () => {
    await showEdit('s1');
    expect(screen.getByLabelText('Item name').props.value).toBe('Black wireless headphones');
    expect(screen.getByLabelText('Brand (optional)').props.value).toBe('Sony');
    expect(screen.getByLabelText('Private details (optional)').props.value).toContain('Small scratch');
    expect(screen.getByRole('button', { name: 'Category: Electronics' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: /Where do you think you lost it\?: Library/ })).toBeOnTheScreen();
    expect(screen.getByLabelText('More about the place').props.value).toBe('Main library, second floor');
  });

  test('cannot change a lost report into a found one', async () => {
    await showEdit('s1');
    expect(screen.queryByRole('button', { name: 'I found something' })).toBeNull();
  });

  test('saving sends only what changed, then goes back', async () => {
    const spy = jest.spyOn(itemsApi, 'updateItem');
    const navigation = await showEdit('s1');
    await fireEvent.changeText(screen.getByLabelText('Item name'), 'Black Sony headphones');
    await fireEvent.press(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(navigation.goBack).toHaveBeenCalled());
    expect(spy).toHaveBeenCalledWith('s1', { title: 'Black Sony headphones' });
    expect(allRecords().find((record) => record.id === 's1').title).toBe('Black Sony headphones');
  });

  test('emptying an optional box removes it', async () => {
    const spy = jest.spyOn(itemsApi, 'updateItem');
    const navigation = await showEdit('s1');
    await fireEvent.changeText(screen.getByLabelText('Brand (optional)'), '');
    await fireEvent.press(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(navigation.goBack).toHaveBeenCalled());
    expect(spy).toHaveBeenCalledWith('s1', { brand: null });
  });

  test('moving to another zone asks for the new detail and drops the old one', async () => {
    const spy = jest.spyOn(itemsApi, 'updateItem');
    const navigation = await showEdit('s1');
    await choose(/Where do you think you lost it\?: Library/, 'Halls of residence (male)');
    expect(screen.queryByLabelText('More about the place')).toBeNull(); // the library note is gone
    await fireEvent.press(screen.getByRole('button', { name: 'Save changes' }));
    expect(screen.getByText('Choose one. Which hall?')).toBeOnTheScreen(); // a hall must be chosen
    await choose('Which hall?: not chosen', 'Welch');
    await fireEvent.press(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(navigation.goBack).toHaveBeenCalled());
    expect(spy).toHaveBeenCalledWith('s1', { generalLocation: 'MALE_HALLS', locationDetail: 'Welch' });
  });

  test('saving with nothing changed says so and sends nothing', async () => {
    const spy = jest.spyOn(itemsApi, 'updateItem');
    const navigation = await showEdit('s1');
    await fireEvent.press(screen.getByRole('button', { name: 'Save changes' }));
    expect(screen.getByText('Nothing has changed yet.')).toBeOnTheScreen();
    expect(spy).not.toHaveBeenCalled();
    expect(navigation.goBack).not.toHaveBeenCalled();
  });

  test('a mistake is shown and not sent', async () => {
    const spy = jest.spyOn(itemsApi, 'updateItem');
    await showEdit('s1');
    await fireEvent.changeText(screen.getByLabelText('Item name'), 'ab');
    await fireEvent.press(screen.getByRole('button', { name: 'Save changes' }));
    expect(screen.getByText('Item name must be at least 3 characters.')).toBeOnTheScreen();
    expect(spy).not.toHaveBeenCalled();
  });

  test('a report that is being handled cannot be saved: the server\'s reason is shown', async () => {
    const navigation = await showEdit('s5');
    await fireEvent.changeText(screen.getByLabelText('Item name'), 'Student ID card (blue holder)');
    await fireEvent.press(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(screen.getByText('This report can no longer be edited.')).toBeOnTheScreen());
    expect(navigation.goBack).not.toHaveBeenCalled();
  });

  test('a report that cannot be loaded shows an error with a retry', async () => {
    const spy = jest.spyOn(itemsApi, 'getItem').mockRejectedValueOnce(new Error('Could not reach the server.'));
    const navigation = makeNavigation();
    await render(<EditReportScreen navigation={navigation} route={{ params: { id: 's1' } }} />);
    await waitFor(() => expect(screen.getByText('Could not reach the server.')).toBeOnTheScreen());
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(screen.getByLabelText('Item name')).toBeOnTheScreen());
    expect(spy).toHaveBeenCalledTimes(2);
  });
});
