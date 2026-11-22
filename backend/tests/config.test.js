'use strict';

// Tests that the settings loader accepts good values and refuses bad ones ("fail fast").

const { loadConfig } = require('../src/config/env');

describe('loadConfig', () => {
  test('uses safe defaults when nothing is set', () => {
    const cfg = loadConfig({});
    expect(cfg.nodeEnv).toBe('development');
    expect(cfg.port).toBe(4000);
    expect(cfg.isProduction).toBe(false);
    expect(cfg.isTest).toBe(false);
  });

  test('reads and trims PORT and NODE_ENV', () => {
    const cfg = loadConfig({ NODE_ENV: ' production ', PORT: ' 5050 ' });
    expect(cfg.nodeEnv).toBe('production');
    expect(cfg.port).toBe(5050);
    expect(cfg.isProduction).toBe(true);
  });

  test.each(['abc', '0', '70000', '3.5', '-1', '4000abc', '1e3'])(
    'refuses invalid PORT "%s"',
    (port) => {
      expect(() => loadConfig({ PORT: port })).toThrow(/Invalid PORT/);
    }
  );

  test('refuses an unknown NODE_ENV', () => {
    expect(() => loadConfig({ NODE_ENV: 'staging' })).toThrow(/Invalid NODE_ENV/);
  });

  test('returns a frozen object that cannot be changed by accident', () => {
    const cfg = loadConfig({});
    expect(Object.isFrozen(cfg)).toBe(true);
  });
});
