import { BrowserRouter, HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { BUSINESS_ROUTES } from './app-routes';
import { isNativeMobileApp } from './lib/platform';

export default function App() {
  const Router = isNativeMobileApp() ? HashRouter : BrowserRouter;

  return (
    <Router>
      <Routes>
        {BUSINESS_ROUTES.map(({ path, element }) => (
          <Route key={path} path={path} element={element} />
        ))}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
