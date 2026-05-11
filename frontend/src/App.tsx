import { useState, useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import { Toaster } from './components/ui/sonner';

export type UserRole = 'admin' | 'superadmin' | 'bahw' | 'petOwner' | 'livestockManager' | 'owner' | 'guest' | null;

export interface User {
  id?: string;
  username: string;
  role: UserRole;
  ownerId?: string;
}

export default function App() {
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // Simple health check to confirm backend is up
    fetch('/api/health')
      .then(() => setIsInitializing(false))
      .catch(() => setIsInitializing(false));
  }, []);

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a3a6e] via-[#2B5EA6] to-[#60A85C] flex items-center justify-center">
        <div className="text-center text-white">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-lg font-semibold">Initializing NASaAlaga...</p>
          <p className="text-white/70 text-sm mt-1">Calaca City Veterinary Management System</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <RouterProvider router={router} />
      <Toaster />
    </>
  );
}
