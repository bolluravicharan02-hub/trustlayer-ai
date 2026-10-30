import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';

describe('TrustLayer AI Core API Integration', () => {
  const app = createApp();

  it('GET /api/v1/health returns 200 and healthy status', async () => {
    const res = await request(app).get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('healthy');
    expect(res.body.data.app).toBe('TrustLayer AI');
  });

  it('GET /api/v1/auth/csrf provides a synchronizer CSRF token', async () => {
    const res = await request(app).get('/api/v1/auth/csrf');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.csrfToken).toBeDefined();
    expect(typeof res.body.data.csrfToken).toBe('string');
  });

  it('POST /api/v1/auth/register validates registration input fields', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'A', // too short (<2 chars)
        email: 'invalid-email',
        password: 'short', // <12 chars
        confirmPassword: 'mismatch',
        organizationName: '',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /health resolves on root as well as /api/v1/health', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('healthy');
  });

  it('GET /auth/csrf resolves on root as well as /api/v1/auth/csrf', async () => {
    const res = await request(app).get('/auth/csrf');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.csrfToken).toBeDefined();
  });

  it('returns structured JSON 404 for unmatched API routes', async () => {
    const res = await request(app).get('/api/v1/unknown-endpoint');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('API_ENDPOINT_NOT_FOUND');
  });

  it('serves SPA index.html for direct navigation to /privacy, /security, and /app/events', async () => {
    const privacyRes = await request(app).get('/privacy');
    expect(privacyRes.status).toBe(200);
    expect(privacyRes.headers['content-type']).toContain('text/html');

    const securityRes = await request(app).get('/security');
    expect(securityRes.status).toBe(200);
    expect(securityRes.headers['content-type']).toContain('text/html');

    const appRes = await request(app).get('/app/events');
    expect(appRes.status).toBe(200);
    expect(appRes.headers['content-type']).toContain('text/html');
  });

  it('rejects state-changing requests missing CSRF token on protected mutation routes', async () => {
    const res = await request(app)
      .post('/api/v1/privacy/scan')
      .send({ content: 'Test content to scan' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('CSRF_TOKEN_MISSING');
  });
});

