import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';

// Public Pages
import { LandingPage } from '../pages/public/LandingPage';
import { PrivacyInfoPage } from '../pages/public/PrivacyInfoPage';
import { SecurityInfoPage } from '../pages/public/SecurityInfoPage';
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';

// Authenticated Pages
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { EventsListPage } from '../pages/events/EventsListPage';
import { EventIngestPage } from '../pages/events/EventIngestPage';
import { AlertsListPage } from '../pages/alerts/AlertsListPage';
import { AlertDetailsPage } from '../pages/alerts/AlertDetailsPage';
import { PrivacyDashboardPage } from '../pages/privacy/PrivacyDashboardPage';
import { PrivacyScannerPage } from '../pages/privacy/PrivacyScannerPage';
import { PoliciesListPage } from '../pages/policies/PoliciesListPage';
import { TrustCenterPage } from '../pages/trust/TrustCenterPage';
import { AuditLogsPage } from '../pages/audit/AuditLogsPage';
import { ReportsPage } from '../pages/reports/ReportsPage';
import { MembersPage } from '../pages/members/MembersPage';
import { SettingsPage } from '../pages/settings/SettingsPage';

export const router = createBrowserRouter([
  // Public Routes
  { path: '/', element: <LandingPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/privacy', element: <PrivacyInfoPage /> },
  { path: '/security', element: <SecurityInfoPage /> },

  // Authenticated Protected Routes
  {
    path: '/app',
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'events', element: <EventsListPage /> },
      { path: 'events/ingest', element: <EventIngestPage /> },
      { path: 'alerts', element: <AlertsListPage /> },
      { path: 'alerts/:id', element: <AlertDetailsPage /> },
      { path: 'privacy', element: <PrivacyDashboardPage /> },
      { path: 'privacy/scan', element: <PrivacyScannerPage /> },
      { path: 'policies', element: <PoliciesListPage /> },
      { path: 'trust', element: <TrustCenterPage /> },
      { path: 'audit', element: <AuditLogsPage /> },
      { path: 'reports', element: <ReportsPage /> },
      { path: 'members', element: <MembersPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },

  // Fallback
  { path: '*', element: <Navigate to="/" replace /> },
]);

