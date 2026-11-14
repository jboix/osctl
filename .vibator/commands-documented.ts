/** The `commands-documented` rule: every registered command has a row in docs/design/commands.md. */
import { defineRule, vibator } from 'vibator';

/** The command reference, relative to the project root. */
const REFERENCE = 'docs/design/commands.md';

/** A command name in the registry, such as `name: '/index ls'`. */
const REGISTERED = /\bname: '(\/[a-z]+(?: [a-z]+)*)'/;

/** A command row in the reference, such as ``| `/index ls [pattern]` |``. */
const DOCUMENTED = /^\| `(\/[a-z]+(?: [a-z]+)*)/gm;

export default defineRule({
  id: 'commands-documented',
  title: 'Every registered command has a row in docs/design/commands.md',
  docs: './docs/design/commands.md',
  check: () => {
    const reference = vibator.project.files.match(REFERENCE).find(() => true);
    const documented = new Set(
      [...(reference?.content ?? '').matchAll(DOCUMENTED)].map(
        (match) => match[1],
      ),
    );
    return vibator.text
      .search(
        vibator.project.files.match('src/frontend/shell/**/*.tsx'),
        REGISTERED,
      )
      .filter((hit) => !documented.has(hit.groups[0] ?? ''))
      .map((hit) => ({
        ...hit,
        message: `The command "${hit.groups[0]}" has no row in ${REFERENCE}.`,
        expected: 'The command reference documents every command osctl has.',
        fix: `Add a row for ${hit.groups[0]} to its family table in ${REFERENCE}.`,
      }));
  },
});
