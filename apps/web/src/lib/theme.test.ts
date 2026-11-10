import { describe, expect, it } from 'vitest';
import { THEME_BOOT, THEME_KEY } from './theme';

/** Runs the <head> boot script against a fake localStorage and <html> element. */
function boot(stored: string | null | Error) {
  const root = { dataset: {} as Record<string, string> };
  const localStorage = {
    getItem: (k: string) => {
      if (stored instanceof Error) throw stored;
      return k === THEME_KEY ? stored : null;
    },
  };
  new Function('localStorage', 'document', THEME_BOOT)(localStorage, { documentElement: root });
  return root.dataset.theme;
}

describe('theme boot script', () => {
  it('applies a saved light or dark choice', () => {
    expect(boot('dark')).toBe('dark');
    expect(boot('light')).toBe('light');
  });
  it('ignores a missing or unknown value, so the device setting wins', () => {
    expect(boot(null)).toBeUndefined();
    expect(boot('bogus')).toBeUndefined();
  });
  it('never throws when storage is blocked', () => {
    expect(() => boot(new Error('SecurityError'))).not.toThrow();
  });
});
