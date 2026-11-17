# Understanding scanner messages

## Runtime base64

Scribidian has no PDF export, so it bundles no fonts or PDF libraries. It
never calls browser `atob()` or `btoa()`. The production build rejects these
calls and release assets at or above 5,000,000 bytes.

## Unavailable malware or obfuscation scans

“Scan not available” means that the external scanner did not return a result.
It is neither a malware finding nor proof that the release is clean. The plugin
cannot enable those external checks. Retry the service's scan on the published
release; if still unavailable, report it to that service's operator.

GitHub release CI runs tests, lint, a dependency audit and the production build.
The three standard Obsidian assets have build-provenance attestations. These
checks establish specific evidence, not a substitute for an unavailable malware
scan. See [releasing](RELEASING.md) for verification commands.
