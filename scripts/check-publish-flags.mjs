// Runs after the prepack build. VITE_* values are baked into dist at build
// time, so a VITE_AGENT_ENABLED=true left in a local .env file would ship in
// the published package. Fails unless the flag is off, or ALLOW_AGENT_PUBLISH
// is set for a deliberate agent-mode release.
import { readFileSync } from 'node:fs';

const BUNDLES = ['dist/access-qa-bot.js', 'dist/access-qa-bot.umd.cjs', 'dist/access-qa-bot.standalone.js'];
const allowAgent = process.env.ALLOW_AGENT_PUBLISH === 'true';
const errors = [];

for (const file of BUNDLES) {
  const code = readFileSync(file, 'utf8');
  const flags = [...code.matchAll(/AGENT_ENABLED:\s*(!0|!1|true|false)\b/g)].map((m) => m[1]);
  // Not finding the flag fails too, so a change in how it's minified can't
  // turn this check into a silent pass.
  if (flags.length !== 1) {
    errors.push(`${file}: expected one baked AGENT_ENABLED, found ${flags.length}`);
    continue;
  }
  const enabled = flags[0] === '!0' || flags[0] === 'true';
  if (enabled && !allowAgent) {
    errors.push(`${file}: AGENT_ENABLED is true. Check .env* for VITE_AGENT_ENABLED, or set ALLOW_AGENT_PUBLISH=true for an agent-mode release.`);
  }
  if (enabled && /AGENT_ENDPOINT:\s*"https?:\/\/(localhost|127\.0\.0\.1)[:/]/.test(code)) {
    errors.push(`${file}: AGENT_ENABLED is true but AGENT_ENDPOINT is local. Set VITE_AGENT_ENDPOINT.`);
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('Publish flags OK');
