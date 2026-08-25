import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '../dashboard/node_modules/playwright/index.mjs';

const baseUrl = process.env.AGENTGATE_CAPTURE_URL || 'http://127.0.0.1:5174';
const outputDir = path.resolve(process.cwd(), 'output', 'playwright', 'new-ui');

const homePayload = {
  health: {
    hermes: { status: 'ok' },
    toolgate: { status: 'ok' },
    memorygate: { status: 'ok' },
  },
  pending_verifications: [
    {
      id: 'vf-1',
      source: 'toolgate',
      source_id: 'approval-817',
      title: 'Approve Friday burger order',
      details: 'Hermes prepared a repeat order for the usual Friday dinner with the boys.',
    },
    {
      id: 'vf-2',
      source: 'hermes',
      source_id: 'decision-22',
      title: 'Send calorie reminder',
      details: 'A scheduled check-in is ready to be sent after tonight training.',
    },
  ],
  suggestions: [
    {
      id: 'sg-1',
      title: 'Shift protein prep to Thursdays',
      summary: 'Your food delivery and gym logs show Friday prep is the point where the plan breaks.',
      confidence: 'high',
    },
    {
      id: 'sg-2',
      title: 'Prebuild boys-night order',
      summary: 'Hermes can draft the recurring burger order and wait for one-tap approval.',
      confidence: 'medium',
    },
  ],
  pinned_apps: [
    { id: 'app-1', name: 'Physique Tracker', url: 'https://apps.local/physique' },
    { id: 'app-2', name: 'Piano Drill', url: 'https://apps.local/piano' },
    { id: 'app-3', name: 'Money Review', url: 'https://apps.local/money' },
  ],
};

const chatsPayload = {
  sessions: [
    {
      id: 'chat-1',
      title: 'Weekly reset',
      preview: 'Let’s review food, money, and training patterns from the last seven days.',
      model: 'gpt-5',
      updated_at: '2026-08-11T20:41:00Z',
    },
    {
      id: 'chat-2',
      title: 'Friday with the boys',
      preview: 'Hermes drafted the recurring burger plan and message.',
      model: 'claude-opus',
      updated_at: '2026-08-11T18:20:00Z',
      parent_id: 'chat-1',
    },
    {
      id: 'chat-3',
      title: 'Deep work setup',
      preview: 'You asked for a cleaner schedule around language, piano, and business work.',
      model: 'gemini-pro',
      updated_at: '2026-08-10T11:05:00Z',
      incognito: true,
    },
  ],
};

const messagesPayload = [
  {
    id: 'm-1',
    role: 'user',
    created_at: '2026-08-11T20:40:00Z',
    content: 'Look at my recent routine and tell me what keeps breaking every Friday.',
  },
  {
    id: 'm-2',
    role: 'assistant',
    created_at: '2026-08-11T20:41:10Z',
    content:
      'Friday fails because the same three events collide: late training, no protein prep, and the boys-night order happens before you decide what fits your calories.',
  },
  {
    id: 'm-3',
    role: 'assistant',
    created_at: '2026-08-11T20:41:30Z',
    content:
      'I would automate two parts only: draft the boys message at 17:00 and prepare a verification-bound repeat order once people confirm.',
  },
];

const verificationsPayload = [
  {
    id: 'verify-1',
    source: 'toolgate',
    source_id: 'approval-817',
    severity: 'warning',
    title: 'Approve repeat burger order',
    details: 'Hermes prepared a 4-person repeat order based on your usual Friday dinner pattern.',
    status: 'pending',
    actor: 'hermes',
    created_at: '2026-08-11T18:44:00Z',
    expires_at: '2026-08-11T19:44:00Z',
    action: {
      service: 'food-delivery',
      operation: 'create_order',
      amount_limit: '35 USD',
      items: ['4 cheeseburgers', '2 large fries', '4 zero colas'],
      payment_token: 'hidden-secret-token',
    },
  },
  {
    id: 'verify-2',
    source: 'hermes',
    source_id: 'decision-22',
    severity: 'normal',
    title: 'Send calorie reminder after training',
    details: 'A quiet post-workout reminder is queued for 21:30.',
    status: 'pending',
    actor: 'hermes',
    created_at: '2026-08-11T17:30:00Z',
    action: {
      type: 'message',
      destination: 'mobile',
      body: 'Protein first. Burger later if it still fits.',
    },
  },
  {
    id: 'verify-3',
    source: 'toolgate',
    source_id: 'approval-799',
    severity: 'normal',
    title: 'Archive old card statement export',
    details: 'Completed after you approved the retention cleanup.',
    status: 'approved',
    actor: 'owner',
    created_at: '2026-08-10T10:00:00Z',
    action: { service: 'banking', operation: 'archive_export' },
  },
];

