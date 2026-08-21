import type { ReactNode } from 'react';
import WealthClockPage from './pages/home';
import SettingsPage from './pages/settings';

export interface AppRouteDefinition {
  path: `/${string}`;
  element: ReactNode;
}

export const BUSINESS_ROUTES: AppRouteDefinition[] = [
  { path: '/', element: <WealthClockPage /> },
  { path: '/settings', element: <SettingsPage /> },
];
