import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import { Provider as JotaiProvider } from 'jotai'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { ThemeProvider } from './contexts/ThemeContext'
import { I18nApp } from './components/I18nApp'

const router = createRouter({ routeTree });

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <JotaiProvider>
      <ThemeProvider>
        <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ''}>
          <QueryClientProvider client={queryClient}>
            <I18nApp router={router} />
          </QueryClientProvider>
        </GoogleOAuthProvider>
      </ThemeProvider>
    </JotaiProvider>
  </StrictMode>
)