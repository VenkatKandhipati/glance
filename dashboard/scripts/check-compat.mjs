// Fails the build if the output uses CSS or JS the frame's WebView can't run.
// The frame runs Android WebView 106 on Android 8.1; some features newer Chromes accept were
// rejected on these devices (see docs/frame.md). Run after `vite build`.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// Checks dist/ by default; `node scripts/check-compat.mjs dist-frame` checks the frame build.
const DIST = new URL('../' + (process.argv[2] || 'dist') + '/assets/', import.meta.url).pathname;

// Checked inside CSS declaration blocks only, so ID selectors can't false-positive as hex colours.
const CSS_RULES = [
  [/#(?:[0-9a-f]{4}|[0-9a-f]{8})(?![0-9a-f])/i, '4/8-digit hex colour (rejected on-device; use rgba())'],
  [/\b(?:color-mix|oklch|oklab)\(/, 'colour function newer than Chrome 106'],
  [/\b\d*\.?\d+(?:dvh|svh|lvh|dvw|svw|lvw)\b/, 'dynamic viewport unit (Chrome 108+)'],
  [/backdrop-filter/, 'backdrop-filter (too slow on the Mali-G31)'],
];
const CSS_SELECTOR_RULES = [
  [/:has\(/, ':has() (did not work on these frames)'],
  [/@container/, 'container query (untested on the frame)'],
];
const JS_RULES = [
  [/\.(?:toSorted|toReversed|toSpliced)\(/, 'Array change-by-copy methods (Chrome 110)'],
  [/Object\.groupBy|Map\.groupBy/, 'groupBy (Chrome 117)'],
  [/Promise\.withResolvers/, 'Promise.withResolvers (Chrome 119)'],
  [/Array\.fromAsync/, 'Array.fromAsync (Chrome 121)'],
];

const problems = [];
for (const file of readdirSync(DIST)) {
  const text = readFileSync(join(DIST, file), 'utf8');
  if (file.endsWith('.css')) {
    for (const [, body] of text.matchAll(/\{([^{}]*)\}/g)) {
      for (const [re, why] of CSS_RULES) if (re.test(body)) problems.push(`${file}: ${why}: ${body.match(re)[0]}`);
    }
    for (const [re, why] of CSS_SELECTOR_RULES) if (re.test(text)) problems.push(`${file}: ${why}`);
  } else if (file.endsWith('.js')) {
    for (const [re, why] of JS_RULES) if (re.test(text)) problems.push(`${file}: ${why}`);
  }
}

if (problems.length) {
  console.error('Frame compatibility check failed:\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log('Frame compatibility check passed (WebView 106 / Chrome 106 target).');
