import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { api, setCsrfToken, setCurrentOrgId } from '../services/api';
import { User, Organization } from '../types';

export const isClerkEnabled = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);

interface AuthContextType {
  user: User | null;
  currentOrg: Organization | null;
  organizations: Organization[];
  isLoading: boolean;
  isClerkEnabled: boolean;
  login: (credentials: Record<string, string>) => Promise<void>;
  register: (payload: Record<string, string>) => Promise<void>;
  logout: () => Promise<void>;
  switchOrganization: (orgId: string) => void;
  refreshUser: () => Promise<void>;
  setSessionData: (data: {
    user: User | null;
    organization: Organization | null;
    organizations: Organization[];
  }) => void;
  registerClerkSignOut: (fn: (() => Promise<void>) | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const clerkSignOutRef = useRef<(() => Promise<void>) | null>(null);

  const registerClerkSignOut = (fn: (() => Promise<void>) | null) => {
    clerkSignOutRef.current = fn;
  };

  const setSessionData = (data: {
    user: User | null;
    organization: Organization | null;
    organizations: Organization[];
  }) => {
    setUser(data.user);
    setCurrentOrg(data.organization);
    setOrganizations(data.organizations);
    if (data.organization) {
      setCurrentOrgId(data.organization.id);
    }
  };

  // Initialize session and CSRF token on startup
  useEffect(() => {
    const initAuth = async () => {
      try {
        const csrfRes = await api.get('/auth/csrf');
        if (csrfRes.data?.data?.csrfToken) {
          setCsrfToken(csrfRes.data.data.csrfToken);
        }

        // If not using Clerk, check session auth via /auth/me
        if (!isClerkEnabled) {
          const meRes = await api.get('/auth/me');
          if (meRes.data?.data?.user) {
            setUser(meRes.data.data.user);
            setOrganizations(meRes.data.data.organizations || []);
            const active = meRes.data.data.organization || meRes.data.data.organizations?.[0] || null;
            setCurrentOrg(active);
            if (active) setCurrentOrgId(active.id);
          }
        }
      } catch {
        setUser(null);
        setCurrentOrg(null);
        setOrganizations([]);
      } finally {
        if (!isClerkEnabled) {
          setIsLoading(false);
        }
      }
    };

    initAuth();
  }, []);

  const login = async (credentials: Record<string, string>) => {
    const res = await api.post('/auth/login', credentials);
    if (res.data?.data?.user) {
      setUser(res.data.data.user);
      setOrganizations(res.data.data.organizations || []);
      const active = res.data.data.organization || res.data.data.organizations?.[0] || null;
      setCurrentOrg(active);
      if (active) setCurrentOrgId(active.id);
      if (res.data.data.csrfToken) {
        setCsrfToken(res.data.data.csrfToken);
      }
    }
  };

  const register = async (payload: Record<string, string>) => {
    const res = await api.post('/auth/register', payload);
    if (res.data?.data?.user) {
      setUser(res.data.data.user);
      const newOrg = res.data.data.organization;
      if (newOrg) {
        setCurrentOrg(newOrg);
        setOrganizations([newOrg]);
        setCurrentOrgId(newOrg.id);
      }
      if (res.data.data.csrfToken) {
        setCsrfToken(res.data.data.csrfToken);
      }
    }
  };

  const logout = async () => {
    try {
      if (clerkSignOutRef.current) {
        await clerkSignOutRef.current();
      }
      await api.post('/auth/logout');
    } catch {
      // ignore
    } finally {
      setUser(null);
      setCurrentOrg(null);
      setOrganizations([]);
      setCurrentOrgId(null);
      setCsrfToken(null);
    }
  };

  const switchOrganization = (orgId: string) => {
    const selected = organizations.find((o) => o.id === orgId);
    if (selected) {
      setCurrentOrg(selected);
      setCurrentOrgId(selected.id);
    }
  };

  const refreshUser = async () => {
    try {
      const meRes = await api.get('/auth/me');
      if (meRes.data?.data?.user) {
        setUser(meRes.data.data.user);
        setOrganizations(meRes.data.data.organizations || []);
        const active = meRes.data.data.organization || meRes.data.data.organizations?.[0] || null;
        setCurrentOrg(active);
        if (active) setCurrentOrgId(active.id);
      }
    } catch {
      // ignore
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        currentOrg,
        organizations,
        isLoading,
        isClerkEnabled,
        login,
        register,
        logout,
        switchOrganization,
        refreshUser,
        setSessionData,
        registerClerkSignOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
