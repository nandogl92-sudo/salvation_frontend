import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {AuthProvider} from './auth/AuthContext.tsx';
import './index.css';

if ('serviceWorker' in navigator) {
  void navigator.serviceWorker.register('/sw.js');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);

const boot = document.getElementById('boot');
if (boot) {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      boot.remove();
    });
  });
}
