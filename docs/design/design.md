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
| Screen routing      | react-router (`MemoryRouter`)                  |
| Prompts and wizards | @clack/prompts                                 |
| OpenSearch access   | @opensearch-project/opensearch                 |
| Packaging           | `bun build --compile`, one binary per platform |

## Architecture

Two layers, enforced by dependency-cruiser (`bun run arch`):

- The engine (`src/engine/`) is the whole capability surface, CQRS style: `queries/` for reads
  that return display-ready read models, `commands/` for writes. It is headless: no Ink, no
  React, no prompts. It wraps the OpenSearch client, so the transport can change without
  touching the frontend.
- The frontend (`src/frontend/`) is presentation only: reusable `components/`, one screen per
  user flow in `screens/`, and the REPL `shell/`. It drives the engine through the facade
  `src/engine/engine.ts`, the only engine module it may import.
- Destructive commands split into plan and execute. `plan` returns the preview the frontend
  shows for confirmation; `execute` performs the planned change.
- Inside the engine: types live with the module that owns them. `config` (profiles and the
  configuration file) imports nothing, `connection` imports the config, `queries` import config
  and connection, `commands` may also reuse queries.
- Records and services: data that crosses a serialization or rendering boundary (profiles, read
  models, plans) is a plain interface without methods, because it round-trips through JSON and
  React props. Anything with dependencies or lifecycle (the profile store, future command
  orchestration) is a class.
- `components/` import no engine; data arrives as props. Only the entry imports the shell.

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
- With no saved profile, the REPL suggests running `/profile add`, which saves one.
- When the profile has a username, osctl prompts for the password at connect.
- There are no environment variable overrides and no command-line connection flags.

## Safety rules

- Destructive commands (`/index rm`, `/alias rm`, `/template rm`, `/policy rm`) list the affected
  resources and totals, then ask for confirmation. There is no flag to skip confirmation.
- The status bar always shows the active profile and cluster health, because destructive commands
  on the wrong cluster are the main operational risk.
