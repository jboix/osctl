# REPL specification

`osctl` opens the REPL. The REPL is the only mode.

## Startup

- With no saved profile, the connection wizard runs first.
- The wizard asks for host, auth type (none or basic), and TLS verification.
- With basic auth, the wizard prompts for the password with masked input. The password stays in
  memory for the session and is never written to disk.
- The wizard pings the cluster before saving the profile and shows the cluster name, version, and
  health.
- With one or more saved profiles, the REPL connects to the default profile and prompts for its
  password when the profile has a username.

## Layout

- Input line at the bottom.
- Status bar below the input line: active profile, cluster health, connected host.
- Command output scrolls above the input line.

## Command palette

- Typing `/` opens the palette listing all commands.
- The palette filters with fuzzy matching as the user types.
- Enter runs the selected command or inserts it when it needs arguments.

## Autocomplete

- Tab completes command names and resource names.
- Resource names (indices, aliases, templates, policies) are fetched at connect and cached.
- `refresh` reloads the cache. Commands that create or delete resources update the cache
  themselves.

## Multi-select lists

Used by `index rm` when the pattern matches more than one index.

- Space toggles the highlighted row. `a` toggles all rows.
- Each row shows name, size, doc count, and a write-index marker.
- The confirmation step shows the count of selected indices and their total size.

## JSON input box

Used by commands that accept JSON without `-f`.

- Accepts pasted content via bracketed paste.
- Detects a pasted path to an existing `.json` file and loads that file instead.
- Validates JSON on every change and shows the position of the first error.
- Confirmation shows the pretty-printed payload before sending.

## Confirmations

- Destructive commands always confirm. There is no flag to skip confirmation.
- The confirmation lists the affected resources by name.
- `index rm` warns when the selection includes a write index.
