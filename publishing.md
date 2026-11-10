# @snf/access-qa-bot Publishing Guide

This document outlines the process for publishing the ACCESS Q&A Bot package to npm.

## Context

This repository replaces the legacy `qa-bot` repo. Both publish to `@snf/access-qa-bot`:

| Repo | Version Range | Status |
|------|---------------|--------|
| `qa-bot` (old) | v0.x - v2.x | Deprecated |
| `access-qa-bot` (this) | v3.0.0+ | Active |

## Version Management

**Critical rules:**
- Version numbers must be incremented - never reuse
- CDN links reference git tags - check existing tags before versioning
- This repo continues from v3.0.0 (major bump from old repo's v2.x)

### Checking Existing Versions

```bash
# List all version tags
git tag -l "v*"

# Check a specific version
git tag -l "v3.0.0"
```

## Setup

1. Ensure you have npm credentials for the `snf` organization

2. Log in to npm:
   ```bash
   npm login
   ```

## Standard Release Process

### 1. Feature Development

```bash
# Create feature branch from main
git checkout -b feature/my-feature main

# Make changes, commit them
# DO NOT update version numbers - this happens after merge
```

### 2. Test the Package (Optional)

```bash
# Test pack without version changes
npm pack
tar -tf snf-access-qa-bot-*.tgz

# Clean up
rm snf-access-qa-bot-*.tgz
```

### 3. Open Pull Request

- Create PR from feature branch to `main`
- Include description of changes
- Get review and approval
- **Note**: PR should NOT include version bumps

### 4. Merge to Main

Merge via GitHub. Then proceed with release.

### 5. Prepare Release (Post-Merge)

```bash
# Switch to main and pull latest
git checkout main
git pull origin main

# Check existing versions
git tag -l "v*"

# Update version in package.json (manually edit)
# Example: "3.0.1"

# Sync package-lock.json
npm install

# Build all outputs. Production values (anonymous access, Turnstile key)
# come from the committed .env.production, and prepack fails the publish
# if they're missing from dist.
npm run build

# Commit version change and builds
git add .
git commit -m "Bump version to X.Y.Z"

# Push to main
git push origin main
```

### 6. Create Git Tag

```bash
# Create and push tag
git tag -a vX.Y.Z -m "Release version X.Y.Z"
git push origin vX.Y.Z
```

### 7. Create GitHub Release

- Go to: https://github.com/connectci-platform/access-qa-bot/releases/new
- Select the tag you created
- Add title and description
- Click "Publish release"

### 8. Publish to npm

```bash
# Publish to npm
npm publish --access public
```

## Beta Release Workflow

For pre-release testing:

```bash
# Update version to beta
npm version 3.0.0-beta.1

# Build
npm run build

# Publish with beta tag
npm publish --tag beta --access public
```

Install beta versions:
```bash
npm install @snf/access-qa-bot@beta
```

## Debug Release Workflow

For quick debug releases during development:

```bash
# From any branch
npm version 3.0.0-debug.1

# Build
npm run build

# Publish with debug tag
npm publish --tag debug --access public
```

This is useful for:
- Quick iterations during development
- Testing in integration environments
- Debugging without affecting stable releases

## CDN Usage

### 1. jsdelivr CDN (npm-based)

Available after npm publish. jsDelivr's GitHub-based path doesn't work here,
because `dist/` isn't committed:

```html
<!-- Standalone bundle (includes Preact) -->
<script src="https://cdn.jsdelivr.net/npm/@snf/access-qa-bot@3.0.0/dist/access-qa-bot.standalone.js"></script>
```

### 2. unpkg CDN (npm-based)

Available after npm publish:

```html
<!-- Standalone bundle -->
<script src="https://unpkg.com/@snf/access-qa-bot@3.0.0/dist/access-qa-bot.standalone.js"></script>
```

### 3. npm Package

```bash
npm install @snf/access-qa-bot
```

```javascript
import { AccessQABot } from '@snf/access-qa-bot';
```

## Build Outputs

| File | Format | Use Case |
|------|--------|----------|
| `dist/access-qa-bot.js` | ESM | npm import (React apps) |
| `dist/access-qa-bot.umd.cjs` | UMD | CommonJS require |
| `dist/access-qa-bot.standalone.js` | IIFE | CDN/script tag (bundles Preact) |
| `dist/style.css` | CSS | Styles |

## Dependencies

This package depends on `@snf/qa-bot-core`. When releasing:

1. Ensure qa-bot-core is published first (if it has changes)
2. Update the qa-bot-core dependency version if needed
3. Test the integration before publishing

## AI Assistant Notes

- **Version bump timing**: Always AFTER PR merge, on main branch
- **Feature PRs**: Should NOT include version bumps
- **Build command**: `npm run build` (builds all outputs)
- **Beta releases**: Use `--tag beta` flag
- **Check tags** before choosing version to avoid CDN conflicts

