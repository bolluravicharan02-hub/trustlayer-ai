# TrustLayer AI - Frontend Client

Enterprise React single-page application for **TrustLayer AI**, designed for Security Analysts, Privacy Officers, and Organization Administrators.

## Architecture

- **Build Tool**: Vite + TypeScript
- **UI Framework**: React 18, React Router v6
- **Styling**: Tailwind CSS with custom dark cybersecurity palette (Navy/Slate/Blue/Teal/Rose)
- **Data Fetching & State**: TanStack Query (React Query)
- **Form Management**: React Hook Form + Zod resolvers
- **Data Visualization**: Recharts (Event timeline, Alert distribution, Privacy categories)
- **Iconography**: Lucide React
- **Notifications**: Sonner

---

## Route Overview

### Public Routes
- `/`: Landing page, product overview, and core security/privacy pillars
- `/login`: Secure user authentication
- `/register`: Account creation and initial organization provisioning
- `/privacy`: Data minimization & privacy practices documentation
- `/security`: Cryptographic verification & security defense architecture

### Authenticated Routes (`/app`)
- `/app`: Real-time KPI Dashboard, security charts, recent activity stream
- `/app/events`: Ingested security event inspector with filters & search
- `/app/events/ingest`: Multi-source event ingestion wizard (JSON, CSV, manual form)
- `/app/events/:id`: Sanitized event details and associated findings
- `/app/alerts`: Alert center, risk scoring, status workflow management
- `/app/alerts/:id`: Incident investigation view, deterministic evidence, AI explanation
- `/app/privacy`: Privacy vulnerability overview
- `/app/privacy/scan`: Live sensitive data scanner with instant redaction diff
- `/app/privacy/scans/:id`: Historical scan results and safe previews
- `/app/policies`: Security & privacy policy manager (Zod validated)
- `/app/trust`: Trust & Transparency Center (AI model details, disclosures, audit records)
- `/app/audit`: Append-only audit log with SHA-256 hash chain verifier
- `/app/reports`: Comprehensive compliance, security, and privacy reporting (JSON/CSV)
- `/app/members`: Organization team management and role administration
- `/app/settings`: Organization configuration and retention parameters

---

## Setup & Running

```bash
# Install dependencies
npm install

# Run Vite dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

