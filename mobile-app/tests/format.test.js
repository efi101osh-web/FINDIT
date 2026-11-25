import { firstName, formatDate, formatRelativeDay } from '../src/utils/format';

const NOW = new Date('2026-11-25T14:30:00.000Z');

describe('formatDate', () => {
  test('writes the day, month and year in words, using the UTC day', () => {
    expect(formatDate('2026-11-24T00:00:00.000Z')).toBe('24 Nov 2026');
    expect(formatDate('2026-01-05T00:00:00.000Z')).toBe('5 Jan 2026');
  });
  test('does not shift a day for a phone in another time zone (UTC midnight stays that day)', () => {
    expect(formatDate('2026-03-01T00:00:00.000Z')).toBe('1 Mar 2026');
    expect(formatDate('2026-12-31T00:00:00.000Z')).toBe('31 Dec 2026');
  });
  test('returns an empty string for nonsense instead of "NaN"', () => {
    expect(formatDate('not a date')).toBe('');
    expect(formatDate(undefined)).toBe('');
  });
});

describe('formatRelativeDay', () => {
  test('today, yesterday, a few days ago, then the date', () => {
    expect(formatRelativeDay('2026-11-25T00:00:00.000Z', NOW)).toBe('Today');
    expect(formatRelativeDay('2026-11-24T00:00:00.000Z', NOW)).toBe('Yesterday');
    expect(formatRelativeDay('2026-11-22T00:00:00.000Z', NOW)).toBe('3 days ago');
    expect(formatRelativeDay('2026-11-19T00:00:00.000Z', NOW)).toBe('6 days ago');
    expect(formatRelativeDay('2026-11-18T00:00:00.000Z', NOW)).toBe('18 Nov 2026');
  });
  test('a date a day ahead (a phone clock running early) reads as Today, not "-1 days ago"', () => {
    expect(formatRelativeDay('2026-11-26T00:00:00.000Z', NOW)).toBe('Today');
  });
  test('nonsense gives an empty string', () => {
    expect(formatRelativeDay('nope', NOW)).toBe('');
  });
});

describe('firstName', () => {
  test('takes the first word', () => {
    expect(firstName('Amina Yusuf')).toBe('Amina');
    expect(firstName('  Amina   Yusuf ')).toBe('Amina');
    expect(firstName('Madonna')).toBe('Madonna');
  });
  test('copes with nothing', () => {
    expect(firstName('')).toBe('');
    expect(firstName(undefined)).toBe('');
  });
});
