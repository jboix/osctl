# REPL specification

`osctl` opens the REPL. The REPL is the only mode.

## Startup

- With no saved profile, the REPL suggests running `/profile add`.
- With one or more saved profiles, the REPL connects to the default profile and prompts for its
  password when the profile has a username. A wrong password re-asks the password.

## The /profile add wizard

- `/profile add` runs the connect wizard: profile name, host, auth type, and TLS verification.
- Choice questions (auth type, TLS) are arrow-key selects. Text questions show their default in
  brackets; enter takes it.
- With basic auth, the wizard asks for username and password. The password is masked, stays in
  memory for the session, and is never written to disk.
- The wizard tests the connection before saving. On success it saves the profile as the default.
- On failure it returns to the host step with the answers kept and the error shown.
- Escape cancels the wizard.

## Layout

- Input line at the bottom.
- Status bar below the input line: active profile, cluster health, connected host.
- Command output scrolls above the input line.

## Command suggestions

- The commands matching the typed prefix appear under the input while typing. The leading `/`
  is optional; the list shows the names without it.
- Tab moves the focus between the input and the list. On an empty input, tab lists every
  command.
- With the list focused: up and down move the highlight, enter runs the highlighted command,
  and escape or typing returns the focus to the input.
- With the input focused, the arrows browse the history and enter submits the typed line.

## Line editing

- The command input follows the readline conventions: ctrl+a and ctrl+e jump to the start and
  the end, ctrl+w deletes the word before the caret, ctrl+u and ctrl+k delete to the start and
  to the end, left and right move the caret, meta with an arrow moves word by word.
- Backspace deletes before the caret. Delete removes the character at the caret.
- ctrl+c clears the line, and quits on an already empty line. Escape clears the line.

## History

- Up and down browse the submitted lines while the suggestion list is closed.
- Typing resets the history cursor. The draft line is restored when browsing past the newest
  entry. Consecutive duplicates are stored once.

## Autocomplete

- Tab completes command names and resource names.
- Resource names (indices, aliases, templates, policies) are fetched at connect and cached.
- `/refresh` reloads the cache. Commands that create or delete resources update the cache
  themselves.

## Multi-select lists

Used by `/index rm` when the pattern matches more than one index.

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
- `/index rm` warns when the selection includes a write index.
