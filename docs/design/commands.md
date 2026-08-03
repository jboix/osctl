# Command reference

Commands follow the noun-verb form: `<resource> <action>`, typed at the REPL prompt.

## index

| Command                  | Description                                                                                                                                                            | Backing API                                 |
|--------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------|
| `index ls [pattern]`     | List indices with health, doc count, size, creation date, and attached aliases                                                                                         | `_cat/indices`, `_cat/aliases`              |
| `index rm [pattern]`     | Delete indices. Opens a multi-select list when the pattern matches more than one index. Confirms with index count and total size. Warns when a write index is selected | `DELETE /{index}`                           |
| `index create <name>`    | Create an index. The wizard suggests the `-000001` suffix so rollover keeps working                                                                                    | `PUT /{index}`                              |
| `index rollover <alias>` | Roll over the write alias, then diff aliases between old and new head and offer to reapply missing ones                                                                | `POST /{alias}/_rollover`, `POST /_aliases` |

## alias

| Command            | Description                                                                | Backing API                      |
|--------------------|----------------------------------------------------------------------------|----------------------------------|
| `alias ls`         | Show a tree of aliases to indices. Marks the write index and shows filters | `GET /_alias`                    |
| `alias check`      | Report head indices missing expected aliases and offer to fix them         | `GET /_alias`                    |
| `alias apply`      | Apply alias actions from JSON input, with a preview of the resulting state | `POST /_aliases`                 |
| `alias rm <alias>` | Remove an alias from its indices after confirmation                        | `DELETE /{index}/_alias/{alias}` |

## template

| Command                 | Description                                                                                              | Backing API                           |
|-------------------------|----------------------------------------------------------------------------------------------------------|---------------------------------------|
| `template ls`           | List index templates                                                                                     | `GET /_index_template`                |
| `template show <name>`  | Print a template, syntax highlighted                                                                     | `GET /_index_template/{name}`         |
| `template diff <name>`  | Diff the remote template against JSON input                                                              | `GET /_index_template/{name}`         |
| `template apply <name>` | Create or update a template from JSON input. Reminds that existing indices are unaffected until rollover | `PUT /_index_template/{name}`         |
| `template edit <name>`  | Open the remote template in `$EDITOR`, show a diff on save, then apply                                   | `GET` + `PUT /_index_template/{name}` |
| `template rm <name>`    | Delete a template after confirmation                                                                     | `DELETE /_index_template/{name}`      |

## policy (ISM)

| Command                    | Description                                                                                | Backing API                                  |
|----------------------------|--------------------------------------------------------------------------------------------|----------------------------------------------|
| `policy ls`                | List ISM policies                                                                          | `GET /_plugins/_ism/policies`                |
| `policy show <name>`       | Print a policy                                                                             | `GET /_plugins/_ism/policies/{name}`         |
| `policy apply <name>`      | Create or update a policy from JSON input. Resolves `seq_no` and `primary_term` internally | `PUT /_plugins/_ism/policies/{name}`         |
| `policy edit <name>`       | Open the remote policy in `$EDITOR`, show a diff on save, then apply                       | `GET` + `PUT /_plugins/_ism/policies/{name}` |
| `policy rm <name>`         | Delete a policy after confirmation                                                         | `DELETE /_plugins/_ism/policies/{name}`      |
| `policy explain [pattern]` | Show ISM state per index: current state, age, next transition, failed actions              | `GET /_plugins/_ism/explain/{index}`         |

## session

| Command         | Description                                            |
|-----------------|--------------------------------------------------------|
| `connect`       | Run the connection wizard and save a profile           |
| `use <profile>` | Switch the active profile                              |
| `profiles`      | List saved profiles                                    |
| `refresh`       | Reload the cached resource names used for autocomplete |
| `help`          | Show commands and usage tips                           |
| `version`       | Print the osctl version                                |

## JSON input

Commands that take JSON (`alias apply`, `template apply`, `template diff`, `policy apply`) accept
it from any of these sources:

- `-f <file>`: read from a file.
- Paste: an input box accepts pasted JSON via bracketed paste and validates it live.
- Dropped file: a file dropped on the terminal is inserted as a path and loaded like `-f`.
- `$EDITOR`: the `edit` commands fetch the remote document and open it in the editor.
