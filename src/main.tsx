import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from 'next-themes';
import './index.css';
import App from './App.tsx';
// Register AI commands
import './lib/commands/index.ts';

// StrictMode disabled in development due to expensive realtime subscriptions
// It causes intentional double-mounting which triggers duplicate fetches (300ms overhead)
// Re-enable in production or when debugging side effects
createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <App />
    </ThemeProvider>
  </BrowserRouter>
);
