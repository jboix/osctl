# osctl design

osctl is a terminal client for managing OpenSearch indices, aliases, index templates, and ISM
policies. It replaces the shell scripts in `scripts/osctl`. The name stands for OpenSearch control.

## Goals

- Replace raw curl calls with the official OpenSearch client, because response and error handling
  in shell is unreliable.
- Make destructive operations preview their effect and ask for confirmation.
- Make rollover carry all aliases to the new head index, because manual `_rollover` does not copy
  secondary aliases.
- Provide autocomplete on live resource names (indices, aliases, templates, policies).

## Stack

| Concern             | Choice                                         |
|---------------------|------------------------------------------------|
| Language            | TypeScript                                     |
| Runtime             | Bun                                            |
| Terminal UI         | Ink                                            |
| Prompts and wizards | @clack/prompts                                 |
| OpenSearch access   | @opensearch-project/opensearch                 |
| Packaging           | `bun build --compile`, one binary per platform |

## Mode

osctl is interactive only. `osctl` opens the REPL described in [repl.md](repl.md). There is no
non-interactive command mode: scripting and CI use cases are covered by the official OpenSearch
CLI, and a second mode would double the maintenance surface.

## Distribution

- CI publishes one compiled binary per platform to GitHub releases.
- `install-osctl.sh` downloads the binary for the requested version and updates the `current`
  symlink. The existing install flow is unchanged.

## Configuration

Profiles live in `~/.config/osctl/config.json`.

| Field       | Description                                               |
|-------------|-----------------------------------------------------------|
| `name`      | Profile name, for example `prod`                          |
| `host`      | Cluster URL                                               |
| `username`  | Basic auth username, omitted when the cluster has no auth |
| `tlsVerify` | Whether to verify TLS certificates, default `true`        |

The password is never written to disk. osctl prompts for it once per session with masked input
and holds it in memory only. Password storage may be revisited later.

## Credential resolution

- Connection settings come from the saved profile.
- With no saved profile, the connection wizard runs and saves one.
- When the profile has a username, osctl prompts for the password at connect.
- There are no environment variable overrides and no command-line connection flags.

## Safety rules

- Destructive commands (`index rm`, `alias rm`, `template rm`, `policy rm`) list the affected
  resources and totals, then ask for confirmation. There is no flag to skip confirmation.
- The status bar always shows the active profile and cluster health, because destructive commands
  on the wrong cluster are the main operational risk.
