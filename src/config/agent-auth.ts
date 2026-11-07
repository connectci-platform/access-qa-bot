import type { AgentAuthConfig } from '@snf/qa-bot-core';
import { API_CONFIG } from './constants';

/**
 * qa-bot-core's agentAuth for ACCESS: tokens from the support site, sent
 * only to the agent. Built from publish-time constants, never from host
 * props, so an embedding page can't move where the token comes from or
 * goes. Returns null when `agentBaseUrl` (which a host can override) isn't
 * on the built-in agent's origin; the bot then runs without agent sign-in.
 */
export function accessAgentAuth(agentBaseUrl: string): AgentAuthConfig | null {
  let agentOrigin: string;
  try {
    agentOrigin = new URL(API_CONFIG.AGENT_ENDPOINT).origin;
    if (new URL(agentBaseUrl).origin !== agentOrigin) {
      console.warn('access-qa-bot: agentEndpoint is not the built-in agent, so agent sign-in is off.');
      return null;
    }
  } catch {
    console.warn('access-qa-bot: the agent endpoint does not parse, so agent sign-in is off.');
    return null;
  }
  return {
    tokenUrl: `${API_CONFIG.SUPPORT_URL}/api/agent-token`,
    loginUrl: `${API_CONFIG.SUPPORT_URL}/user/login`,
    agentUrl: agentOrigin,
    signInText: 'Sign in to continue. This needs your ACCESS account.',
  };
}
