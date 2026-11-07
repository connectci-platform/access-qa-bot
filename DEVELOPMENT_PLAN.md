# Development Plan: ACCESS QA Bot Wrapper

## Quick Resume

**When returning to this project:**
1. Run `npm run dev` to test locally
2. If all flows work → ready for release (see Release Checklist below)
3. Key docs: `CLAUDE.md` (project overview), `publishing.md` (npm workflow)

**Current state:** All flows implemented. Using qa-bot-core@0.2.3-beta.6. Ready for testing.

---

## Current Status

### ✅ Completed

| Phase | Description | Notes |
|-------|-------------|-------|
| **Phase 1: User Context** | User info in flows | Props flow through `AccessQABot` → `UserInfo` → `flow-context.ts`. Skips form fields when data available. |
| **Phase 2: File Attachments** | Upload component | Implemented in `@snf/qa-bot-core`. Imported as `FileUploadComponent`. |
| **Phase 4: ACCESS Login Flow** | 10-step ticket flow | Full flow with file upload, validation, summary, JIRA submission. |
| **Phase 4: Resource Login Flow** | 10-step ticket flow | For resource provider login issues. Uses `loginProvider` ticket type. |
| **Phase 5: General Help Flow** | Multi-step general help | Keywords, priority, category, resource involvement. Uses `support` ticket type. |
| **Phase 6: Security Incident Flow** | Security reporting | Priority levels, file attachments, submits to security-incidents endpoint. |
| **Phase 7: Metrics/XDMoD Flow** | Usage queries | Q&A loop against metrics API with feedback buttons. |
| **Phase 8: Main Menu** | Navigation | Routes between Q&A, tickets, metrics, security. All 4 options wired up. |
| **Infrastructure** | Build system, types, API | ESM/UMD/Standalone builds, TypeScript definitions, ticket API with Netlify proxy. |
| **Footer Fix** | qa-bot-core bug fix | Fixed footer flash issue - moved config from useEffect to useMemo. |
| **Login State Refactor** | Replace `enabled` with `isLoggedIn` | Implemented in qa-bot-core v0.2.3-beta.4. See `local-notes/ARCHITECTURE_PROPOSAL_LOGIN_STATE.md` |
| **chatDisabled Pattern** | Auto-set via `applyFlowSettings` | Implemented in qa-bot-core v0.2.3-beta.6. Removed 55 explicit statements from flows. |
| **Documentation** | Updated CLAUDE.md, created publishing.md | CLAUDE.md reflects current state. publishing.md has npm workflow. |

---

## Completed: Login State Refactor

**See:** `local-notes/ARCHITECTURE_PROPOSAL_LOGIN_STATE.md`

### Final Design

| Prop | Type | Default | Purpose |
|------|------|---------|---------|
| `isLoggedIn` | `boolean` | **required** | Login state: header icon + Q&A gating |
| `allowAnonAccess` | `boolean` | `false` | Escape hatch: bypass Q&A gating |

### What Changed

**qa-bot-core (v0.2.3-beta.4):**
- Removed `enabled` prop
- Added required `isLoggedIn` prop
- Added optional `allowAnonAccess` prop
- Q&A gated when `isLoggedIn === false` (unless `allowAnonAccess`)
- Input never globally disabled

**access-qa-bot:**
- Changed `enabled={isLoggedIn}` → `isLoggedIn={isLoggedIn}`
- Gating is automatic, no second prop needed

---

## Completed: chatDisabled Pattern

**Problem:** react-chatbotify does not reliably fall back to `settings.chatInput.disabled` when transitioning between steps. If a step has `chatDisabled: true` and the next step omits it, the input stays disabled.

**Solution:** `applyFlowSettings` utility in qa-bot-core v0.2.3-beta.6.

### Usage

```typescript
import { applyFlowSettings } from '@snf/qa-bot-core';

const customFlow = useMemo(() => {
  const rawFlow = { ...flow1, ...flow2 };
  return applyFlowSettings(rawFlow, { disableOnOptions: true });
}, [deps]);
```

### Behavior

