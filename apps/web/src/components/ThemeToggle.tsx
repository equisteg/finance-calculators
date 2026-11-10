'use client';

import { useSyncExternalStore } from 'react';
import { THEME_KEY } from '@/lib/theme';

type Mode = 'light' | 'dark';

function current(): Mode {
  const set = document.documentElement.dataset.theme;
  if (set === 'light' || set === 'dark') return set;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

const CHANGE = 'finealth-theme';
/** Re-render when the switch is used or the device changes mode. */
function subscribe(onChange: () => void) {
  const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
  const fromOtherTab = (e: StorageEvent) => {
    if (e.key !== THEME_KEY) return;
    if (e.newValue === 'light' || e.newValue === 'dark') document.documentElement.dataset.theme = e.newValue;
    else delete document.documentElement.dataset.theme;
    onChange();
  };
  window.addEventListener(CHANGE, onChange);
  window.addEventListener('storage', fromOtherTab);
  mq?.addEventListener?.('change', onChange);
  return () => {
    window.removeEventListener(CHANGE, onChange);
    window.removeEventListener('storage', fromOtherTab);
    mq?.removeEventListener?.('change', onChange);
  };
}

/** Sun / moon switch between the light "Paper" and dark "Espresso" modes. */
export function ThemeToggle() {
  const mode = useSyncExternalStore(subscribe, current, () => null);

  const flip = () => {
    const next: Mode = current() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* private mode: the choice lasts for this page only */
    }
    window.dispatchEvent(new Event(CHANGE));
  };

  const dark = mode === 'dark';
  return (
    <button
      type="button"
      onClick={flip}
      className="theme-toggle"
      data-testid="theme-toggle"
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={dark ? 'Light mode' : 'Dark mode'}
    >
      {dark ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4.2" />
          <path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
        </svg>
      )}
    </button>
  );
}
