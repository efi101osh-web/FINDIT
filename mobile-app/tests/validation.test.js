import {
  validateName, validateEmail, validateNewPassword, validateExistingPassword, validateLogin, validateRegister,
} from '../src/utils/validation';
import { describeWithBackend, fromBackend } from './helpers/backend';

describe('name', () => {
  test('2 to 80 characters after trimming', () => {
    expect(validateName('A')).toBe('Name must be at least 2 characters.');
    expect(validateName('  A  ')).toBe('Name must be at least 2 characters.');
    expect(validateName('')).toBe('Name must be at least 2 characters.');
    expect(validateName(undefined)).toBe('Name must be at least 2 characters.');
    expect(validateName('Al')).toBeNull();
    expect(validateName('x'.repeat(80))).toBeNull();
    expect(validateName('x'.repeat(81))).toBe('Name must be at most 80 characters.');
  });
});

describe('email', () => {
  test('accepts ordinary addresses, with stray spaces', () => {
    for (const ok of ['amina@example.com', '  amina@example.com  ', 'a.b+c@babcock.edu.ng', 'AMINA@EXAMPLE.COM']) expect([ok, validateEmail(ok)]).toEqual([ok, null]);
  });
  test('refuses what is clearly not an address', () => {
    for (const bad of ['', '   ', 'amina', 'amina@', '@example.com', 'amina@example', 'amina example@x.com', 'a@b.c']) {
      expect([bad, typeof validateEmail(bad)]).toEqual([bad, 'string']);
    }
    expect(validateEmail('')).toBe('Enter your email address.');
    expect(validateEmail('amina@')).toBe('Enter a valid email address.');
  });
  test('refuses an address over 254 characters', () => {
    expect(validateEmail(`${'a'.repeat(250)}@example.com`)).toBe('Enter a valid email address.');
  });
});

describe('new password (sign-up)', () => {
  test('needs 8 characters, a letter and a number', () => {
    expect(validateNewPassword('Sunrise2026')).toBeNull();
    expect(validateNewPassword('short1')).toBe('Password must be at least 8 characters.');
    expect(validateNewPassword('12345678')).toBe('Password must contain at least one letter.');
    expect(validateNewPassword('abcdefgh')).toBe('Password must contain at least one number.');
    expect(validateNewPassword('')).toBe('Password must be at least 8 characters.');
  });
  test('the limit is 72 BYTES, not characters (the server hashes only the first 72 bytes)', () => {
    expect(validateNewPassword(`a1${'x'.repeat(70)}`)).toBeNull(); // 72 bytes
    expect(validateNewPassword(`a1${'x'.repeat(71)}`)).toBe('Password is too long (72 bytes at most).');
    expect(validateNewPassword(`a1${'é'.repeat(36)}`)).toBe('Password is too long (72 bytes at most).'); // 2 + 36x2 = 74 bytes, only 38 characters
  });
});

describe('existing password (log in)', () => {
  test('has no strength rules, only "not empty" and a sane size', () => {
    expect(validateExistingPassword('x')).toBeNull();
    expect(validateExistingPassword('')).toBe('Enter your password.');
    expect(validateExistingPassword('x'.repeat(200))).toBeNull();
    expect(validateExistingPassword('x'.repeat(201))).toBe('Password is too long.');
  });
});

describe('whole forms', () => {
  test('a good login form has no errors, a bad one lists each field', () => {
    expect(validateLogin({ email: 'a@example.com', password: 'whatever' })).toEqual({});
    expect(validateLogin({ email: '', password: '' })).toEqual({ email: 'Enter your email address.', password: 'Enter your password.' });
  });
  test('a registration form is checked field by field', () => {
    expect(validateRegister({ fullName: 'Amina Yusuf', email: 'a@example.com', password: 'Sunrise2026' })).toEqual({});
    expect(validateRegister({ fullName: 'A', email: 'nope', password: 'abc' })).toEqual({
      fullName: 'Name must be at least 2 characters.',
      email: 'Enter a valid email address.',
      password: 'Password must be at least 8 characters.',
    });
  });
});

describeWithBackend('the app never blocks something the SERVER would accept (and agrees on the obvious refusals)', () => {
  let fields;
  beforeAll(() => {
    fields = fromBackend('src/validators/fields.js');
  });

  const emails = ['amina@example.com', ' Amina@Example.COM ', 'a.b+c@babcock.edu.ng', 'x@y.co', '', 'amina', 'amina@', '@example.com', 'a b@example.com', 'amina@example', `${'a'.repeat(250)}@example.com`];
  const passwords = ['Sunrise2026', 'short1', '12345678', 'abcdefgh', '', `a1${'x'.repeat(70)}`, `a1${'x'.repeat(71)}`, `a1${'é'.repeat(36)}`, 'Pass word 1', 'ÄÖÜß1234a'];
  const names = ['A', 'Al', '  Amina Yusuf  ', 'x'.repeat(80), 'x'.repeat(81), '', 'Bad\u0000Name'];

  test('emails', () => {
    for (const value of emails) {
      const server = fields.email.safeParse(value).success;
      const app = validateEmail(value) === null;
      if (server) expect([value, 'app accepts', app]).toEqual([value, 'app accepts', true]); // never stricter than the server
    }
    for (const bad of ['', 'amina', 'amina@', '@example.com', 'amina@example']) {
      expect([bad, fields.email.safeParse(bad).success, validateEmail(bad) === null]).toEqual([bad, false, false]);
    }
  });

  test('new passwords: the app and the server give the same yes or no', () => {
    for (const value of passwords) {
      expect([value, validateNewPassword(value) === null]).toEqual([value, fields.newPassword.safeParse(value).success]);
    }
  });

  test('names', () => {
    for (const value of names) {
      const server = fields.fullName.safeParse(value).success;
      if (server) expect([value, validateName(value)]).toEqual([value, null]);
    }
    for (const bad of ['A', 'x'.repeat(81), '']) expect([bad, validateName(bad) === null]).toEqual([bad, false]);
  });
});
