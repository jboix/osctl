# CLAUDE.md

This file guides Claude Code (claude.ai/code) when working in this repository.

osctl is an interactive terminal application for OpenSearch operations, built with Ink and
TypeScript on Bun. The command reference in `docs/design/commands.md` documents how osctl
behaves today: update it in the same change as the code. Documentation reflects current
behavior, never future or planned behavior.

## Commands

```sh
bun install          # install dependencies and the git hooks (husky)
bun run dev          # run the app from source
bun run verify       # the whole gate: lint, arch, knip, typecheck, test, build
bun run lint         # Biome check
bun run format       # Biome format --write
bun run arch         # dependency-cruiser layer boundaries
bun run knip         # dead code, unused exports and dependencies
bun run typecheck    # tsc --noEmit
bun test             # unit tests (bun:test)
bun run build        # compile the native binary to dist/osctl
bun run build:all    # all release artifacts (scripts/build.ts)
```

Run a single test file with `bun test src/<file>.test.ts`.

## Integration environment

```sh
bun run env:up         # OpenSearch on :9200 (no auth) + Dashboards on :5601
bun run env:up:secure  # the same, plus a secured node on :9201 (https, basic auth)
bun run env:stop       # stop, keeping all data
bun run env:down       # stop and reset all data
```

The cluster starts empty. Create test state through osctl itself.

## Runtime rule: src/ is Node-compatible

The npm package ships a Node bundle, so `src/` must not import `bun` or `bun:*` modules. A Biome
rule enforces this. Use `node:` APIs in `src/` (`node:fs`, `node:child_process`, ...). Bun APIs
are allowed in `scripts/` and in test files.

Bun is the toolchain everywhere: `bun <file>`, `bun install`, `bun test`, `bunx`. Do not use
npm, ts-node, jest, or vitest.

TypeScript stays pinned to `^6`: dependency-cruiser cannot parse TypeScript 7 and silently
cruises 0 modules, so the arch gate would pass while checking nothing. Dependabot ignores the
major.

## Design invariants

- osctl is interactive only. There is no non-interactive command mode.
- Commands follow the noun-verb form (`/index ls`, `/alias apply`).
- Configuration is saved profiles only (`~/.config/osctl/config.json`). Passwords are never
  written to disk.
- Destructive commands preview their effect and confirm. There is no flag to skip confirmation.
- JSON documents (templates, policies, alias actions, index bodies) are edited in `$EDITOR` as
  JSONC files and confirmed with a diff or a summary before anything is sent. An unchanged,
  empty, or unparseable file aborts.
- `/index rollover` reapplies aliases missing on the new head, because manual `_rollover` does not
  copy secondary aliases.

## Style

- Biome owns formatting and lint: single quotes, 2-space indent.
- Conventional Commits, enforced by commitlint. The commit type sets the release bump
  (semantic-release).

## Writing

Documentation, comments, commit messages, and user-facing strings use direct language.

- Write plain declarative sentences. State the fact, then at most one sentence of why.
- No em-dashes. Use commas, colons, parentheses, periods.
- No rambling, aphorisms, or clever turns. No "X is what makes Y"; write the fact or "Y
  because X".
- No idioms or unusual verbs. Name things for what they are. No cute jargon.
- One fact per bullet. Paragraphs of one to three short sentences.
- Reference docs carry no essays. A one-line table entry is the documentation; add a section only
  when asked.
- TSDoc every function, private ones included, with complete `@param` and `@returns`. Module
  headers are one line; no explanatory paragraphs.
