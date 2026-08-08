# Command reference

Commands follow the noun-verb form: `/<resource> <action>`, typed at the prompt. Every
command starts with `/`; pressing tab lists them all. The leading `/` may be omitted when
typing; the slash form is the official one.

## index

| Command                              | Description                                                                                                                                                            | Backing API                                 |
|--------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------|
| `/index ls [pattern]`                | List indices with health, doc count, size, creation date, and attached aliases                                                                                         | `_cat/indices`, `_cat/aliases`              |
| `/index rm [pattern]`                | Delete indices. Opens a multi-select list of the matching indices. Confirms with index count and total size. Warns when a write index is selected | `DELETE /{index}`                           |
| `/index create <name> [write-alias]` | Create an index. Without the alias shorthand, the body opens in the editor                                                                        | `PUT /{index}`                              |
| `/index rollover <alias>`            | Roll over the write alias, then reapply the aliases the new head is missing                                                                       | `POST /{alias}/_rollover`, `POST /_aliases` |

## alias

| Command               | Description                                                                | Backing API                      |
|-----------------------|----------------------------------------------------------------------------|----------------------------------|
| `/alias ls [pattern]` | Show a tree of aliases to indices. Marks the write index and shows filters | `GET /_alias`                    |
| `/alias apply`        | Edit alias actions in the editor, preview a summary, then apply            | `POST /_aliases`                 |
| `/alias rm [pattern]` | Remove aliases from a selection after confirmation                         | `DELETE /{index}/_alias/{alias}` |

## template

| Command                  | Description                                                                                                                                            | Backing API                           |
|--------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------|
| `/template ls [pattern]` | List index templates                                                                                                                                   | `GET /_index_template`                |
| `/template show [name]`  | Print a template, from a picker when no name is given                                                                                                  | `GET /_index_template/{name}`         |
| `/template apply [name]` | Edit the named template (or pick one, or start a new one), confirm a line diff, then save. Reminds that existing indices are unaffected until rollover | `GET` + `PUT /_index_template/{name}` |
| `/template rm <name>`    | Delete a template after confirmation                                                                                                                   | `DELETE /_index_template/{name}`      |

## policy (ISM)

| Command                     | Description                                                                                                                              | Backing API                                  |
|-----------------------------|------------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------|
| `/policy ls [pattern]`      | List ISM policies                                                                                                                        | `GET /_plugins/_ism/policies`                |
| `/policy show [name]`       | Print a policy, from a picker when no name is given                                                                                      | `GET /_plugins/_ism/policies/{name}`         |
| `/policy apply [name]`      | Edit the named policy (or pick one, or start a new one), confirm a line diff, then save. Resolves `seq_no` and `primary_term` internally | `GET` + `PUT /_plugins/_ism/policies/{name}` |
| `/policy rm <name>`         | Delete a policy after confirmation                                                                                                       | `DELETE /_plugins/_ism/policies/{name}`      |
| `/policy explain [pattern]` | Show ISM state per index: current state, age, next transition, failed actions                                                            | `GET /_plugins/_ism/explain/{index}`         |

## cluster

| Command         | Description                                    | Backing API                                                   |
|-----------------|------------------------------------------------|---------------------------------------------------------------|
| `/cluster info` | Show the health, active blocks, and disk usage | `_cluster/health`, `_cluster/state/blocks`, `_cat/allocation` |

## session

| Command                   | Description                                                  |
|---------------------------|--------------------------------------------------------------|
| `/profile add`            | Run the connect wizard: add a profile and connect to it      |
| `/profile ls`             | List the profiles as a select; picking one switches to it    |
| `/profile default [name]` | Set the default profile, interactively when no name is given |
| `/profile rm [pattern]`   | Delete profiles from a selection                             |
| `/copy`                   | Copy the last command output to the clipboard                |
| `/help`                   | Show the available commands                                  |
| `/version`                | Print the osctl version                                      |
| `/exit`                   | Quit osctl                                                   |

## Shown documents

`/template show` and `/policy show` render the document as a block with a summary line
naming the document and its line count.

- Documents longer than 10 lines render folded: the first 10 lines, then a marker with
  the hidden line count.
- Ctrl+o folds or expands every shown document at once, including those in the
  scrollback, by repainting it.
- While there is something to copy, the right edge of the status bar shows the hint
  `/copy copies the last output`.

## /copy

`/copy` copies the last command output as plain text: the JSON of a shown document, the
rendered text of a table or tree, the text of a failure report or message.

- A shown document is copied in full, folded or not.
- The copy uses the platform tool: `pbcopy` on macOS, `wl-copy`, `xclip`, or `clip.exe`
  (WSL) on Linux, `clip` on Windows. Without a working tool it falls back to the OSC 52
  escape sequence, which most terminals apply.

## The editor

Commands that take JSON (`/alias apply`, `/template apply`, `/policy apply`, and
`/index create` without the alias shorthand) open the configured editor, like `git commit`
does. The editor is `$VISUAL`, then `$EDITOR`, then `vi`.

- The file is JSONC: a comment header carries the instructions, the documentation link, and,
  for aliases, the existing alias names. Full comment lines are stripped before parsing.
- `/template apply <name>` and `/policy apply <name>` open the named document directly.
  Without a name a picker lists the existing documents: one opens prefilled, `new` asks for
  a name and opens a minimal skeleton.
- Quitting without saving, saving without a change, or saving an empty file aborts. Invalid
  JSON aborts and names the temporary file, so the edit is not lost.
- Before anything is sent, a confirmation shows a line diff for existing documents, the action
  summary for aliases, and the plain body for new documents and indices. The diff shows only
  the changed hunks, with line numbers and three context lines, like git. OpenSearch has no
  dry run for these APIs; the alias summary restates the actions, it does not predict the
  cluster outcome.
