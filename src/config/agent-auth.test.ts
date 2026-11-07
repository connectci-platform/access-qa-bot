import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('./constants', () => ({
  API_CONFIG: {
    AGENT_ENDPOINT: 'https://qa.access-ci.org/api/v1',
    SUPPORT_URL: 'https://support.access-ci.org',
  },
}));

import { accessAgentAuth } from './agent-auth';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('accessAgentAuth', () => {
  it('builds the ACCESS config from the support site and the agent', () => {
    expect(accessAgentAuth('https://qa.access-ci.org/api/v1')).toEqual({
      tokenUrl: 'https://support.access-ci.org/api/agent-token',
      loginUrl: 'https://support.access-ci.org/user/login',
      agentUrl: 'https://qa.access-ci.org',
      signInText: 'Sign in to continue. This needs your ACCESS account.',
    });
  });

  it('refuses an agent endpoint on another origin, so a host cannot redirect the token', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(accessAgentAuth('https://elsewhere.example/api/v1')).toBeNull();
    expect(warn).toHaveBeenCalled();
  });

  it.each(['http://qa.access-ci.org/api/v1', 'https://qa.access-ci.org:8443/api/v1'])(
    'refuses the same host on another scheme or port (%s)',
    (endpoint) => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});

      expect(accessAgentAuth(endpoint)).toBeNull();
    },
  );

  it('refuses an endpoint that does not parse', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(accessAgentAuth('not a url')).toBeNull();
  });
});