When `disableOnOptions: true`:
- Steps with `options` or `checkboxes` → `chatDisabled: true`
- Steps without → `chatDisabled: false`
- Steps with explicit `chatDisabled` → unchanged

### Result

Removed 55 explicit `chatDisabled` statements from access-qa-bot flows. Only one dynamic `chatDisabled` function remains (in security-flow.tsx for conditional contact info).

---

## Architecture Notes

### Language/Strings Source

All user-facing strings match the old qa-bot repo:
- `qa-bot/src/utils/flows/main-menu-flow.js`
- `qa-bot/src/utils/flows/tickets/*.js`
- `qa-bot/src/utils/flows/security-flow.js`
- `qa-bot/src/utils/flows/metrics-flow.js`

### Ticket API Infrastructure

Complete in `src/utils/ticket-api.ts`:
- `submitTicket()` - High-level submission function
- Request type IDs: SUPPORT=17, LOGIN_ACCESS=30, LOGIN_PROVIDER=31, SECURITY=26

### Naming Convention

The old qa-bot uses "affiliated" for resource login. We renamed to "resource" for clarity:
- Old: `affiliated_help`, `affiliated_login_*`
- New: `resource_help`, `resource_login_*`

---

## Release & Transition Plan

### Package Continuity

This repo replaces `qa-bot` but publishes to the **same npm package** (`@snf/access-qa-bot`):

| Repo | Version Range | Status |
|------|---------------|--------|
| `qa-bot` (old) | v0.x - v2.x | To be deprecated |
| `access-qa-bot` (this) | v3.0.0+ | Active |

From consumers' perspective (e.g., `access-ci-ui`), this is just a version bump.

### Release Checklist

| Step | Status | Command/Action |
|------|--------|----------------|
| 1. Test locally | ⏳ Pending | `npm run dev`, verify all flows work |
| 2. qa-bot-core stable | ⏳ Pending | Publish stable release in qa-bot-core repo |
| 3. Update dependency | ⏳ Pending | `npm install @snf/qa-bot-core@latest` (after stable) |
| 4. Publish this repo | ⏳ Pending | Follow `publishing.md` workflow |
| 5. Deprecate old repo | ⏳ Pending | See below |

**See `publishing.md`** for detailed npm publishing workflow.

### Deprecating the Old qa-bot Repo

After v3.0.0 is published and verified:

1. **Update old repo's README.md:**
   ```markdown
   # ⚠️ DEPRECATED

   This repository has been superseded by a rewrite.

   **New repository:** [access-qa-bot](https://github.com/connectci-platform/access-qa-bot)

   The npm package `@snf/access-qa-bot` continues from v3.0.0 in the new repo.

   - For v2.x and earlier: This repo (archived)
   - For v3.0.0+: See [access-qa-bot](https://github.com/connectci-platform/access-qa-bot)
   ```

2. **Archive the repo on GitHub** (Settings → Archive)

3. **Old versions remain available** - `npm install @snf/access-qa-bot@2.7.3` still works

### access-ci-ui Integration

After publishing v3.0.0:
- Update dependency: `npm install @snf/access-qa-bot@latest`
- Props change: `enabled` → `isLoggedIn` (breaking change, documented)
- Test in Drupal environment

---

## File Structure

```
src/
├── components/
│   └── AccessQABot.tsx      # Main wrapper component
├── config/
│   └── constants.ts         # API endpoints, bot config
├── flows/
│   ├── index.ts             # Flow exports
│   ├── main-menu-flow.ts    # Top-level navigation
│   ├── ticket-flow.ts       # Ticket type selection + combines flows
│   ├── access-login-flow.tsx    # ACCESS login issues
│   ├── resource-login-flow.tsx  # Resource login issues
│   ├── general-help-flow.tsx    # General help tickets
│   ├── security-flow.tsx        # Security incidents
│   └── metrics-flow.ts          # XDMoD queries
├── utils/
│   ├── flow-context.ts      # Form state management
│   ├── ticket-api.ts        # JIRA submission
│   ├── validation.ts        # Input validators
│   └── session.ts           # Session ID management
└── types/
    ├── index.ts             # TypeScript definitions
    └── qa-bot-core.d.ts     # Type declarations for @snf/qa-bot-core
```