const suggestionsPayload = [
  {
    id: 'sug-1',
    title: 'Build a Friday buffer',
    summary: 'Move meal prep and checkout decisions earlier so social plans do not derail calories.',
    category: 'health',
    confidence: 'high',
    urgency: 'medium',
    status: 'new',
  },
  {
    id: 'sug-2',
    title: 'Create a reusable boys-night automation',
    summary: 'Hermes can ask the group if they are eating, wait for replies, then draft the order for your approval.',
    category: 'automation',
    confidence: 'high',
    urgency: 'high',
    status: 'saved',
  },
  {
    id: 'sug-3',
    title: 'Review spending after social nights',
    summary: 'A Monday morning check could surface waste without nagging you in the moment.',
    category: 'finance',
    confidence: 'medium',
    urgency: 'low',
    status: 'acted',
  },
];

const appsPayload = [
  {
    id: 'app-1',
    name: 'Physique Tracker',
    description: 'Training notes, calorie trend, and weekly check-ins.',
    source: 'agentgate',
    url: 'https://apps.local/physique',
    status: 'healthy',
    pinned: true,
    updated_at: '2026-08-11T15:00:00Z',
  },
  {
    id: 'app-2',
    name: 'Piano Drill',
    description: 'Finger-speed exercises and consistency tracking.',
    source: 'agentgate',
    url: 'https://apps.local/piano',
    status: 'available',
    pinned: true,
    updated_at: '2026-08-11T09:00:00Z',
  },
  {
    id: 'app-3',
    name: 'Money Review',
    description: 'Private weekly bank-summary board with anomalies and ideas.',
    source: 'manual',
    url: 'https://apps.local/money',
    status: 'offline',
    pinned: false,
    updated_at: '2026-08-10T21:00:00Z',
  },
];

const toolgatePayload = {
  status: { lockdown: false },
  tools: [
    { id: 'send_message', name: 'Send Message', description: 'Drafts and sends approval-bound messages to your connected services.', authorization: 'approval' },
    { id: 'order_food', name: 'Order Food', description: 'Creates repeat food orders with spending limits and one-time verification.', authorization: 'approval' },
    { id: 'calendar_lookup', name: 'Calendar Lookup', description: 'Reads your schedule to avoid clashes before acting.', authorization: 'read' },
  ],
  automations: [{ id: 'boys-night' }, { id: 'gym-followup' }],
  services: [{ id: 'telegram' }, { id: 'banking' }, { id: 'food-delivery' }],
};

const memorygatePayload = {
  briefing: {
    focus: ['calorie consistency', 'business momentum', 'piano reps'],
    current_risks: ['late-night ordering', 'overpacked Fridays'],
  },
  memories: [
    { id: 'mem-1', title: 'Friday dinners often become unplanned', content: 'Social food is easier when the order is standardized and approval-bound.' },
    { id: 'mem-2', title: 'Morning training increases compliance', content: 'Workouts completed before noon are the least likely to be skipped.' },
  ],
  patterns: [
    { id: 'pt-1', pattern_name: 'Boys-night repeat', description: 'Weekly social event with similar participants, food, and timing.' },
    { id: 'pt-2', pattern_name: 'Post-training reflection', description: 'You respond well to short, practical suggestions after workouts.' },
  ],
};

const cronPayload = {
  jobs: [
    {
      id: 'cron-1',
      name: 'Friday pattern review',
      schedule: '0 14 * * fri',
      prompt: 'Review this week and tell me what will most likely break tonight.',
      deliver: 'local',
      next_run_at: '2026-08-14 14:00',
      last_run_at: '2026-08-07 14:00',
      paused: false,
    },
    {
      id: 'cron-2',
      name: 'Monday finance pulse',
      schedule: '0 09 * * mon',
      prompt: 'Summarize spending anomalies and suggest one correction only.',
      deliver: 'local',
      next_run_at: '2026-08-17 09:00',
      last_run_at: '2026-08-10 09:00',
      paused: true,
    },
  ],
};

