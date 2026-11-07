// Environment configuration
export const API_CONFIG = {
  // Q&A goes through qa-bot-proxy (Turnstile-protected) to UKY RAG.
  // To bypass the proxy (local dev), set VITE_API_ENDPOINT directly.
  QA_ENDPOINT: import.meta.env.VITE_API_ENDPOINT || 'https://qa-bot-proxy.netlify.app/api/chat',
  RATING_ENDPOINT: import.meta.env.VITE_RATING_ENDPOINT || 'https://access-ai-grace1-external.ccs.uky.edu/access/chat/rating/',

  // Backend ID sent as `_backend` in the request body so qa-bot-proxy can
  // route to the correct upstream (defined in its ALLOWED_BACKENDS env var).
  BACKEND_ID: import.meta.env.VITE_BACKEND_ID || 'access',

  // Access-agent endpoints — disabled in non-agentic mode.
  // REACTIVATION: republish access-qa-bot with VITE_AGENT_ENABLED=true and
  // VITE_AGENT_ENDPOINT/VITE_API_ENDPOINT pointing at the agent. (Vite bakes
  // VITE_* values at this library's publish time, so flipping them requires a
  // republish — they are NOT runtime env vars in the consuming app.)
  // The gated useEffects in AccessQABot.tsx and the conditional QABot prop
  // spread come back to life automatically when this is true. Search the
  // codebase for `REACTIVATION:` to see all the affected sites.
  AGENT_ENABLED: import.meta.env.VITE_AGENT_ENABLED === 'true',
  AGENT_ENDPOINT: import.meta.env.VITE_AGENT_ENDPOINT || 'http://localhost:8000/api/v1',
  get CAPABILITIES_ENDPOINT() { return `${this.AGENT_ENDPOINT}/capabilities`; },
  get AGENT_RATING_ENDPOINT() { return `${this.AGENT_ENDPOINT}/rating`; },

  // The identity site that mints agent tokens and hosts sign-in, in agent
  // mode. Baked at publish time like the other VITE_* values; a ddev build
  // sets it to https://accessmatch.ddev.site.
  SUPPORT_URL: (import.meta.env.VITE_SUPPORT_URL || 'https://support.access-ci.org').replace(/\/$/, ''),

  // Metrics/XDMoD API endpoints (unchanged — direct to UKY)
  METRICS_API_ENDPOINT: import.meta.env.VITE_METRICS_API_ENDPOINT || 'https://access-ai-grace1-external.ccs.uky.edu/access/xdmod/chat/api/',
  METRICS_RATING_ENDPOINT: import.meta.env.VITE_METRICS_RATING_ENDPOINT || 'https://access-ai-grace1-external.ccs.uky.edu/access/xdmod/chat/rating/',
  METRICS_QUESTIONS_URL: 'https://metrics.access-ci.org/qa_bot_faq',

  // Netlify functions for JIRA/JSM (unchanged)
  NETLIFY_BASE_URL: import.meta.env.VITE_NETLIFY_BASE_URL || 'https://access-jsm-api.netlify.app',

  // API key (can be overridden via prop)
  DEFAULT_API_KEY: import.meta.env.VITE_API_KEY || 'demo-key',

  // Cloudflare Turnstile site key (public, safe to embed in frontend)
  TURNSTILE_SITE_KEY: import.meta.env.VITE_TURNSTILE_SITE_KEY || '',

  // Allow anonymous users to chat without logging in.
  // Requires Turnstile for bot protection — if anon access is enabled
  // without a Turnstile key, anonymous users get unrestricted access.
  ALLOW_ANON_ACCESS: import.meta.env.VITE_ALLOW_ANON_ACCESS === 'true',
};

// The AI-disclaimer + privacy note appended to every welcome message.
const WELCOME_NOTES =
  '<em>AI-powered responses may not always be accurate. Don\'t share passwords or secrets.</em> <a href="https://support.access-ci.org/tools/access-qa-tool/privacy">Privacy Notice</a>';

// Bot configuration defaults
export const BOT_CONFIG = {
  BOT_NAME: 'ACCESS Q&A',
  LOGO: 'https://support.access-ci.org/themes/contrib/asp-theme/images/icons/ACCESS-arrrow.svg',
  WELCOME_MESSAGE: `Hello! Ask me about ACCESS resources, allocations, and more.\n\n${WELCOME_NOTES}`,
  LOGIN_URL: '/login',
  PRIMARY_COLOR: '#1a5b6e',
  SECONDARY_COLOR: '#107180',
  TOOLTIP: 'Ask me about ACCESS! 😊',
};

/**
 * Welcome message for a resource-scoped chatbot (embedded on a resource's docs
 * page). The query is scoped to the resource via rp_name regardless of wording,
 * so the welcome intentionally stays generic ("this resource") rather than
 * naming it: the non-agent path only has the slug, and mapping slugs to display
 * names would need a maintained list + an npm release whenever resources change.
 * The agent path supplies a properly-titled welcome via /capabilities; this is a
 * short-term stand-in until the agent takes over.
 */
export function scopedWelcomeMessage(): string {
  return `Hello! Ask me about this resource — software, storage, running jobs, logging in, and more.\n\n${WELCOME_NOTES}`;
}

// Session storage keys
export const STORAGE_KEYS = {
  SESSION_ID: 'access-qa-bot-session-id',
  TOOLTIP_SHOWN: 'access-qa-bot-tooltip-shown',
};
