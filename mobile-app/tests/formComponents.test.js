import { useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react-native';
import SelectField from '../src/components/SelectField';
import ChoiceChips from '../src/components/ChoiceChips';
import DateField from '../src/components/DateField';
import SwitchRow from '../src/components/SwitchRow';
import ReportForm from '../src/components/ReportForm';
import { useReportForm } from '../src/hooks/useReportForm';
import { sampleOptions } from '../src/api/sampleData';
import { previewZones } from '../src/api/previewZones';
import { daysBeforeIso, emptyValues } from '../src/utils/itemValidation';

const FRUIT = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
];
const MANY = Array.from({ length: 20 }, (unused, index) => ({ value: `n${index}`, label: `Option ${index}` }));

describe('SelectField', () => {
  test('shows what is chosen, or a prompt', async () => {
    await render(<SelectField label="Fruit" value="apple" options={FRUIT} onChange={() => {}} />);
    expect(screen.getByText('Apple')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Fruit: Apple' })).toBeOnTheScreen();
    await screen.unmount();
    await render(<SelectField label="Fruit" value={null} options={FRUIT} onChange={() => {}} placeholder="Pick one" />);
    expect(screen.getByText('Pick one')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Fruit: not chosen' })).toBeOnTheScreen();
  });

  test('tapping opens the list; choosing an option reports it and closes the list', async () => {
    const onChange = jest.fn();
    await render(<SelectField label="Fruit" value={null} options={FRUIT} onChange={onChange} />);
    expect(screen.queryByRole('button', { name: 'Banana' })).toBeNull(); // the list is closed
    await fireEvent.press(screen.getByRole('button', { name: 'Fruit: not chosen' }));
    expect(screen.getByRole('button', { name: 'Banana' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Banana' }));
    expect(onChange).toHaveBeenCalledWith('banana');
    expect(screen.queryByRole('button', { name: 'Banana' })).toBeNull();
  });

  test('the close button closes the list without choosing', async () => {
    const onChange = jest.fn();
    await render(<SelectField label="Fruit" value={null} options={FRUIT} onChange={onChange} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Fruit: not chosen' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Close the list' }));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Apple' })).toBeNull();
  });

  test('the chosen option is marked as selected', async () => {
    await render(<SelectField label="Fruit" value="banana" options={FRUIT} onChange={() => {}} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Fruit: Banana' }));
    expect(screen.getByRole('button', { name: 'Banana', selected: true })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Apple', selected: false })).toBeOnTheScreen();
  });

  test('a long list has a search box that narrows it; a short list has none', async () => {
    await render(<SelectField label="Number" value={null} options={MANY} onChange={() => {}} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Number: not chosen' }));
    const search = screen.getByLabelText('Type to find an option');
    await fireEvent.changeText(search, 'option 1');
    expect(screen.getByRole('button', { name: 'Option 1' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Option 12' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Option 2' })).toBeNull();
    await fireEvent.changeText(search, 'zzz');
    expect(screen.getByText('Nothing matches. Try different letters.')).toBeOnTheScreen();
    await screen.unmount();
    await render(<SelectField label="Fruit" value={null} options={FRUIT} onChange={() => {}} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Fruit: not chosen' }));
    expect(screen.queryByLabelText('Type to find an option')).toBeNull();
  });

  test('the search starts fresh each time the list is opened', async () => {
    await render(<SelectField label="Number" value={null} options={MANY} onChange={() => {}} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Number: not chosen' }));
    await fireEvent.changeText(screen.getByLabelText('Type to find an option'), 'option 7');
    await fireEvent.press(screen.getByRole('button', { name: 'Close the list' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Number: not chosen' }));
    expect(screen.getByRole('button', { name: 'Option 3' })).toBeOnTheScreen();
  });

  test('shows an error instead of the hint', async () => {
    await render(<SelectField label="Fruit" value={null} options={FRUIT} onChange={() => {}} helper="A hint" error="Choose a fruit." />);
    expect(screen.getByText('Choose a fruit.')).toBeOnTheScreen();
    expect(screen.queryByText('A hint')).toBeNull();
  });
});

describe('ChoiceChips', () => {
  test('exactly one is selected, and tapping another reports it', async () => {
    const onChange = jest.fn();
    await render(<ChoiceChips label="Time" value="b" onChange={onChange} options={[{ value: 'a', label: 'Aaa' }, { value: 'b', label: 'Bbb' }]} />);
    expect(screen.getByRole('button', { name: 'Bbb, selected' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Aaa' }));
    expect(onChange).toHaveBeenCalledWith('a');
  });
});

describe('DateField', () => {
  const NOW = new Date(2026, 10, 25, 12, 0, 0);
  test('the quick buttons set the date, and the chosen one is highlighted', async () => {
    const onChange = jest.fn();
    await render(<DateField label="When?" value={daysBeforeIso(1, NOW)} onChange={onChange} now={NOW} />);
    expect(screen.getByRole('button', { name: 'Yesterday, selected' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Today' }));
    expect(onChange).toHaveBeenCalledWith('2026-11-25');
    await fireEvent.press(screen.getByRole('button', { name: '3 days ago' }));
    expect(onChange).toHaveBeenLastCalledWith('2026-11-22');
  });
  test('any other date can be typed, and an error is shown', async () => {
    const onChange = jest.fn();
    await render(<DateField label="When?" value="" onChange={onChange} error="The date cannot be in the future." now={NOW} />);
    await fireEvent.changeText(screen.getByLabelText('Or type a date'), '2026-11-14');
    expect(onChange).toHaveBeenCalledWith('2026-11-14');
    expect(screen.getByText('The date cannot be in the future.')).toBeOnTheScreen();
  });
});

describe('SwitchRow', () => {
  test('turns on and off', async () => {
    const onValueChange = jest.fn();
    await render(<SwitchRow label="Handed in" value={false} onValueChange={onValueChange} />);
    await fireEvent(screen.getByLabelText('Handed in'), 'valueChange', true);
    expect(onValueChange).toHaveBeenCalledWith(true);
  });
});

// ---- the whole form ----------------------------------------------------------------------------------

function Harness({ mode = 'create', initial = emptyValues('LOST'), onSubmit = () => {}, problem = null }) {
  const form = useReportForm(initial);
  const [shown, setShown] = useState(0);
  return (
    <ReportForm
      mode={mode}
      values={form.values}
      errors={form.errors}
      setField={(field, value) => {
        setShown((count) => count + 1);
        form.setField(field, value);
      }}
      zones={previewZones}
      options={sampleOptions}
      onSubmit={() => {
        form.check(previewZones);
        onSubmit(form.values);
      }}
      problem={problem}
    />
  );
}
const choose = async (selectName, optionName) => {
  await fireEvent.press(screen.getByRole('button', { name: selectName }));
  await fireEvent.press(screen.getByRole('button', { name: optionName }));
};

describe('ReportForm', () => {
  test('a LOST form asks where it was LOST, and has no found-only boxes', async () => {
    await render(<Harness />);
    expect(screen.getByRole('button', { name: /Where do you think you lost it\?/ })).toBeOnTheScreen();
    expect(screen.getByText('When did you lose it?')).toBeOnTheScreen();
    expect(screen.queryByLabelText('I handed it to an authorised office')).toBeNull();
    expect(screen.queryByLabelText('Where is it kept? (optional)')).toBeNull();
    expect(screen.queryByText(/hand found items to the authorised office/)).toBeNull();
  });

  test('switching to FOUND changes the wording and adds the office switch, the storage box and the advice', async () => {
    await render(<Harness />);
    await fireEvent.press(screen.getByRole('button', { name: 'I found something' }));
    expect(screen.getByRole('button', { name: /Where did you find it\?/ })).toBeOnTheScreen();
    expect(screen.getByLabelText('I handed it to an authorised office')).toBeOnTheScreen();
    expect(screen.getByLabelText('Where is it kept? (optional)')).toBeOnTheScreen();
    expect(screen.getByText(/hand found items to the authorised office/)).toBeOnTheScreen();
  });

  test('in edit mode the type cannot be changed', async () => {
    await render(<Harness mode="edit" />);
    expect(screen.queryByRole('button', { name: 'I found something' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeOnTheScreen();
  });

  test('a list zone (halls) asks you to pick from its list, which has every hall', async () => {
    await render(<Harness />);
    expect(screen.queryByRole('button', { name: /Which hall\?/ })).toBeNull(); // nothing until a zone is chosen
    await choose(/Where do you think you lost it\?/, 'Halls of residence (male)');
    await fireEvent.press(screen.getByRole('button', { name: 'Which hall?: not chosen' }));
    for (const hall of ['Winslow', 'Emerald Hall', 'Topaz Hall', 'Bethel Splendor', 'Not sure which']) expect(screen.getByRole('button', { name: hall })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Nyberg' })).toBeNull(); // a female hall
  });

  test('the churches list is searchable', async () => {
    await render(<Harness />);
    await choose(/Where do you think you lost it\?/, 'Church or chapel');
    await fireEvent.press(screen.getByRole('button', { name: 'Which church or chapel?: not chosen' }));
    await fireEvent.changeText(screen.getByLabelText('Type to find an option'), 'pioneer');
    expect(screen.getByRole('button', { name: 'Pioneer Church' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Youth Church' })).toBeNull();
  });

  test('the library asks for a short description, a cafeteria makes it optional', async () => {
    await render(<Harness />);
    await choose(/Where do you think you lost it\?/, 'Library');
    expect(screen.getByLabelText('More about the place')).toBeOnTheScreen();
    expect(screen.getByText('Which library, and which floor or section?')).toBeOnTheScreen();
    await choose(/Where do you think you lost it\?/, 'Cafeteria and food areas');
    expect(screen.getByLabelText('More about the place (optional)')).toBeOnTheScreen();
    expect(screen.queryByLabelText('More about the place')).toBeNull();
  });

  test('changing the zone clears what was chosen for the old one', async () => {
    await render(<Harness initial={{ ...emptyValues('LOST'), generalLocation: 'MALE_HALLS', locationDetail: 'Winslow' }} />);
    expect(screen.getByRole('button', { name: 'Which hall?: Winslow' })).toBeOnTheScreen();
    await choose(/Where do you think you lost it\?/, 'Halls of residence (female)');
    expect(screen.getByRole('button', { name: 'Which hall?: not chosen' })).toBeOnTheScreen();
  });

  test('submitting an empty form shows a message under every required box', async () => {
    const onSubmit = jest.fn();
    await render(<Harness onSubmit={onSubmit} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Submit report' }));
    for (const message of ['Enter item name.', 'Choose a category.', 'Choose a colour.', 'Enter description.', 'Choose the place.', 'Choose the date.']) {
      expect(screen.getByText(message)).toBeOnTheScreen();
    }
  });

  test('the private box says who can see it', async () => {
    await render(<Harness />);
    expect(screen.getByText(/Only you and administrators can see these/)).toBeOnTheScreen();
    expect(screen.getByLabelText('Private details (optional)')).toBeOnTheScreen();
  });

  test('a problem message is shown at the top', async () => {
    await render(<Harness problem="Please fix the highlighted boxes." />);
    expect(screen.getByRole('alert')).toBeOnTheScreen();
    expect(screen.getByText('Please fix the highlighted boxes.')).toBeOnTheScreen();
  });
});
