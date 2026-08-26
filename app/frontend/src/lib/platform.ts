import { Capacitor } from '@capacitor/core';

export function isNativeMobileApp() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

export function shouldUseLocalDataStore() {
  return isNativeMobileApp() || import.meta.env.VITE_FORCE_LOCAL_DATA === 'true';
}
