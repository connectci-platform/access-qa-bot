import React from 'react';
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The real qa-bot-core is replaced by a stub that records its props; these
// tests are about what access-qa-bot hands it, not how it renders.
const captured = vi.hoisted(() => ({ props: null as Record<string, unknown> | null }));

vi.mock('@snf/qa-bot-core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@snf/qa-bot-core')>()),
  QABot: React.forwardRef((props: Record<string, unknown>, _ref) => {
    captured.props = props;
    return null;
  }),
}));

// API_CONFIG is baked at publish time, so tests swap in a copy they can
// change. Copying the property descriptors keeps its getters working.
const config = vi.hoisted(() => ({ current: null as Record<string, unknown> | null }));

vi.mock('../config/constants', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../config/constants')>();
  config.current = Object.defineProperties({}, Object.getOwnPropertyDescriptors(actual.API_CONFIG));
  return { ...actual, API_CONFIG: config.current };
});

import { AccessQABot } from './AccessQABot';

const AGENT = 'https://qa.access-ci.org/api/v1';
let fetchMock: ReturnType<typeof vi.fn>;

function setConfig(values: Record<string, unknown>) {
  Object.assign(config.current!, values);
}

async function renderBot(props: Record<string, unknown> = {}) {
  await act(async () => {
    render(<AccessQABot {...props} />);
  });
  return captured.props!;
}

beforeEach(() => {
  captured.props = null;
  fetchMock = vi.fn(async () => ({
    ok: true,
    json: async () => ({ categories: [], is_authenticated: false }),
  }));
  vi.stubGlobal('fetch', fetchMock);
  setConfig({ AGENT_ENABLED: false, AGENT_ENDPOINT: AGENT, ALLOW_ANON_ACCESS: false });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('with the agent off (the published default)', () => {
  it('passes the same props as 3.9.0', async () => {
    const props = await renderBot({ qaEndpoint: 'https://proxy.example/api/chat' });

    expect(props.agentAuth).toBeUndefined();
    expect(props.qaEndpoint).toBe('https://proxy.example/api/chat');
    expect(props.allowAnonAccess).toBe(false);
    expect(props.capabilitiesEndpoint).toBeUndefined();
    expect(props.agentRatingEndpoint).toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('passes the host login props through unchanged', async () => {
    const props = await renderBot({ isLoggedIn: true, loginUrl: '/custom-login', backendId: 'nairr' });

    expect(props.isLoggedIn).toBe(true);
    expect(props.loginUrl).toBe('/custom-login');
    expect(props.backendId).toBe('nairr');
    expect(props.agentAuth).toBeUndefined();
  });
});

describe('with the agent on', () => {
  beforeEach(() => {
    setConfig({ AGENT_ENABLED: true });
  });

  it('turns on agent sign-in against the support site', async () => {
    const props = await renderBot();

    expect(props.agentAuth).toEqual({
      tokenUrl: 'https://support.access-ci.org/api/agent-token',
      loginUrl: 'https://support.access-ci.org/user/login',
      agentUrl: 'https://qa.access-ci.org',
      signInText: 'Sign in to continue. This needs your ACCESS account.',
    });
  });

  it('allows anonymous questions, since the agent gates writes itself', async () => {
    const props = await renderBot();

    expect(props.allowAnonAccess).toBe(true);
  });

  it('sends questions to the agent, whatever qaEndpoint the host passes', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const props = await renderBot({ qaEndpoint: 'https://proxy.example/api/chat' });

    expect(props.qaEndpoint).toBe(`${AGENT}/query`);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('qaEndpoint'));
  });

  it('turns agent sign-in off when the host points agentEndpoint elsewhere', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    const props = await renderBot({ agentEndpoint: 'https://elsewhere.example/api/v1' });

    expect(props.agentAuth).toBeUndefined();
  });

  it('keeps the build-time anonymous setting when agent sign-in is off', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    const props = await renderBot({ agentEndpoint: 'https://elsewhere.example/api/v1' });

    expect(props.allowAnonAccess).toBe(false);
  });

  it('ignores a trailing slash on the agent endpoint', async () => {
    setConfig({ AGENT_ENDPOINT: `${AGENT}/` });

    const props = await renderBot();

    expect(props.qaEndpoint).toBe(`${AGENT}/query`);
    expect(props.agentRatingEndpoint).toBe(`${AGENT}/rating`);
    expect(fetchMock.mock.calls[0][0]).toBe(`${AGENT}/capabilities`);
  });

  it('scopes the capabilities request to the resource', async () => {
    await renderBot({ scopeSlug: 'delta' });

    expect(fetchMock.mock.calls[0][0]).toBe(`${AGENT}/capabilities?resource_context=delta`);
  });

  it('does not refetch capabilities or rebuild the flow when the host isLoggedIn changes', async () => {
    let view: ReturnType<typeof render>;
    await act(async () => {
      view = render(<AccessQABot isLoggedIn={false} />);
    });
    const flowBefore = captured.props!.customFlow;
    const fetchesBefore = fetchMock.mock.calls.length;

    await act(async () => {
      view.rerender(<AccessQABot isLoggedIn={true} />);
    });

    expect(captured.props!.customFlow).toBe(flowBefore);
    expect(fetchMock.mock.calls.length).toBe(fetchesBefore);
  });

  it('fetches capabilities without cookies or a token', async () => {
    await renderBot();

    const capabilityCalls = fetchMock.mock.calls.filter(([url]) => String(url).includes('/capabilities'));
    expect(capabilityCalls).toHaveLength(1);
    const [url, init] = capabilityCalls[0];
    expect(url).toBe(`${AGENT}/capabilities`);
    expect(init?.credentials).toBe('omit');
  });

  it('no longer calls the removed personalized-capabilities route', async () => {
    await renderBot({ isLoggedIn: true });

    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/personalized'))).toBe(false);
  });
});
