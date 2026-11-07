import { forwardRef, useImperativeHandle, useRef, useState, useMemo, useEffect, useCallback } from 'react';
import { QABot, applyFlowSettings, type QABotAnalyticsEvent } from '@snf/qa-bot-core';
import { accessAgentAuth } from '../config/agent-auth';
import type { AccessQABotProps, AccessQABotRef, CapabilitiesResponse } from '../types';
import { API_CONFIG, BOT_CONFIG, scopedWelcomeMessage } from '../config/constants';
import { createMainMenuFlow, createTicketFlow, createSecurityFlow, createMetricsFlow } from '../flows';
import { setCurrentFormContext, type TicketFormData, type UserInfo } from '../utils/flow-context';
import { getSessionId } from '../utils/session';
import type { TrackEventFn } from '../utils/analytics';
import { injectShadowDomStyles } from '../utils/shadow-dom-styles';
import '../styles/chatbot.css';

/**
 * AccessQABot - Wrapper around @snf/qa-bot-core with ACCESS-specific functionality
 *
 * This component demonstrates how to extend qa-bot-core with custom flows:
 * 1. Main menu flow - provides top-level navigation from dynamic capabilities
 * 2. Ticket flows - handles ticket creation with file uploads
 *
 * The wrapper pattern keeps ACCESS-specific logic (JIRA integration, ticket forms,
 * capability fetching) separate from the generic qa-bot-core library.
 */
