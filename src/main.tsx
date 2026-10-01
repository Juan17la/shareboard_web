import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import './index.css';
import BoardPage from './pages/Board';
import ShortCodePage from './pages/ShortCode';
import StartPage from './pages/Start';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<StartPage />} />
        {/* Shareable link form: /b/<code> resolves to the canonical board route. */}
        <Route path="/b/:code" element={<ShortCodePage />} />
        <Route path="/board/:id" element={<BoardPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
