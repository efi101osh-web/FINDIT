import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import SearchScreen, { PAGE_SIZE } from '../src/screens/SearchScreen';
import MyReportsScreen from '../src/screens/MyReportsScreen';
import * as itemsApi from '../src/api/itemsApi';
import { createRecord } from '../src/api/previewStore';
import { fire, makeNavigation } from './helpers/navigation';

const showSearch = async () => {
  const navigation = makeNavigation();
  await render(<SearchScreen navigation={navigation} />);
  await waitFor(() => expect(screen.getByText('8 reports')).toBeOnTheScreen());
  return navigation;
};
const searchFor = async (text) => {
  await fireEvent.changeText(screen.getByLabelText('Search lost and found items'), text);
  await fireEvent.press(screen.getByRole('button', { name: 'Search' }));
};
const chooseFrom = async (selectName, optionName) => {
  await fireEvent.press(screen.getByRole('button', { name: selectName }));
  await fireEvent.press(screen.getByRole('button', { name: optionName }));
};
const lost = (n) => ({ reportType: 'LOST', title: `Extra item ${n}`, category: 'OTHER', colour: 'GREY', description: 'Another item for paging.', generalLocation: 'NOT_SURE', dateOccurred: '2026-11-20' });

afterEach(() => jest.restoreAllMocks());

