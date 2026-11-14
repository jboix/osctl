# Security Policy

## Supported Versions

The latest release of osctl gets security updates. Older releases do not.

## Reporting a Vulnerability

Do not open a GitHub issue for a security problem.
[Report a vulnerability](https://github.com/jboix/osctl/security/advisories/new) privately on
GitHub instead. The maintainer answers as soon as possible.

Include the osctl version, how you installed it (npm, npx, or a release archive), the
OpenSearch version, and the steps that reproduce the problem. Remove credentials, hostnames, and
cluster data from the report.

There are no bounties. If you want, the release notes credit you for the report.

## Scope

osctl stores connection profiles in `~/.config/osctl/config.json` and never writes passwords to
disk. Reports about the handling of credentials, profiles, TLS settings, the install script, or
the release archives and their checksums are in scope.
