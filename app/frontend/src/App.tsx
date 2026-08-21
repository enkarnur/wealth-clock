import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { BUSINESS_ROUTES } from './app-routes';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {BUSINESS_ROUTES.map(({ path, element }) => (
          <Route key={path} path={path} element={element} />
        ))}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