describe('Search', () => {
  test('starts with every active report, newest first', async () => {
    await showSearch();
    expect(screen.getByText('Black wireless headphones')).toBeOnTheScreen();
    expect(screen.getByText('Chemistry textbook')).toBeOnTheScreen();
  });

  test('a partial word finds the report, and the count says how many', async () => {
    await showSearch();
    await searchFor('head');
    await waitFor(() => expect(screen.getByText('1 report for "head"')).toBeOnTheScreen());
    expect(screen.getByText('Black wireless headphones')).toBeOnTheScreen();
    expect(screen.queryByText('Chemistry textbook')).toBeNull();
  });

  test('several words must all match', async () => {
    await showSearch();
    await searchFor('black headphones');
    await waitFor(() => expect(screen.getByText('1 report for "black headphones"')).toBeOnTheScreen());
    await searchFor('headphones red');
    await waitFor(() => expect(screen.getByText('No matching reports')).toBeOnTheScreen());
  });

  test('searching the place works (a hall chosen from the list)', async () => {
    await showSearch();
    await searchFor('winslow');
    await waitFor(() => expect(screen.getByText('Set of keys on a red lanyard')).toBeOnTheScreen());
    expect(screen.queryByText('Grey zip-up hoodie')).toBeNull();
  });

  test('private details are not found by search', async () => {
    await showSearch();
    await searchFor('earcup');
    await waitFor(() => expect(screen.getByText('No matching reports')).toBeOnTheScreen());
  });

  test('a one-letter search is explained and not run', async () => {
    const spy = jest.spyOn(itemsApi, 'listItems');
    await showSearch();
    const calls = spy.mock.calls.length;
    await searchFor('a');
    expect(screen.getByText('Type at least 2 letters.')).toBeOnTheScreen();
    expect(spy.mock.calls.length).toBe(calls);
    await fireEvent.changeText(screen.getByLabelText('Search lost and found items'), 'ab');
    expect(screen.queryByText('Type at least 2 letters.')).toBeNull();
  });

  test('clearing the search brings everything back', async () => {
    await showSearch();
    await searchFor('head');
    await waitFor(() => expect(screen.getByText('1 report for "head"')).toBeOnTheScreen());
    await fireEvent.press(screen.getByRole('button', { name: 'Clear the search' }));
    await waitFor(() => expect(screen.getByText('8 reports')).toBeOnTheScreen());
    expect(screen.getByLabelText('Search lost and found items').props.value).toBe('');
  });

  test('the Lost and Found buttons filter by type', async () => {
    await showSearch();
    await fireEvent.press(screen.getByRole('button', { name: 'Lost' }));
    await waitFor(() => expect(screen.getByText('4 reports')).toBeOnTheScreen());
    await fireEvent.press(screen.getByRole('button', { name: 'Found' }));
    await waitFor(() => expect(screen.getByText('4 reports')).toBeOnTheScreen());
    expect(screen.queryByText('Chemistry textbook')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'All' }));
    await waitFor(() => expect(screen.getByText('8 reports')).toBeOnTheScreen());
  });

  test('more filters: category, colour and place, with a count of how many are on, and a way to clear them', async () => {
    await showSearch();
    expect(screen.queryByRole('button', { name: 'Category: Any category' })).toBeNull(); // hidden until opened
    await fireEvent.press(screen.getByRole('button', { name: 'More filters' }));
    await chooseFrom('Category: Any category', 'Electronics');
    await waitFor(() => expect(screen.getByText('2 reports')).toBeOnTheScreen());
    await chooseFrom('Colour: Any colour', 'Grey');
    await waitFor(() => expect(screen.getByText('1 report')).toBeOnTheScreen());
    expect(screen.getByText('Scientific calculator')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'More filters, 2 on' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Clear filters' }));
    await waitFor(() => expect(screen.getByText('8 reports')).toBeOnTheScreen());
  });

  test('the place filter lists every zone', async () => {
    await showSearch();
    await fireEvent.press(screen.getByRole('button', { name: 'More filters' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Place: Anywhere' }));
    for (const zone of ['Library', 'Halls of residence (male)', 'Church or chapel', 'Gates, roads and parking']) expect(screen.getByRole('button', { name: zone })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Church or chapel' }));
    await waitFor(() => expect(screen.getByText('1 report')).toBeOnTheScreen());
    expect(screen.getByText('Student ID card')).toBeOnTheScreen();
  });

  test('the order can be changed', async () => {
    await showSearch();
    await fireEvent.press(screen.getByRole('button', { name: 'More filters' }));
    await chooseFrom('Order: Newest reports first', 'Oldest reports first');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Order: Oldest reports first' })).toBeOnTheScreen());
    const first = screen.getByTestId('search-results').props.data[0];
    expect(first.id).toBe('s8');
  });

  test('"Load more" adds the next page, and disappears on the last one', async () => {
    for (let n = 1; n <= PAGE_SIZE + 4; n += 1) createRecord(lost(n)); // 8 + 24 = 32 reports
    const navigation = makeNavigation();
    await render(<SearchScreen navigation={navigation} />);
    await waitFor(() => expect(screen.getByText('32 reports')).toBeOnTheScreen());
    expect(screen.getByTestId('search-results').props.data).toHaveLength(PAGE_SIZE);
    await fireEvent.press(screen.getByRole('button', { name: 'Load more' }));
    await waitFor(() => expect(screen.getByTestId('search-results').props.data).toHaveLength(32));
    expect(screen.queryByRole('button', { name: 'Load more' })).toBeNull();
    const ids = screen.getByTestId('search-results').props.data.map((card) => card.id);
    expect(new Set(ids).size).toBe(32); // nothing repeated
  });

  test('a failure is shown with Try again', async () => {
    jest.spyOn(itemsApi, 'listItems').mockRejectedValueOnce(new Error('Could not reach the server.'));
    await render(<SearchScreen navigation={makeNavigation()} />);
    await waitFor(() => expect(screen.getByText('Could not reach the server.')).toBeOnTheScreen());
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(screen.getByText('8 reports')).toBeOnTheScreen());
  });

  test('a slow old search never replaces a newer one', async () => {
    let finishFirst;
    const slow = new Promise((resolve) => {
      finishFirst = resolve;
    });
    const real = itemsApi.listItems;
    jest.spyOn(itemsApi, 'listItems').mockImplementationOnce(() => slow).mockImplementation((query) => real(query));
    await render(<SearchScreen navigation={makeNavigation()} />);
    await searchFor('head');
    await waitFor(() => expect(screen.getByText('1 report for "head"')).toBeOnTheScreen());
    await act(async () => finishFirst({ items: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } }));
    expect(screen.getByText('1 report for "head"')).toBeOnTheScreen(); // the late, empty answer was ignored
  });

  test('tapping a result opens it', async () => {
    const navigation = await showSearch();
    await fireEvent.press(screen.getByRole('button', { name: /Lost: Black wireless headphones/ }));
    expect(navigation.navigate).toHaveBeenCalledWith('ItemDetails', { id: 's1' });
  });
});

describe('My reports', () => {
  const showMine = async () => {
    const navigation = makeNavigation();
    await render(<MyReportsScreen navigation={navigation} />);
    await waitFor(() => expect(screen.getByText('Black wireless headphones')).toBeOnTheScreen());
    return navigation;
  };

  test('lists only my reports', async () => {
    await showMine();
    expect(screen.getByText('Student ID card')).toBeOnTheScreen();
    expect(screen.queryByText('Set of keys on a red lanyard')).toBeNull(); // someone else's
    expect(screen.getAllByText('Your report')).toHaveLength(2);
  });

  test('the chips filter by type, and an empty result offers to report something', async () => {
    const navigation = await showMine();
    await fireEvent.press(screen.getByRole('button', { name: 'Found' }));
    await waitFor(() => expect(screen.getByText('No reports here yet')).toBeOnTheScreen());
    expect(screen.getByText('You have no found reports.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Report something' }));
    expect(navigation.navigate).toHaveBeenCalledWith('Report');
  });

  test('a report I closed stays here, marked Closed', async () => {
    await itemsApi.closeItem('s1', {});
    await showMine();
    expect(screen.getByText('Closed')).toBeOnTheScreen();
  });

  test('a report I just made appears when I come back to the tab', async () => {
    const navigation = await showMine();
    createRecord({ ...lost(1), title: 'Brand new report' });
    await act(async () => fire(navigation, 'focus'));
    await waitFor(() => expect(screen.getByText('Brand new report')).toBeOnTheScreen());
  });

  test('tapping a report opens it', async () => {
    const navigation = await showMine();
    await fireEvent.press(screen.getByRole('button', { name: /Lost: Student ID card/ }));
    expect(navigation.navigate).toHaveBeenCalledWith('ItemDetails', { id: 's5' });
  });

  test('a failure is shown with Try again', async () => {
    jest.spyOn(itemsApi, 'listMine').mockRejectedValueOnce(new Error('Could not reach the server.'));
    await render(<MyReportsScreen navigation={makeNavigation()} />);
    await waitFor(() => expect(screen.getByText('Could not reach the server.')).toBeOnTheScreen());
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(screen.getByText('Black wireless headphones')).toBeOnTheScreen());
  });
});
