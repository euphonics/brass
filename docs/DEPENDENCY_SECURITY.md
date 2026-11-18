# Development dependency security

The Obsidian development package pins Moment 2.29.4, including through the
Obsidian lint plugin. [Dependabot alert 1](https://github.com/grobmeier/firstdraft/security/dependabot/1)
reports GHSA-4p3w-j4w9-5jqw, patched in Moment 2.31.0.

`package.json` narrowly overrides Moment to **2.31.0** and the lockfile resolves
all development copies to that version. Moment is not a Scribidian runtime
dependency; this does not update the Moment version inside users' Obsidian apps.
Remove the override only after upstream tooling requests a patched release and
the complete dependency tree remains clean.

On Node 24, run `npm ci --ignore-scripts`, `npm ls moment`, `npm audit`, then the
build, lint and test suite. The 2026-10-03 local audit reports zero vulnerabilities.
The hosted alert remains open until this change reaches GitHub and is rescanned;
do not dismiss the alert as a substitute for shipping the patched lockfile.

## What CI blocks on

CI and the release workflow fail on `npm audit --omit=dev --audit-level=high`:
high-severity problems in packages that ship in the plugin. A full
`npm audit` also runs and lists problems in build and test tools, but does
not fail the run. This changed on 2026-11-17, when GHSA-fc5q-39xc-vjpf
(ReDoS in picomatch, every version up to 4.0.7, no patched release) reached
vite, vitest and typescript-eslint. picomatch is not in `main.js`. When a
patched picomatch is released, update the lockfile so the full audit is clean
again.