export const AccessQABot = forwardRef<AccessQABotRef, AccessQABotProps>(
  (props, ref) => {
    const {
      apiKey = API_CONFIG.DEFAULT_API_KEY,
      isLoggedIn = false,
      loginUrl = BOT_CONFIG.LOGIN_URL,
      // User context for pre-filling forms
      userEmail,
      userName,
      accessId,
      actingUser,
      // Unused props (accepted for API compatibility)
      ringEffect: _ringEffect,
      defaultOpen: _defaultOpen,
      onClose: _onClose,
      // Active props
      open,
      onOpenChange,
      embedded = false,
      welcome,
      // Endpoint overrides
      qaEndpoint,
      ratingEndpoint,
      agentEndpoint,
      backendId,
      // Resource scoping
      scopeSlug,
      resourceContext,
      // Header / input / greeting overrides
      headerTitle,
      inputPlaceholder,
      // Analytics
      onAnalyticsEvent,
    } = props;

    // scopeSlug is canonical; resourceContext is the deprecated alias.
    const scope = scopeSlug ?? resourceContext;

    // Non-agentic mode: Q&A goes through qa-bot-proxy → UKY RAG directly,
    // and the agent's /capabilities endpoint is never called. AGENT_ENABLED
    // is baked at this library's publish time (Vite env), so this is
    // effectively a constant — flipping it requires republishing.
    const agentEnabled = API_CONFIG.AGENT_ENABLED;
    const effectiveBackendId = backendId || API_CONFIG.BACKEND_ID;

    const botRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Ticket form state - managed here to persist across flow steps
    const [ticketForm, setTicketForm] = useState<TicketFormData>({});

    // Capabilities state — fetched from the agent when agent mode is enabled.
    // In non-agentic mode we initialize with an empty default so the loading
    // gate below passes immediately and no fetch is ever made.
    // null = still loading, object = loaded (even if empty categories on error)
    const [capabilities, setCapabilities] = useState<CapabilitiesResponse | null>(
      () => (agentEnabled ? null : { categories: [], is_authenticated: false })
    );

    // User info from props
    const userInfo: UserInfo = useMemo(() => ({
      email: userEmail,
      name: userName,
      accessId: accessId,
    }), [userEmail, userName, accessId]);

    // Inject CSS overrides into shadow DOM if needed
    useEffect(() => {
      injectShadowDomStyles(containerRef.current);
    }, []);

    // Keep form context in sync for flow utilities
    useEffect(() => {
      setCurrentFormContext({
        ticketForm,
        setTicketForm,
      });
    }, [ticketForm]);

    // Derive agent API URLs
    // A trailing slash would give the agent `//query`, which it 404s.
    const agentBaseUrl = (agentEndpoint || API_CONFIG.AGENT_ENDPOINT).replace(/\/+$/, '');
    const capabilitiesEndpoint = scope
      ? `${agentBaseUrl}/capabilities?resource_context=${encodeURIComponent(scope)}`
      : `${agentBaseUrl}/capabilities`;
    const agentRatingEndpoint = `${agentBaseUrl}/rating`;

    // Agent mode signs in to the agent with a support-site token, and
    // questions go to the agent itself. accessAgentAuth refuses a host
    // agentEndpoint on another origin, so a page can't redirect the token.
    const agentAuth = useMemo(
      () => (agentEnabled ? accessAgentAuth(agentBaseUrl) : null),
      [agentEnabled, agentBaseUrl]
    );
    const effectiveQaEndpoint = agentEnabled ? `${agentBaseUrl}/query` : qaEndpoint || API_CONFIG.QA_ENDPOINT;
    // The host's login state, which agent mode doesn't use: sign-in comes
    // from the token inside qa-bot-core. Kept out of the memos and effects
    // in agent mode, so a host isLoggedIn change can't rebuild the flow.
    const hostLoggedIn = agentEnabled ? null : isLoggedIn;

    // Warn about common deployment misconfigurations
    useEffect(() => {
      if (agentEnabled && agentBaseUrl.includes('localhost') && !window.location.hostname.includes('localhost')) {
        console.warn(
          '[AccessQABot] VITE_AGENT_ENDPOINT not set — agent requests will go to localhost. ' +
          'Set VITE_AGENT_ENDPOINT in your environment.'
        );
      }
      if (agentEnabled && qaEndpoint) {
        console.warn('[AccessQABot] qaEndpoint is ignored in agent mode; questions go to the agent.');
      }
      // In agent mode the agent challenges anonymous callers with Turnstile
      // itself, sending the site key the widget needs.
      if (!agentEnabled && API_CONFIG.ALLOW_ANON_ACCESS && !API_CONFIG.TURNSTILE_SITE_KEY) {
        console.warn(
          '[AccessQABot] Anonymous access is enabled without Turnstile. ' +
          'Set VITE_TURNSTILE_SITE_KEY for bot protection, or disable VITE_ALLOW_ANON_ACCESS.'
        );
      }
    }, [agentBaseUrl, agentEnabled, qaEndpoint]);

    // Fetch capabilities on mount (and when auth state changes).
    // Only runs in agent mode — in non-agentic mode, capabilities is
    // initialized to a default and no fetch is ever made.
    // REACTIVATION: when the agent is re-approved, set
    // VITE_AGENT_ENABLED=true (or flip the AGENT_ENABLED default in
    // constants.ts) and republish — this effect comes back to life.
    useEffect(() => {
      if (!agentEnabled) return;

      let cancelled = false;

      async function fetchCapabilities() {
        try {
          // Sent anonymously: the agent's CORS doesn't allow credentials, and
          // the only field used here, the welcome message, is the same for
          // everyone. The response's `locked` and `is_authenticated` reflect
          // an anonymous caller; anything that starts reading them needs this
          // request to carry the token.
          const response = await fetch(capabilitiesEndpoint, {
            credentials: 'omit',
          });
          if (!response.ok) {
            throw new Error(`Capabilities API returned ${response.status}`);
          }
          const data: CapabilitiesResponse = await response.json();
          if (!cancelled) {
            setCapabilities(data);
          }
        } catch (error) {
          // Graceful degradation — render the bot with fallback "Show my options" button
          console.warn('Failed to fetch capabilities:', error);
          if (!cancelled) {
            setCapabilities({ categories: [], is_authenticated: false });
          }
        }
      }

      fetchCapabilities();
      return () => { cancelled = true; };
    }, [agentEnabled, capabilitiesEndpoint, hostLoggedIn]);

    // Expose addMessage method via ref (maintains old API)
    useImperativeHandle(ref, () => ({
      addMessage: (message: string) => {
        botRef.current?.addMessage?.(message);
      },
    }));

    // Determine welcome message:
    //   explicit prop > agent's scoped capabilities welcome > resource-scoped
    //   default (when embedded on a resource page) > generic default.
    // The resource-scoped default keeps the bot resource-framed even on the
    // non-agent path, where no capabilities response is fetched.
    const welcomeMessage =
      welcome ||
      capabilities?.welcome_message ||
      (scope ? scopedWelcomeMessage() : BOT_CONFIG.WELCOME_MESSAGE);

    // Get session ID for analytics and metrics flow
    const sessionId = useMemo(() => getSessionId(), []);

    // Create analytics tracker that forwards events to consumer
    const trackEvent: TrackEventFn = useCallback((event) => {
      if (onAnalyticsEvent) {
        onAnalyticsEvent({
          ...event,
          type: event.type,
          timestamp: event.timestamp ?? Date.now(),
          sessionId: event.sessionId ?? sessionId,
        });
      }
    }, [onAnalyticsEvent, sessionId]);

    // Handler for core analytics events - forwards them to consumer
    const handleCoreAnalyticsEvent = useCallback((event: QABotAnalyticsEvent) => {
      if (onAnalyticsEvent) {
        onAnalyticsEvent({
          ...event,
          type: event.type,
          timestamp: typeof event.timestamp === 'number' ? event.timestamp : Date.now(),
          sessionId: typeof event.sessionId === 'string' ? event.sessionId : sessionId,
        });
      }
    }, [onAnalyticsEvent, sessionId]);

    // Build custom flow by combining main menu + all specialized flows
    const customFlow = useMemo(() => {
      // Main menu provides top-level navigation. In non-agentic mode this
      // is a static 4-button menu (Ask / Ticket / Security / Metrics) — see
      // main-menu-flow.ts. setTicketForm is needed so the ticket and
      // security branches can reset form state on entry.
      // Scoped mode (suppressed greeting/menu, opens straight to input) is for
      // the EMBEDDED resource bot only. The floating bot always keeps its
      // greeting + menu, so it must have content — even if given a scopeSlug.
      const scopedMode = Boolean(scope) && embedded;
      const mainMenuFlow = createMainMenuFlow({
        // In scoped mode the greeting is suppressed, so the welcome message is
        // irrelevant; pass empty to avoid a dangling pre-computed greeting.
        welcome: scopedMode ? '' : welcomeMessage,
        setTicketForm,
        trackEvent,
        scoped: scopedMode,
      });

      // Ticket flows handle ticket creation
      const ticketFlows = createTicketFlow({
        ticketForm: {},
        setTicketForm,
        userInfo,
        trackEvent,
      });

      // Security flow for reporting security incidents
      const securityFlow = createSecurityFlow({
        ticketForm: {},
        setTicketForm,
        userInfo,
        trackEvent,
      });

      // Metrics flow for XDMoD questions
      const metricsFlow = createMetricsFlow({
        sessionId,
        apiKey,
        trackEvent,
      });

      // Merge all flows and apply settings
      const rawFlow = {
        ...mainMenuFlow,
        ...ticketFlows,
        ...securityFlow,
        ...metricsFlow,
      };

      // Auto-set chatDisabled based on whether step has options/checkboxes
      // BUT the start step explicitly sets chatDisabled: false to allow typing
      return applyFlowSettings(rawFlow, { disableOnOptions: true });
    }, [welcomeMessage, userInfo, sessionId, apiKey, hostLoggedIn, trackEvent, capabilities, scope, embedded]);

    // Wait for capabilities to load before rendering — the start step's
    // options are built from this data and react-chatbotify won't re-render
    // them if the flow object changes after initial mount.  The capabilities
    // endpoint is in-memory (<10ms), so the delay is imperceptible.
    if (!capabilities) {
      return <div ref={containerRef} />;
    }

    return (
      <div ref={containerRef}>
      <QABot
        ref={botRef}
        // Login state - Q&A is gated when false unless anonymous access is enabled
        isLoggedIn={isLoggedIn}
        // Agent sign-in allows anonymous questions: the agent decides which
        // tools need sign-in, and qa-bot-core shows the sign-in prompt.
        // Without it (flag off, or refused), the build-time setting holds.
        allowAnonAccess={agentAuth ? true : API_CONFIG.ALLOW_ANON_ACCESS}
        actingUser={actingUser}

        // Analytics
        onAnalyticsEvent={handleCoreAnalyticsEvent}

        // API configuration
        apiKey={apiKey}
        qaEndpoint={effectiveQaEndpoint}
        agentAuth={agentAuth ?? undefined}
        ratingEndpoint={ratingEndpoint || API_CONFIG.RATING_ENDPOINT}
        backendId={effectiveBackendId}
        // Agent-only endpoints — only forwarded when agent mode is enabled,
        // so qa-bot-core never makes capabilities or agent-rating requests
        // in non-agentic mode.
        // REACTIVATION: AGENT_ENABLED=true → these props start flowing again,
        // and the gated useEffects above resume populating `capabilities`.
        {...(agentEnabled ? { capabilitiesEndpoint, agentRatingEndpoint } : {})}

        // Branding
        botName={headerTitle || BOT_CONFIG.BOT_NAME}
        logo={BOT_CONFIG.LOGO}
        primaryColor={BOT_CONFIG.PRIMARY_COLOR}
        secondaryColor={BOT_CONFIG.SECONDARY_COLOR}
        welcomeMessage={welcomeMessage}
        placeholder={inputPlaceholder || undefined}
        tooltipText={BOT_CONFIG.TOOLTIP}

        // Turnstile bot protection (silent pre-verify when site key configured)
        turnstileSiteKey={API_CONFIG.TURNSTILE_SITE_KEY || undefined}

        // UI Control
        loginUrl={loginUrl}
        open={open}
        onOpenChange={onOpenChange}
        embedded={embedded}

        // Footer
        footerText="AI-powered · Privacy Notice"
        footerLink="https://support.access-ci.org/tools/access-qa-tool/privacy"

        // Resource scoping (core prop name unchanged; value is the resolved scope)
        resourceContext={scope}

        // Custom flows for tickets, etc.
        customFlow={customFlow}
      />
      </div>
    );
  }
);

AccessQABot.displayName = 'AccessQABot';

export default AccessQABot;