const characterPayload = {
  name: 'Hermes',
  owner_name: 'Alex',
  avatar_url: '',
  personality: 'Quietly sharp, teasing in a warm way, practical under pressure.',
  background: 'A personal operator built to help Alex make cleaner decisions and compound good habits.',
  speaking_style: 'Short, direct, supportive, and concrete.',
  boundaries: 'Never spend money, contact people, or expose private info without explicit approval.',
  context_preview:
    'Hermes helps Alex improve body, work, money, and skill growth. It should prefer calm suggestions, clear next steps, and approval before meaningful action.',
};

const memorySearchPayload = {
  items: [
    {
      id: 'search-1',
      title: 'Pattern: Friday dinners',
      content: 'The same social dinner usually starts with one short check-in message and ends with a repeat order.',
    },
    {
      id: 'search-2',
      title: 'Preference: teasing style',
      content: 'Light teasing lands well when it stays warm and practical.',
    },
  ],
};

const routeJson = (payload, status = 200, headers = {}) => ({
  status,
  contentType: 'application/json',
  headers,
  body: JSON.stringify(payload),
});

async function fulfillApi(route, options = {}) {
  await route.fulfill(routeJson(options.payload ?? {}, options.status ?? 200, options.headers ?? {}));
}

async function mockAgentgateApi(page, mode) {
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const { pathname } = url;
    const method = request.method();

    if (pathname === '/api/auth/session') {
      if (mode === 'logged-out') {
        await fulfillApi(route, { payload: { detail: 'Unauthorized' }, status: 401 });
        return;
      }
      await fulfillApi(route, { payload: { ok: true } });
      return;
    }

    if (pathname === '/api/auth/login' && method === 'POST') {
      await fulfillApi(route, {
        payload: { ok: true },
        headers: { 'Set-Cookie': 'agentgate_csrf=fake-token; Path=/; SameSite=Lax' },
      });
      return;
    }

    if (pathname === '/api/auth/logout' && method === 'POST') {
      await fulfillApi(route, { payload: { ok: true } });
      return;
    }

    if (mode === 'logged-out') {
      await fulfillApi(route, { payload: { detail: 'Unauthorized' }, status: 401 });
      return;
    }

    if (pathname === '/api/home') return fulfillApi(route, { payload: homePayload });
    if (pathname === '/api/chats' && method === 'GET') return fulfillApi(route, { payload: chatsPayload });
    if (pathname === '/api/chats' && method === 'POST') return fulfillApi(route, { payload: { id: 'chat-new' } });
    if (pathname === '/api/chats/chat-1/messages') return fulfillApi(route, { payload: messagesPayload });
    if (pathname === '/api/chats/chat-2/messages') return fulfillApi(route, { payload: messagesPayload });
    if (pathname === '/api/chats/chat-3/messages') return fulfillApi(route, { payload: messagesPayload });
    if (pathname.endsWith('/fork')) return fulfillApi(route, { payload: { id: 'chat-fork' } });
    if (pathname === '/api/verifications') return fulfillApi(route, { payload: verificationsPayload });
    if (pathname === '/api/suggestions') return fulfillApi(route, { payload: suggestionsPayload });
    if (pathname === '/api/apps') return fulfillApi(route, { payload: appsPayload });
    if (pathname === '/api/gates/toolgate') return fulfillApi(route, { payload: toolgatePayload });
    if (pathname === '/api/gates/memorygate') return fulfillApi(route, { payload: memorygatePayload });
    if (pathname === '/api/gates/memorygate/search') return fulfillApi(route, { payload: memorySearchPayload });
    if (pathname === '/api/cron/jobs') return fulfillApi(route, { payload: cronPayload });
    if (pathname === '/api/character') return fulfillApi(route, { payload: characterPayload });
    if (pathname.startsWith('/api/chats/') && method === 'PATCH') return fulfillApi(route, { payload: { ok: true } });
    if (pathname.startsWith('/api/chats/') && method === 'DELETE') return fulfillApi(route, { payload: { ok: true } });
    if (pathname.startsWith('/api/verifications/') && method === 'POST') return fulfillApi(route, { payload: { ok: true } });
    if (pathname.startsWith('/api/suggestions/') && method === 'PATCH') return fulfillApi(route, { payload: { ok: true } });
    if (pathname.startsWith('/api/apps/') && method === 'PATCH') return fulfillApi(route, { payload: { ok: true } });
    if (pathname.startsWith('/api/apps/') && method === 'POST') return fulfillApi(route, { payload: { ok: true } });
    if (pathname.startsWith('/api/apps/') && method === 'DELETE') return fulfillApi(route, { payload: { ok: true } });
    if (pathname.startsWith('/api/cron/jobs/') && method !== 'GET') return fulfillApi(route, { payload: { ok: true } });

    await fulfillApi(route, { payload: { ok: true } });
  });
}

