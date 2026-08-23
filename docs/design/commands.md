# Command reference

Commands follow the noun-verb form: `/<resource> <action>`, typed at the prompt. Every
command starts with `/`; pressing tab lists them all. The leading `/` may be omitted when
typing; the slash form is the official one.

## index

| Command                              | Description                                                                                                                                       | Backing API                                 |
|--------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------|
| `/index ls [pattern]`                | List indices with health, doc, deleted, and indexed counts, size, creation date, and aliases                                                      | `_cat/indices`, `_cat/aliases`              |
| `/index rm [pattern]`                | Delete indices. Opens a multi-select list of the matching indices. Confirms with index count and total size. Warns when a write index is selected | `DELETE /{index}`                           |
| `/index create <name> [write-alias]` | Create an index. Without the alias shorthand, the body opens in the editor                                                                        | `PUT /{index}`                              |
| `/index rollover <alias>`            | Roll over the write alias, then reapply the aliases the new head is missing                                                                       | `POST /{alias}/_rollover`, `POST /_aliases` |
| `/index show [name]`                 | Print an index, from a picker when the name does not settle it                                                                                    | `GET /{index}`                              |
| `/index settings [name]`             | Print an index's settings with flat keys, from a picker when the name does not settle it                                                          | `GET /{index}/_settings`                    |
| `/index settings apply [name]`       | Edit an index's settings, confirm a line diff, then save                                                                                          | `GET` + `PUT /{index}/_settings`            |

## alias

| Command               | Description                                                                | Backing API                      |
|-----------------------|----------------------------------------------------------------------------|----------------------------------|
| `/alias ls [pattern]` | Show a tree of aliases to indices. Marks the write index and shows filters | `GET /_alias`                    |
| `/alias apply`        | Edit alias actions in the editor, preview a summary, then apply            | `POST /_aliases`                 |
| `/alias rm [pattern]` | Remove aliases from a selection after confirmation                         | `DELETE /{index}/_alias/{alias}` |

## template

| Command                  | Description                                                                                                                                                     | Backing API                           |
|--------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------|
| `/template ls [pattern]` | List index templates                                                                                                                                            | `GET /_index_template`                |
| `/template show [name]`  | Print a template, from a picker when the name does not settle it                                                                                                | `GET /_index_template/{name}`         |
| `/template apply [name]` | Edit a template (picked, or new, when the name does not settle it), confirm a line diff, then save. Reminds that existing indices are unaffected until rollover | `GET` + `PUT /_index_template/{name}` |
| `/template rm <name>`    | Delete a template after confirmation                                                                                                                            | `DELETE /_index_template/{name}`      |

## component

| Command                   | Description                                                                                                   | Backing API                               |
|---------------------------|---------------------------------------------------------------------------------------------------------------|-------------------------------------------|
| `/component ls [pattern]` | List component templates                                                                                      | `GET /_component_template`                |
| `/component show [name]`  | Print a component template, from a picker when the name does not settle it                                    | `GET /_component_template/{name}`         |
| `/component apply [name]` | Edit a component template (picked, or new, when the name does not settle it), confirm a line diff, then save | `GET` + `PUT /_component_template/{name}` |
| `/component rm [pattern]` | Delete component templates from a selection after confirmation                                                | `DELETE /_component_template/{name}`      |

## policy (ISM)

| Command                     | Description                                                                                                                                       | Backing API                                  |
|-----------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------|
| `/policy ls [pattern]`      | List ISM policies                                                                                                                                 | `GET /_plugins/_ism/policies`                |
| `/policy show [name]`       | Print a policy, from a picker when the name does not settle it                                                                                    | `GET /_plugins/_ism/policies/{name}`         |
| `/policy apply [name]`      | Edit a policy (picked, or new, when the name does not settle it), confirm a line diff, then save. Resolves `seq_no` and `primary_term` internally | `GET` + `PUT /_plugins/_ism/policies/{name}` |
| `/policy rm <name>`         | Delete a policy after confirmation                                                                                                                | `DELETE /_plugins/_ism/policies/{name}`      |
| `/policy explain [pattern]` | Show ISM state per index: current state, age, next transition, failed actions                                                                     | `GET /_plugins/_ism/explain/{index}`         |

## cluster

| Command                   | Description                                                                                 | Backing API                                                   |
|---------------------------|---------------------------------------------------------------------------------------------|---------------------------------------------------------------|
| `/cluster info`           | Show the health, active blocks, and disk usage                                              | `_cluster/health`, `_cluster/state/blocks`, `_cat/allocation` |
| `/cluster settings`       | Show the persistent and transient cluster settings, with flat keys                          | `GET /_cluster/settings`                                      |
| `/cluster settings apply` | Edit the cluster settings in the editor, confirm a line diff, then save                     | `GET` + `PUT /_cluster/settings`                              |
| `/cluster nodes`          | List the nodes with roles, version, heap, CPU, and load. Marks the cluster manager with `*` | `_cat/nodes`                                                  |
| `/cluster explain`        | Explain why the first unassigned shard is unassigned, with the per node deciders            | `GET /_cluster/allocation/explain`                            |

## backup

| Command                | Description                                                                |
|------------------------|----------------------------------------------------------------------------|
| `/backup ls [pattern]` | List this profile's backups with type, name, and save time                 |
| `/backup show [name]`  | Print a backup, from a picker when the name does not settle it             |
| `/backup apply [name]` | Restore a backup: confirm a line diff against the live document, then save |
| `/backup rm [pattern]` | Delete backups from a selection after confirmation                         |

## Backups

Every change that overwrites existing documents is backed up, that includes: `/template apply`, 
`/component apply`, `/policy apply`, `/alias apply`, `/cluster settings apply` and
`/index settings apply`.

- Backups are stored per profile under 
  `~/.config/osctl/backups/<profile>/<type>/<name>-<timestamp>.json`.
- The last 20 versions per document are kept. Older ones are deleted on save.

## profile

| Command                   | Description                                                  |
|---------------------------|--------------------------------------------------------------|
| `/profile add`            | Run the connect wizard: add a profile and connect to it      |
| `/profile ls`             | List the profiles as a select; picking one switches to it    |
| `/profile default [name]` | Set the default profile, interactively when no name is given |
| `/profile rm [pattern]`   | Delete profiles from a selection                             |

## others

| Command                   | Description                                                  |
|---------------------------|--------------------------------------------------------------|
| `/copy`                   | Copy the last command output to the clipboard                |
| `/help`                   | Show the available commands                                  |
| `/version`                | Print the osctl version                                      |
| `/exit`                   | Quit osctl                                                   |
