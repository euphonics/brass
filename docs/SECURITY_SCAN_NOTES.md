# Understanding scanner messages

## Runtime base64

PDF export bundles the Courier Prime font. The build stores its bytes as
base64 text, decoded by a few lines of plain JavaScript on first use
(`scripts/font-bytes.mjs`): no data URL, and no browser `atob()` or `btoa()`.
The production build rejects those calls and release assets at or above
5,000,000 bytes.

## Unavailable malware or obfuscation scans

“Scan not available” means that the external scanner did not return a result.
It is neither a malware finding nor proof that the release is clean. The plugin
cannot enable those external checks. Retry the service's scan on the published
release; if still unavailable, report it to that service's operator.

GitHub release CI runs tests, lint, a dependency audit and the production build.
The three standard Obsidian assets have build-provenance attestations. These
checks establish specific evidence, not a substitute for an unavailable malware
scan. See [releasing](RELEASING.md) for verification commands.
