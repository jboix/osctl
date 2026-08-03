# osctl

An interactive terminal client for OpenSearch operations.

osctl manages indices, aliases, index templates, and ISM policies from one REPL. It gives you
autocomplete on live cluster resources, previews before every destructive action, and
visualizations for the state that OpenSearch only exposes as raw JSON.

## Features

- Interactive REPL: type `/` for a fuzzy-filtered command palette, Tab for autocomplete.
- Autocomplete uses live resource names from the connected cluster: indices, aliases, templates,
  policies.
- `index ls` shows health, doc count, size, and attached aliases per index.
- `index rm` opens a multi-select list with sizes, then confirms with totals. It warns before
  deleting a write index.
- `index rollover` diffs aliases between the old and new head, then reapplies missing ones.
- `alias ls` renders the alias tree: which alias points to which index, write index marked,
  filters shown.
- `alias check` finds head indices missing their expected aliases and offers to fix them.
- `template edit` and `policy edit` open the live document in `$EDITOR` and show a diff before
  applying.
- `policy apply` resolves `seq_no` and `primary_term` internally.
- `policy explain` shows the ISM state per index: current state, age, next transition, failures.
- JSON input by file, paste, or a file dropped on the terminal, validated as you type.
- Cluster profiles with the active profile and cluster health always visible in the status bar.
- Passwords are never written to disk. osctl prompts once per session.

## Install

### With npm

Requires Node 20 or later.

```bash
npm install -g osctl
# or run it without installing
npx osctl
```

### As a binary

osctl ships as a single binary for Linux and macOS (x64 and arm64), no runtime required. The
install script keeps versions side by side and points a `current` symlink at the active one.

```bash
mkdir -p ~/.osctl && cd ~/.osctl
wget https://raw.githubusercontent.com/jboix/osctl/main/install-osctl.sh
chmod +x install-osctl.sh
./install-osctl.sh            # latest release; use -v <version> to pin one
export PATH="$HOME/.osctl/current:$PATH"
```

To update, run the script again. To roll back, run it with `-v` and the previous version.

## Quick start

```
$ osctl
Welcome to osctl. No profile found, let's connect to a cluster.
  Profile name     > prod
  Host             > https://opensearch.example.com:9200
  Authentication   > Basic
  Username         > admin
  Password         > ********
  Testing connection... connected: opensearch 2.11.1, health green

[prod] green > index ls core_events*
  core_events-000003   green   12.4M docs   2.1 GB   user_events, core_user_events
  core_events-000004   green    3.1M docs   0.6 GB   core_events (write)

[prod] green > /
  > index rollover    Roll over a write alias and carry its aliases
    index rm          Delete indices from a multi-select list
    alias check       Find heads missing expected aliases
    ...
```

## Documentation

| Document                                           | Content                                   |
|----------------------------------------------------|-------------------------------------------|
| [docs/design/design.md](docs/design/design.md)     | Goals, stack, configuration, safety rules |
| [docs/design/commands.md](docs/design/commands.md) | Command reference                         |
| [docs/design/repl.md](docs/design/repl.md)         | REPL interaction specification            |

## Contributing

See the [contributing guide](docs/CONTRIBUTING.md). Participation is governed by the
[Code of Conduct](docs/CODE_OF_CONDUCT.md).

## Status

osctl is under development and not yet released. The documents above are the specification.

## License

MIT, see [LICENSE](LICENSE).
