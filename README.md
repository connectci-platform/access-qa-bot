# ACCESS Q&A Bot

A React wrapper around [@snf/qa-bot-core](https://github.com/connectci-platform/qa-bot-core) that adds ACCESS-specific functionality. This package serves two purposes:

1. **Production use**: The official Q&A bot for ACCESS websites
2. **Reference implementation**: An example of how to build organization-specific wrappers around qa-bot-core

## Installation

```bash
npm install @snf/access-qa-bot
```

## Features

- **🤖 Intelligent Q&A**: AI-powered responses about ACCESS resources and services
- **🎫 Support Tickets**: Create help tickets for general support, ACCESS login issues, and resource provider login problems
- **🔒 Security Reporting**: Report security incidents with priority levels and file attachments
- **📊 Metrics/XDMoD**: Query usage and performance data for ACCESS resources
- **📎 File Attachments**: Upload screenshots, logs, and documents with tickets
- **👤 User Pre-population**: Auto-fill forms with user info when logged in
- **🎨 Theming**: Customizable colors and branding via qa-bot-core
- **♿ Accessibility**: Full screen reader support and keyboard navigation
- **📱 Responsive**: Works on desktop and mobile devices

### Display Modes

- **Floating Mode** (default): Chat button that opens/closes a floating window
- **Embedded Mode**: Always visible, embedded in page content

## Available Flows

### 🤖 Q&A Flow
- Ask questions about ACCESS resources, services, and documentation
- AI-powered responses with HTML and Markdown formatting
- Thumbs up/down feedback after each response
- Requires login (gated by default)

### 🎫 Support Ticket Flows
- **General Help**: Any ACCESS-related issues
- **ACCESS Login**: Problems logging into access-ci.org
- **Resource Login**: Problems logging into resource providers (Anvil, Expanse, etc.)
- All flows support file attachments and integrate with JSM ProForma

### 🔒 Security Incident Flow
- Report security issues, vulnerabilities, and incidents
- Priority levels: Critical, High, Medium, Low
- Direct routing to ACCESS cybersecurity team
- File attachments for evidence

### 📊 Metrics/XDMoD Flow
- Query usage and performance data
- Interactive Q&A loop with feedback buttons

---

## Integration Methods

### React Component

For React applications, import and use the component directly:

```tsx
import React, { useRef, useState } from 'react';
import { AccessQABot } from '@snf/access-qa-bot';

function MyApp() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const botRef = useRef();

  return (
    <div className="app">
      <h1>My Application</h1>

      <button onClick={() => botRef.current?.addMessage("Hello!")}>
        Send Message
      </button>

      <button onClick={() => setChatOpen(true)}>
        Open Chat
      </button>

      <AccessQABot
        ref={botRef}
        isLoggedIn={isLoggedIn}
        open={chatOpen}
        onOpenChange={setChatOpen}
        userEmail="user@example.com"
        userName="Jane Doe"
        accessId="jdoe"
        apiKey={process.env.VITE_API_KEY}
      />
    </div>
  );
}
```

#### React Props

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `isLoggedIn` | boolean | `false` | User login state (gates Q&A, shows login/user icon) |
| `apiKey` | string | `"demo-key"` | API key for authentication |
| `embedded` | boolean | `false` | Embedded or floating mode |
| `loginUrl` | string | `"/login"` | Login redirect URL |
| `open` | boolean | - | Control chat window (floating mode) |
| `onOpenChange` | function | - | Chat window state callback |
| `onAnalyticsEvent` | function | - | Analytics event callback (receives core + wrapper events) |
| `welcome` | string | - | Custom welcome message |
| `userEmail` | string | - | Pre-populate email in forms |
| `userName` | string | - | Pre-populate name in forms |
| `accessId` | string | - | Pre-populate ACCESS ID in forms |
| `actingUser` | string | - | Acting user identifier forwarded to backend as `X-Acting-User` header |

#### Ref Methods

```tsx
const botRef = useRef<AccessQABotRef>(null);

// Add a message programmatically
botRef.current?.addMessage("Hello from code!");
```

---

### Standalone JavaScript

For plain HTML/JS, use the self-contained standalone bundle:

```html
<script src="https://unpkg.com/@snf/access-qa-bot@3.0.0/dist/access-qa-bot.standalone.js"></script>

<div id="qa-bot"></div>

<script>
const bot = qaBot({
  target: document.getElementById('qa-bot'),
  isLoggedIn: false,
  embedded: false,
  welcome: "Welcome! How can I help you today?",
  defaultOpen: false,
});
</script>
```

#### Programmatic Control

The `qaBot()` function returns a controller object:

```javascript
const bot = qaBot({
  target: document.getElementById('qa-bot'),
  isLoggedIn: false,
});

// Add messages
bot.addMessage("Hello World!");

// Update login state
bot.setBotIsLoggedIn(true);

// Control chat window (floating mode only)
bot.openChat();
bot.closeChat();
bot.toggleChat();

// Cleanup
bot.destroy();
```

#### Standalone Config

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `target` | HTMLElement | **required** | DOM element to render into |
| `apiKey` | string | `"demo-key"` | API key for authentication |
| `defaultOpen` | boolean | `false` | Initial chat window state |
| `embedded` | boolean | `false` | Embedded or floating mode |
| `isLoggedIn` | boolean | `false` | User login state |
| `loginUrl` | string | `"/login"` | Login redirect URL |
| `onAnalyticsEvent` | function | - | Analytics event callback |
| `welcome` | string | - | Welcome message |
| `userEmail` | string | - | Pre-populate email |
| `userName` | string | - | Pre-populate name |
| `accessId` | string | - | Pre-populate ACCESS ID |
| `actingUser` | string | - | Acting user identifier forwarded to backend as `X-Acting-User` header |

---

### CDN Usage

#### unpkg (npm-based)

```html
<script src="https://unpkg.com/@snf/access-qa-bot@3.0.0/dist/access-qa-bot.standalone.js"></script>
```

#### jsdelivr (npm-based)

```html
<script src="https://cdn.jsdelivr.net/npm/@snf/access-qa-bot@3.0.0/dist/access-qa-bot.standalone.js"></script>
```

jsDelivr's GitHub-based path (`/gh/...`) doesn't work for this package:
`dist/` isn't committed, so tags contain no built files.

---

## Building Your Own Wrapper

This repository demonstrates the **wrapper pattern** for extending qa-bot-core with organization-specific functionality. Use this as a reference for building your own wrapper.

### Architecture

```
YourWrapper (this pattern)
  └── QABot (from @snf/qa-bot-core)
      └── react-chatbotify
```

### What qa-bot-core Provides

- Chat UI (floating/embedded modes)
- Q&A flow with feedback
- Login state management
- Theming and branding props
- `customFlow` prop for extending functionality

### What Your Wrapper Adds

- Organization-specific flows (tickets, security, etc.)
- Integration with your backend services (JIRA, APIs)
- Custom form validation and state management
- Environment-specific configuration

### Key Files to Study

| File | Purpose |
|------|---------|
| `src/components/AccessQABot.tsx` | Main wrapper component - combines flows, passes props to core |
| `src/flows/*.ts` | Custom conversation flows using react-chatbotify format |
| `src/utils/flow-context.ts` | Form state management across flow steps |
| `src/utils/ticket-api.ts` | Backend integration (JIRA ticket submission) |
| `src/standalone.tsx` | Standalone JS API wrapper |
| `src/config/constants.ts` | Environment config and defaults |

### Creating Custom Flows

Flows use the [react-chatbotify](https://react-chatbotify.com/) format:

```typescript
import { Flow } from 'react-chatbotify';

export function createMyFlow(): Flow {
  return {
    my_start: {
      message: "Hello! What would you like to do?",
      options: ["Option A", "Option B"],
      path: (params) => {
        if (params.userInput === "Option A") return "option_a_step";
        return "option_b_step";
      },
    },
    option_a_step: {
      message: "You chose A!",
      path: "end",
    },
    // ... more steps
  };
}
```

### Combining Flows

In your wrapper component:

```tsx
import { QABot, applyFlowSettings } from '@snf/qa-bot-core';

const customFlow = useMemo(() => {
  const flow1 = createMenuFlow();
  const flow2 = createTicketFlow();
  const flow3 = createMyCustomFlow();

  const combined = { ...flow1, ...flow2, ...flow3 };

  // Auto-set chatDisabled based on options/checkboxes
  return applyFlowSettings(combined, { disableOnOptions: true });
}, [dependencies]);

return (
  <QABot
    isLoggedIn={isLoggedIn}
    customFlow={customFlow}
    // ... other props
  />
);
```

### Analytics Integration

qa-bot-core fires analytics events for core functionality (Q&A, ratings, open/close). Your wrapper can add its own events and forward everything to consumers.

**1. Define a tracking function type:**

```typescript
// src/utils/analytics.ts
export interface TrackEventInput {
  type: string;
  sessionId?: string;
  timestamp?: number;
  [key: string]: unknown;
}

export type TrackEventFn = (event: TrackEventInput) => void;
```

**2. Accept `onAnalyticsEvent` prop and create trackers:**

```tsx
// In your wrapper component
const trackEvent: TrackEventFn = useCallback((event) => {
  if (onAnalyticsEvent) {
    onAnalyticsEvent({
      ...event,
      timestamp: event.timestamp ?? Date.now(),
      sessionId: event.sessionId ?? sessionId,
    });
  }
}, [onAnalyticsEvent, sessionId]);

// Handler for core events from qa-bot-core
const handleCoreAnalyticsEvent = useCallback((event) => {
  if (onAnalyticsEvent) {
    onAnalyticsEvent({
      ...event,
      timestamp: typeof event.timestamp === 'number' ? event.timestamp : Date.now(),
      sessionId: typeof event.sessionId === 'string' ? event.sessionId : sessionId,
    });
  }
}, [onAnalyticsEvent, sessionId]);
```

**3. Pass `trackEvent` to your flow creators:**

```tsx
const customFlow = useMemo(() => {
  const menuFlow = createMenuFlow({ trackEvent });
  const ticketFlow = createTicketFlow({ trackEvent });
  // ...
}, [trackEvent]);
```

**4. Wire up core analytics:**

```tsx
<QABot
  onAnalyticsEvent={handleCoreAnalyticsEvent}
  customFlow={customFlow}
  // ...
/>
```

**5. Fire events in your flows:**

```typescript
export function createTicketFlow({ trackEvent }: FlowParams) {
  return {
    ticket_submit: {
      function: async (chatState) => {
        const result = await submitTicket(data);
        trackEvent({
          type: 'ticket_submitted',
          ticketType: 'general',
          success: result.success,
        });
      },
      // ...
    },
  };
}
```

Consumers can then wire events to their analytics platform:

```tsx
<YourWrapper
  onAnalyticsEvent={(event) => {
    window.dataLayer?.push({ event: event.type, ...event });
  }}
/>
```

---

## Environment Variables

Create `.env.local` from `.env.example`:

```env
VITE_API_ENDPOINT=https://your-qa-api.com/api/
VITE_RATING_ENDPOINT=https://your-qa-api.com/rating/
VITE_NETLIFY_BASE_URL=https://your-ticket-api.netlify.app
VITE_METRICS_API_ENDPOINT=https://your-metrics-api.com/
VITE_API_KEY=your_api_key_here
```

### Agent mode

These are baked in when the package is built, like the other `VITE_*`
values, so changing them means republishing. `VITE_AGENT_ENDPOINT` is
required for a flag-on build; its default is `http://localhost:8000/api/v1`,
for local development only:

```env
VITE_AGENT_ENABLED=true                         # off by default
VITE_AGENT_ENDPOINT=https://qa.access-ci.org/api/v1
VITE_SUPPORT_URL=https://support.access-ci.org  # the default
```

With `VITE_AGENT_ENABLED=true`:
- Questions go to `${VITE_AGENT_ENDPOINT}/query`. The `qaEndpoint` prop is
  ignored.
- The bot signs in to the agent with a short-lived token from
  `VITE_SUPPORT_URL` (`/api/agent-token`), and sign-in opens that site's
  `/user/login` in a popup. The `isLoggedIn` and `loginUrl` props are ignored.
- The token is sent only to the built-in agent. If a host sets
  `agentEndpoint` to another origin, agent sign-in is turned off for that
  bot.
- Anonymous questions are allowed. The agent decides which tools need
  sign-in, and it challenges anonymous callers with Turnstile itself. If
  agent sign-in is off for a bot (an off-origin `agentEndpoint`),
  `VITE_ALLOW_ANON_ACCESS` applies as usual.

`prepack` builds from whatever local `.env*` files are there, then
`scripts/check-publish-flags.mjs` fails the publish if the build has agent
mode on. For a deliberate agent-mode release, set `ALLOW_AGENT_PUBLISH=true`
along with `VITE_AGENT_ENDPOINT`; the check also fails if the endpoint is
still the localhost default.

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build all outputs (ESM, UMD, standalone)
npm run build

# Build library only (ESM, UMD)
npm run build:lib

# Type check
npm run type-check
```

## Build Outputs

| File | Format | Use Case |
|------|--------|----------|
| `dist/access-qa-bot.js` | ESM | npm import (React apps) |
| `dist/access-qa-bot.umd.cjs` | UMD | CommonJS require |
| `dist/access-qa-bot.standalone.js` | IIFE | CDN/script tag (bundles Preact) |
| `dist/style.css` | CSS | Styles (auto-imported by standalone) |

## Version History

This package continues the `@snf/access-qa-bot` npm package:

| Version | Repository | Notes |
|---------|------------|-------|
| v0.x - v2.x | [qa-bot](https://github.com/connectci-platform/qa-bot) (deprecated) | Original implementation |
| v3.0.0+ | [access-qa-bot](https://github.com/connectci-platform/access-qa-bot) (this repo) | Rewrite using qa-bot-core |

### What's New in v3.0.0

- **Architecture**: Now wraps @snf/qa-bot-core instead of embedding all logic
- **TypeScript**: Full TypeScript rewrite with type definitions
- **Build**: Vite-based build system (was Rollup + CRA)
- **Props**: `enabled` → `isLoggedIn` (breaking change)
- **Flows**: Same user-facing flows, cleaner implementation

## License

MIT
