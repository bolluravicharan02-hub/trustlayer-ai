import 'express-session';

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  isActive: boolean;
  clerkUserId?: string;
}

export interface OrganizationContext {
  id: string;
  name: string;
  slug: string;
  role: 'owner' | 'admin' | 'analyst' | 'viewer';
}

declare module 'express-session' {
  interface SessionData {
    userId?: string;
    csrfToken?: string;
    activeOrgId?: string;
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      organization?: OrganizationContext;
    }
  }
}

