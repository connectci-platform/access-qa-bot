# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This repository is a React/TypeScript wrapper around [@snf/qa-bot-core](https://github.com/connectci-platform/qa-bot-core) that adds ACCESS-specific functionality. The project provides:
1. A React component library (ESM/UMD formats)
2. A standalone JavaScript bundle (IIFE with Preact)
3. TypeScript definitions

## Related Repositories

| Alias | Description |
|-------|-------------|
| **access-ci-ui** | UI component library for ACCESS websites - consumes qa-bot, will eventually consume this repo |
| **qa-bot** (old) | Legacy qa-bot being replaced by this repo + qa-bot-core |
| **qa-bot-core** (core) | Generic chatbot component library that this repo wraps |

**Local paths (may vary by developer):**
On this machine, all repos are peers in `access-ci/`:
- `../access-ci-ui`
- `../qa-bot`
- `../qa-bot-core`

**Relationship:** `access-ci-ui` → `access-qa-bot` (this repo) → `qa-bot-core`

## Build System

**Technology Stack:**
- Vite (build tool)
- React 18 + TypeScript
- Preact (for standalone bundle size optimization)

**Build Commands:**
```bash
npm run build          # Build all outputs (lib + standalone)
npm run build:lib      # ESM + UMD only
npm run build:standalone # Standalone bundle only
npm run dev            # Development server
npm run type-check     # TypeScript validation
```

**Build Outputs:**
- `dist/access-qa-bot.js` - ESM (externalizes React)
- `dist/access-qa-bot.umd.cjs` - CommonJS/UMD (externalizes React)
- `dist/access-qa-bot.standalone.js` - IIFE (bundles Preact)
- `dist/index.d.ts` - TypeScript definitions

## Architecture

### Component Hierarchy
```
AccessQABot (wrapper)
  └── QABot (from @snf/qa-bot-core)
      └── react-chatbotify integration
```

### Key Files
- `src/components/AccessQABot.tsx` - Main wrapper component
- `src/lib.tsx` - React component exports
- `src/standalone.tsx` - Standalone JavaScript API
- `src/config/constants.ts` - Environment variables and defaults
- `src/utils/ticket-api.ts` - JIRA ticket submission
- `src/utils/flow-context.ts` - Form state management across flow steps
- `src/utils/session.ts` - Session ID management (localStorage)

### Flow Files
- `src/flows/main-menu-flow.ts` - Top-level navigation
- `src/flows/ticket-flow.ts` - Ticket type selection
- `src/flows/access-login-flow.tsx` - ACCESS login issues
- `src/flows/resource-login-flow.tsx` - Resource provider login issues
- `src/flows/general-help-flow.tsx` - General help tickets
- `src/flows/security-flow.tsx` - Security incident reporting
- `src/flows/metrics-flow.ts` - XDMoD/metrics queries

### Props

**Required:**
- `isLoggedIn: boolean` - User login state (controls header icon + Q&A gating)

**User Context (optional):**
- `userEmail?: string` - Pre-populates email fields in ticket flows
- `userName?: string` - Pre-populates name fields
- `accessId?: string` - ACCESS username

**Configuration (optional):**
- `apiKey?: string` - API key for Q&A endpoint
- `open?: boolean` - Controlled open state
- `onOpenChange?: (open: boolean) => void` - Callback for open state changes

## Environment Configuration

Environment variables use `VITE_` prefix:

```env
VITE_API_ENDPOINT=https://access-ai-grace1-external.ccs.uky.edu/access/chat/api/
VITE_RATING_ENDPOINT=https://access-ai-grace1-external.ccs.uky.edu/access/chat/rating/
VITE_NETLIFY_BASE_URL=https://access-jsm-api.netlify.app
VITE_METRICS_API_ENDPOINT=https://your-metrics-endpoint/
VITE_API_KEY=demo-key
```

Copy `.env.example` to `.env.local` for local development.

## Current Implementation Status

**Implemented:**
- ✅ Basic wrapper with API compatibility
- ✅ Q&A flow with ACCESS APIs
- ✅ Main menu navigation (Q&A, Tickets, Metrics, Security)
- ✅ Ticket flows: ACCESS Login, Resource Login, General Help
- ✅ Security incident reporting
- ✅ Metrics/XDMoD integration
- ✅ File attachment support (via qa-bot-core)
- ✅ User context integration (email, name, ACCESS ID pre-populate forms)
- ✅ Login state refactor (`isLoggedIn` prop, Q&A gating)
- ✅ `applyFlowSettings` utility for chatDisabled automation
- ✅ Session ID persistence
- ✅ Three build outputs (ESM, UMD, Standalone)
- ✅ TypeScript definitions

**Pending:**
- ⏳ Testing with qa-bot-core@0.2.3-beta.6
- ⏳ Stable release (both repos)
- ⏳ access-ci-ui integration (Drupal)

## Development Notes

- **Vite Configuration:** Two configs exist - `vite.config.ts` (lib) and `vite.config.standalone.ts` (standalone)
- **emptyOutDir:** Set to `false` in standalone config to preserve lib outputs
- **Type Definitions:** Manual declarations in `src/types/qa-bot-core.d.ts` until upstream provides them
- **Preact Aliasing:** Standalone build replaces React with Preact via Vite resolve aliases
- **Session Management:** Uses localStorage with key `access-qa-bot-session-id`
- **Flow Settings:** Use `applyFlowSettings(flow, { disableOnOptions: true })` to auto-set `chatDisabled`

## Key Patterns

### chatDisabled Pattern
react-chatbotify doesn't reliably reset `chatDisabled` between steps. Solution: use `applyFlowSettings` from qa-bot-core:

```typescript
import { applyFlowSettings } from '@snf/qa-bot-core';

const customFlow = useMemo(() => {
  const rawFlow = { ...flow1, ...flow2 };
  return applyFlowSettings(rawFlow, { disableOnOptions: true });
}, [deps]);
```

### User Context
User info flows through: `AccessQABot` props → `UserInfo` object → `flow-context.ts` → individual flow steps (skips fields when data available).

## See Also

- `DEVELOPMENT_PLAN.md` - Detailed implementation status and architecture notes
- `local-notes/` - Git-ignored local documentation (architecture proposals, next steps)