async function capture(page, name, pagePath, waitForText) {
  await page.goto(`${baseUrl}${pagePath}`, { waitUntil: 'domcontentloaded' });
  if (waitForText) {
    await page.getByText(waitForText, { exact: false }).waitFor({ timeout: 15000 });
  }
  await page.screenshot({ path: path.join(outputDir, name), fullPage: true });
}

async function setTheme(page, theme) {
  await page.addInitScript((value) => {
    window.localStorage.setItem('agentgate-theme', value);
    document.documentElement.dataset.theme = value;
    document.documentElement.style.colorScheme = value;
  }, theme);
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });

  const loggedOutContext = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
  const loggedOutPage = await loggedOutContext.newPage();
  await mockAgentgateApi(loggedOutPage, 'logged-out');
  await setTheme(loggedOutPage, 'dark');
  await capture(loggedOutPage, 'login-desktop.png', '/login', 'Your personal Hermes dashboard');
  await loggedOutContext.close();

  const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 2200 } });
  await desktopContext.addCookies([{ name: 'agentgate_csrf', value: 'fake-token', domain: '127.0.0.1', path: '/' }]);
  const desktopPage = await desktopContext.newPage();
  await mockAgentgateApi(desktopPage, 'logged-in');
  await setTheme(desktopPage, 'light');

  await capture(desktopPage, 'home-desktop.png', '/', 'Hermes operations board.');
  await capture(desktopPage, 'chats-desktop.png', '/chats', 'Weekly reset');
  await capture(desktopPage, 'chat-thread-desktop.png', '/chats/chat-1', 'Look at my recent routine');
  await capture(desktopPage, 'verifications-desktop.png', '/verifications', 'Approve repeat burger order');
  await capture(desktopPage, 'suggestions-desktop.png', '/suggestions', 'Build a Friday buffer');
  await capture(desktopPage, 'apps-desktop.png', '/apps', 'Physique Tracker');
  await capture(desktopPage, 'toolgate-desktop.png', '/gates/toolgate', 'Available capabilities');
  await capture(desktopPage, 'memorygate-desktop.png', '/gates/memorygate', 'Current briefing');
  await capture(desktopPage, 'cron-desktop.png', '/cron', 'Friday pattern review');
  await capture(desktopPage, 'character-desktop.png', '/settings/character', 'Character context preview');

  await setTheme(desktopPage, 'dark');
  await capture(desktopPage, 'home-desktop-dark.png', '/', 'Hermes operations board.');
  await capture(desktopPage, 'chats-desktop-dark.png', '/chats', 'Weekly reset');
  await capture(desktopPage, 'verifications-desktop-dark.png', '/verifications', 'Approve repeat burger order');
  await capture(desktopPage, 'memorygate-desktop-dark.png', '/gates/memorygate', 'Current briefing');
  await desktopContext.close();

  const mobileContext = await browser.newContext({
    viewport: { width: 430, height: 1600 },
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
    isMobile: true,
    hasTouch: true,
  });
  await mobileContext.addCookies([{ name: 'agentgate_csrf', value: 'fake-token', domain: '127.0.0.1', path: '/' }]);
  const mobilePage = await mobileContext.newPage();
  await mockAgentgateApi(mobilePage, 'logged-in');
  await setTheme(mobilePage, 'dark');

  await capture(mobilePage, 'home-mobile.png', '/', 'Hermes operations board.');
  await mobilePage.getByLabel('Open navigation').click();
  await mobilePage.getByText('Verifications').waitFor({ timeout: 10000 });
  await mobilePage.screenshot({ path: path.join(outputDir, 'mobile-navigation.png'), fullPage: true });
  await capture(mobilePage, 'verifications-mobile.png', '/verifications', 'Approve repeat burger order');
  await capture(mobilePage, 'chat-thread-mobile.png', '/chats/chat-1', 'Look at my recent routine');
  await mobileContext.close();

  await browser.close();
  console.log(`Saved screenshots to ${outputDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
