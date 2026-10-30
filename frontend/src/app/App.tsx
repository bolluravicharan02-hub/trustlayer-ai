import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { AppAuthProvider } from '../components/auth/ClerkAuthProvider';
import { router } from './router';
import { Toaster } from 'sonner';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 1000 * 30, // 30 seconds
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AppAuthProvider>
        <RouterProvider router={router} />
        <Toaster position="top-right" richColors theme="dark" />
      </AppAuthProvider>
    </QueryClientProvider>
  );
};

