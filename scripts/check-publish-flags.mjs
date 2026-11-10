// Runs after the prepack build. VITE_* values are baked into dist at build
// time, so the published package carries whatever env the build saw.
// - AGENT_ENABLED must be off, unless ALLOW_AGENT_PUBLISH is set for a
//   deliberate agent-mode release. A true left in a local .env would ship.
// - ALLOW_ANON_ACCESS must be on and TURNSTILE_SITE_KEY set. Both come from
//   .env.production; 3.10.0 shipped without them and logged-out visitors
//   were told to log in before they could ask anything.
import { readFileSync } from 'node:fs';

const BUNDLES = ['dist/access-qa-bot.js', 'dist/access-qa-bot.umd.cjs', 'dist/access-qa-bot.standalone.js'];
const allowAgent = process.env.ALLOW_AGENT_PUBLISH === 'true';
const errors = [];

// Not finding a flag fails too, so a change in how it's minified can't turn
// this check into a silent pass.
function bakedValues(code, file, name, pattern) {
  const values = [...code.matchAll(pattern)].map((m) => m[1]);
  if (values.length !== 1) {
    errors.push(`${file}: expected one baked ${name}, found ${values.length}`);
    return null;
  }
  return values[0];
}

const isTrue = (v) => v === '!0' || v === 'true' || v === '"true"';

for (const file of BUNDLES) {
  const code = readFileSync(file, 'utf8');

  const agent = bakedValues(code, file, 'AGENT_ENABLED', /AGENT_ENABLED:\s*(!0|!1|true|false)\b/g);
  if (agent !== null) {
    const enabled = isTrue(agent);
    if (enabled && !allowAgent) {
      errors.push(`${file}: AGENT_ENABLED is true. Check .env* for VITE_AGENT_ENABLED, or set ALLOW_AGENT_PUBLISH=true for an agent-mode release.`);
    }
    if (enabled && /AGENT_ENDPOINT:\s*"https?:\/\/(localhost|127\.0\.0\.1)[:/]/.test(code)) {
      errors.push(`${file}: AGENT_ENABLED is true but AGENT_ENDPOINT is local. Set VITE_AGENT_ENDPOINT.`);
    }
  }

  const anon = bakedValues(code, file, 'ALLOW_ANON_ACCESS', /(?<![\w$])ALLOW_ANON_ACCESS:\s*(!0|!1|true|false|"true"|"false"|"")/g);
  if (anon !== null && !isTrue(anon)) {
    errors.push(`${file}: ALLOW_ANON_ACCESS is off. Set VITE_ALLOW_ANON_ACCESS=true in .env.production.`);
  }

  const key = bakedValues(code, file, 'TURNSTILE_SITE_KEY', /(?<![\w$])TURNSTILE_SITE_KEY:\s*("[^"]*"|[\w$.]+\s*\|\|\s*"")/g);
  if (key !== null && !/^"0x[\w-]+"$/.test(key)) {
    errors.push(`${file}: TURNSTILE_SITE_KEY is empty. Set VITE_TURNSTILE_SITE_KEY in .env.production.`);
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('Publish flags OK');
