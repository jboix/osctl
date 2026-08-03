# Contributing to osctl

Thanks for contributing. Participation is governed by the
[Code of Conduct](./CODE_OF_CONDUCT.md).

## Setup

```sh
bun install
bun run verify    # the whole gate: lint, typecheck, test, build
```

`verify` runs the whole gate:

| Step                | Tool                  | Checks                                      |
|---------------------|-----------------------|---------------------------------------------|
| `bun run lint`      | Biome (`biome.json`)  | Formatting, lint rules, complexity limits   |
| `bun run arch`      | dependency-cruiser    | Layer boundaries, cycles                    |
| `bun run knip`      | knip                  | Dead code, unused exports and dependencies  |
| `bun run typecheck` | tsc (`--noEmit`)      | Type errors                                 |
| `bun run test`      | bun test              | Unit tests                                  |
| `bun run build`     | `bun build --compile` | The binary compiles                         |

Requirements: Bun 1.2 or later. Bun runs the TypeScript source directly, so there is no build
step while developing. `bun run format` applies Biome's formatting.

## Git hooks

`bun install` installs the hooks (husky):

- **pre-commit**: Biome on the staged files.
- **commit-msg**: commitlint. The commit type sets the release bump.
- **pre-push**: the full `bun run verify`.

## Commits

Conventional Commits, enforced locally and in CI. semantic-release cuts releases from the commit
history and attaches the compiled binaries to the GitHub release, so the type you choose is the
version bump you cause:

- `fix:` patch, `feat:` minor, `feat!:` or `BREAKING CHANGE:` major.
- `docs:`, `chore:`, `test:`, `refactor:` produce no release.

Write the subject line for the changelog reader, not the diff reader.

## Changing behavior

Read the design docs in [docs/design/](./design/) before changing behavior. Those four files are
the contract. Here is a summary of the design choices:

- The REPL is the only mode.
- Commands follow the noun-verb form.
- The npm package runs on Node, so `src/` uses no Bun-only APIs. Bun APIs are allowed in
  `scripts/` and in tests.
- Configuration is saved profiles only. Passwords are never written to disk.
- Destructive commands preview their effect and confirm.
- `index rollover` reapplies aliases missing on the new head.

Update the design doc in the same change as the code, if it is needed.

## Integration environment

A local OpenSearch cluster for testing osctl against, defined in `compose.yaml`.

```sh
bun run env:up         # OpenSearch on :9200 (no auth) and Dashboards on :5601
bun run env:up:secure  # the same, plus a secured node on :9201 (https, basic auth)
bun run env:stop       # stop, keeping all data
bun run env:down       # stop and delete all data
```

- The secured node is for testing the auth and TLS flows: user `admin`, password from
  `OSCTL_DEV_ADMIN_PASSWORD`, default in `compose.yaml`.

## Style

- Biome owns formatting and lint.
- Documentation and user-visible strings use plain, direct language. The rules are in the
  Writing section of [CLAUDE.md](../CLAUDE.md).

If `bun run verify` passes, the style is right. Do not argue with a check in a pull request; open
an issue instead.

## Pull requests

Keep them scoped to one change. CI runs the same `verify` chain plus commit linting. A pull
request merges with a green run and a review from the maintainer.
