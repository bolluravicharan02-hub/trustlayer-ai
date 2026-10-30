import React, { useEffect } from 'react';
import { ClerkProvider, useAuth as useClerkAuth, useUser as useClerkUser } from '@clerk/clerk-react';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';
import { api, setAuthTokenGetter } from '../../services/api';

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const ClerkSyncBridge: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoaded, isSignedIn, getToken, signOut } = useClerkAuth();
  const { user: clerkUser } = useClerkUser();
  const { user, setSessionData, registerClerkSignOut } = useAuth();

  // Register token getter and signOut callback
  useEffect(() => {
    if (getToken) {
      setAuthTokenGetter(getToken);
    }
    if (signOut) {
      registerClerkSignOut(async () => {
        await signOut();
      });
    }
  }, [getToken, signOut, registerClerkSignOut]);

  // Synchronize with backend when Clerk authentication state settles
  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn && clerkUser) {
      const syncWithBackend = async () => {
        try {
          const syncRes = await api.post('/auth/clerk-sync');
          if (syncRes.data?.data?.user) {
            setSessionData({
              user: syncRes.data.data.user,
              organization: syncRes.data.data.organization,
              organizations: syncRes.data.data.organizations || [],
            });
          }
        } catch (err) {
          console.error('Failed to sync Clerk user with backend:', err);
        }
      };
      syncWithBackend();
    } else if (user?.clerkUserId) {
      // Only wipe session if the current active session was established via Clerk
      setSessionData({
        user: null,
        organization: null,
        organizations: [],
      });
    }
  }, [isLoaded, isSignedIn, clerkUser, user?.clerkUserId, setSessionData]);

  return <>{children}</>;
};

export const AppAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (clerkPubKey) {
    return (
      <ClerkProvider publishableKey={clerkPubKey}>
        <AuthProvider>
          <ClerkSyncBridge>{children}</ClerkSyncBridge>
        </AuthProvider>
      </ClerkProvider>
    );
  }

  return <AuthProvider>{children}</AuthProvider>;
};

