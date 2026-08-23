declare global {
  interface Window {
    runtime?: {
      WindowSetAlwaysOnTop?: (value: boolean) => void;
      WindowSetSize?: (width: number, height: number) => void;
      WindowCenter?: () => void;
    };
  }
}

export type DesktopWindowPreset = {
  label: string;
  width: number;
  height: number;
};

export const desktopWindowPresets: DesktopWindowPreset[] = [
  { label: '小组件', width: 420, height: 520 },
  { label: '标准', width: 520, height: 720 },
  { label: '宽屏', width: 760, height: 720 },
];

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

export function resizeDesktopWindow(width: number, height: number) {
  if (!isDesktopRuntime() || typeof window.runtime?.WindowSetSize !== 'function') {
    return false;
  }
  window.runtime.WindowSetSize(width, height);
  window.runtime.WindowCenter?.();
  return true;
}
