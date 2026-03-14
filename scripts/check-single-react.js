'use strict';
/**
 * check-single-react.js
 *
 * Exits 1 if more than one react@X.Y.Z version is installed across the workspace.
 * Run via: pnpm check:single-react
 *
 * Why this matters: two copies of React in the same bundler graph cause
 *   TypeError: Cannot read properties of null (reading 'useRef')
 * during SSR prerender. See CONTRIBUTING.md § Troubleshooting for the fix.
 */

const { execSync } = require('child_process');

const output = execSync('pnpm -r why react', { encoding: 'utf8' });

// pnpm -r why react prints leaf entries as:  "react 19.2.4 peer"  (SPACE, not @)
// We must exclude:
//   - react-dom, react-native, react-hook-form, …  (hyphen follows 'react')
//   - @types/react, @testing-library/react, …      (slash precedes 'react')
// Strategy: negative lookbehind – reject if 'react' is immediately preceded by
//   /  (scoped package path)   \w  (part of a compound name)   -  (hyphen suffix)
const matches = output.match(/(?<![/\w-])react[\s@](\d+\.\d+\.\d+)/g) ?? [];
const versions = [...new Set(matches.map((m) => m.match(/(\d+\.\d+\.\d+)/)[0]))];

if (versions.length === 0) {
  console.error('ERROR: react package not found in pnpm why output.');
  console.error('Run: pnpm install && pnpm check:single-react');
  process.exit(1);
}

if (versions.length > 1) {
  console.error('ERROR: Multiple React versions detected:', versions.join(', '));
  console.error(output);
  console.error('See CONTRIBUTING.md § Troubleshooting for the fix.');
  process.exit(1);
}

console.log('OK single React version:', versions[0]);
