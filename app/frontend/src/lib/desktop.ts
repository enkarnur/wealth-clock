declare global {
  interface Window {
    runtime?: {
      WindowSetAlwaysOnTop?: (value: boolean) => void;
    };
  }
}

export function isDesktopRuntime() {
  return typeof window !== 'undefined' && typeof window.runtime?.WindowSetAlwaysOnTop === 'function';
}

export function applyWindowPreferences(options: { alwaysOnTop: boolean }) {
  if (!isDesktopRuntime()) {
    return false;
  }
  window.runtime?.WindowSetAlwaysOnTop?.(options.alwaysOnTop);
  return true;
}
