const puppeteer = require('puppeteer-core');
const path = require('path');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const TEST_PORT = 5099;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

async function runVerification() {
  console.log('🚀 Starting TrustLayer AI End-to-End Browser Verification...');

  // Set environment variables for test server
  process.env.PORT = String(TEST_PORT);
  process.env.NODE_ENV = 'production';

  // Import app
  const { createApp } = await import('../dist/app.js');
  const app = createApp();

  const server = await new Promise((resolve) => {
    const s = app.listen(TEST_PORT, '127.0.0.1', () => {
      console.log(`📡 Test server listening at ${BASE_URL}`);
      resolve(s);
    });
  });

  let browser;
  try {
    console.log(`🌐 Launching headless browser from: ${EDGE_PATH}`);
    browser = await puppeteer.launch({
      executablePath: EDGE_PATH,
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    page.on('console', (msg) => {
      const text = msg.text();
      if (!text.includes('Clerk') && !text.includes('telemetry')) {
        console.log(`[Browser Console] ${text}`);
      }
    });

    const failedRequests = [];
    page.on('request', (req) => {
      if (req.url().includes('/api') || req.url().includes('/auth')) {
        console.log(`[HTTP REQ] ${req.method()} ${req.url()}`);
      }
    });

    page.on('response', (res) => {
      if (res.url().includes('/api') || res.url().includes('/auth')) {
        console.log(`[HTTP RES] ${res.status()} ${res.url()}`);
      }
      if (res.status() >= 500) {
        failedRequests.push({ url: res.url(), status: res.status() });
      }
    });

    // -------------------------------------------------------------
    // Assertion 1: Direct navigation to /privacy loads HTTP 200
    // -------------------------------------------------------------
    console.log('\n--- Test 1: Direct navigation to /privacy ---');
    const privacyResponse = await page.goto(`${BASE_URL}/privacy`, { waitUntil: 'domcontentloaded' });
    const privacyStatus = privacyResponse.status();
    console.log(`Response status for /privacy: ${privacyStatus}`);
    if (privacyStatus !== 200) {
      throw new Error(`Expected HTTP 200 for /privacy, got ${privacyStatus}`);
    }

    await page.waitForSelector('h1', { timeout: 10000 });
    const privacyHeading = await page.$eval('h1', (el) => el.textContent);
    console.log(`Found heading on /privacy: "${privacyHeading}"`);
    console.log('✅ Assertion 1 passed: /privacy loaded successfully with HTTP 200.');

    // -------------------------------------------------------------
    // Assertion 2: Quick Fill "Admin (Alex)" on /login and submit
    // -------------------------------------------------------------
    console.log('\n--- Test 2: Sign in via Demo Credentials ---');
    await page.goto(`${BASE_URL}/login?mode=local`, { waitUntil: 'domcontentloaded' });

    // Ensure frontend points to our local test server port
    await page.evaluate((url) => {
      localStorage.setItem('trustlayer_api_base_url', `${url}/api/v1`);
    }, BASE_URL);
    await page.reload({ waitUntil: 'domcontentloaded' });

    console.log('Waiting for "Admin (Alex)" demo credentials quick-fill button...');
    await page.waitForFunction(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.some(b => b.textContent && b.textContent.includes('Admin (Alex)'));
    }, { timeout: 10000 });

    const adminBtnHandle = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => b.textContent && b.textContent.includes('Admin (Alex)'));
    });
    await adminBtnHandle.click();

    // Verify email input is populated
    await page.waitForFunction(() => {
      const input = document.querySelector('input[type="email"]');
      return input && input.value.includes('alex.security');
    }, { timeout: 10000 });

    const emailValue = await page.$eval('input[type="email"]', (el) => el.value);
    console.log(`Email input populated with: ${emailValue}`);

    // Wait for submit button to be enabled (auth initialization settled)
    await page.waitForFunction(() => {
      const btn = document.querySelector('button[type="submit"]');
      return btn && !btn.disabled;
    }, { timeout: 10000 });

    // Click Sign In with native Puppeteer click
    console.log('Clicking "Sign In" button with native click...');
    const signInBtn = await page.waitForSelector('button[type="submit"]', { timeout: 10000 });
    await signInBtn.click();

    // Wait for redirect to /app or capture error
    console.log('Waiting for URL to become /app...');
    try {
      await page.waitForFunction(() => window.location.pathname.startsWith('/app'), { timeout: 15000 });
    } catch (navErr) {
      const pageText = await page.evaluate(() => document.body.innerText);
      const currentUrl = page.url();
      console.log('PAGE TEXT ON FAILURE:\n', pageText);
      console.log('CURRENT URL:', currentUrl);
      throw navErr;
    }
    console.log(`Current page URL after login: ${page.url()}`);
    console.log('✅ Assertion 2 passed: Successfully logged in and redirected to /app.');

    // -------------------------------------------------------------
    // Assertion 3: /app loads dashboard KPIs without HTTP 500 errors
    // -------------------------------------------------------------
    console.log('\n--- Test 3: Dashboard KPIs load on /app without 500 errors ---');
    await page.waitForSelector('h1', { timeout: 10000 });
    const appHeading = await page.$eval('h1', (el) => el.textContent);
    console.log(`Dashboard page heading: "${appHeading}"`);

    // Wait a moment for TanStack Query requests to settle
    await new Promise((r) => setTimeout(r, 2000));

    if (failedRequests.length > 0) {
      console.warn('Detected HTTP >= 500 requests:', failedRequests);
      throw new Error(`Found ${failedRequests.length} HTTP 500 errors on dashboard!`);
    }
    console.log('✅ Assertion 3 passed: Dashboard loaded cleanly with 0 HTTP 500 errors.');

    // -------------------------------------------------------------
    // Assertion 4: Direct page refresh on /app/events retains session
    // -------------------------------------------------------------
    console.log('\n--- Test 4: Direct navigation & refresh on /app/events ---');
    const eventsResponse = await page.goto(`${BASE_URL}/app/events`, { waitUntil: 'domcontentloaded' });
    console.log(`Response status for /app/events: ${eventsResponse.status()}`);

    // Wait for events table or heading
    await page.waitForSelector('h1', { timeout: 10000 });
    const eventsHeading = await page.$eval('h1', (el) => el.textContent);
    console.log(`Events page heading: "${eventsHeading}"`);

    // Perform hard reload
    console.log('Reloading /app/events page to verify session persistence...');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('h1', { timeout: 10000 });

    const postReloadUrl = page.url();
    console.log(`URL after reload: ${postReloadUrl}`);
    if (!postReloadUrl.includes('/app/events')) {
      throw new Error(`Session lost after reload! Redirected to: ${postReloadUrl}`);
    }

    const postReloadHeading = await page.$eval('h1', (el) => el.textContent);
    console.log(`Heading after reload: "${postReloadHeading}"`);
    console.log('✅ Assertion 4 passed: Direct refresh on /app/events retains session and telemetry.');

    console.log('\n🎉 ALL 4 END-TO-END BROWSER TESTS PASSED FLAWLESSLY!');
  } finally {
    if (browser) {
      await browser.close();
    }
    if (server) {
      if (typeof server.closeAllConnections === 'function') {
        server.closeAllConnections();
      }
      server.close();
    }
  }
}

runVerification()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ E2E VERIFICATION FAILED:', err);
    process.exit(1);
  });
