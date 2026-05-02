'use client';

import { useEffect, useState } from 'react';

type Theme = 'dark' | 'light';

const STORAGE_KEY = 'vh-theme';

/**
 * Tiny brutalist theme toggle. The actual data-theme attribute is
 * also touched by the pre-paint script in layout.tsx, so users who
 * toggled to light on a previous visit don't get a flash of dark
 * before this component hydrates. We set initial state from the DOM
 * (already populated by the pre-paint script) rather than from
 * localStorage directly — keeps source-of-truth in one place.
 */
export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    const current =
      (document.documentElement.dataset.theme as Theme) === 'light'
        ? 'light'
        : 'dark';
    setTheme(current);
    setMounted(true);
  }, []);

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    if (next === 'light') {
      document.documentElement.dataset.theme = 'light';
    } else {
      delete document.documentElement.dataset.theme;
    }
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage may be unavailable (private mode, embedded
      // browsers); the toggle still works for the current session.
    }
  }

  // Reserve space during SSR so the nav layout doesn't shift when
  // the button mounts. Same border + width as the language pill
  // already in the nav.
  if (!mounted) {
    return (
      <span
        aria-hidden
        className="border border-[color:var(--color-line)] px-2 py-1 text-[11px] tracking-[0.1em] inline-block"
        style={{ width: '2.4em', height: '1.9em' }}
      />
    );
  }

  const icon = theme === 'dark' ? '☀' : '☾';
  const label =
    theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="vh-hot border border-[color:var(--color-line)] px-2 py-1 text-[14px] leading-none tracking-[0.1em] hover:border-[color:var(--color-fg)] transition-colors"
    >
      <span aria-hidden>{icon}</span>
    </button>
  );
}
