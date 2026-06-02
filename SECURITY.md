# Security Policy

`valkyriweb/pi-mono` is a personal fork of [`earendil-works/pi-mono`](https://github.com/earendil-works/pi-mono),
maintained by [@valkyriweb](https://github.com/valkyriweb). It tracks upstream
closely and adds a fork-specific platform layer.

## Supported versions

Only the latest published `@valkyriweb/pi-*` release is supported. Older
versions do not receive security fixes — upgrade to the latest tag.

## Reporting a vulnerability

Use **private vulnerability reporting**: open the repository's
[Security tab](https://github.com/valkyriweb/pi-mono/security/advisories/new)
and submit a private advisory. Do not open a public issue or PR for security
problems, and do not include exploit details in public discussion.

Please include:

- affected package(s) and version(s),
- a description of the issue and its impact,
- reproduction steps or a proof of concept,
- any known mitigation.

You will get an acknowledgement and, where applicable, a coordinated fix and
disclosure. There is no bug-bounty program.

## Upstream issues

If the vulnerability originates in upstream Pi (not in the fork's delta),
please also report it to
[earendil-works/pi-mono](https://github.com/earendil-works/pi-mono/security)
so it can be fixed at source.

## Scope

In scope: the published `@valkyriweb/pi-*` packages and the fork's own
workflows, scripts, and release/publish pipeline. Out of scope: vulnerabilities
that only exist in third-party dependencies (report those upstream to the
dependency), and issues that require a pre-compromised local machine.
