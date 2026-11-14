/** The `tsdoc-coverage` rule: every function carries TSDoc with complete `@param` and `@returns`. */
import { defineRule, vibator } from 'vibator';
import { SOURCES } from './lib/sources.ts';
import { tsdocViolations } from './lib/tsdoc.ts';

/** The rule id, as ignore markers name it. */
const RULE_ID = 'tsdoc-coverage';

export default defineRule({
  id: RULE_ID,
  title: 'Every function carries a TSDoc block, with @param and @returns',
  docs: './CLAUDE.md',
  check: () =>
    vibator.project.files
      .match(SOURCES)
      .filter((file) => !vibator.ignore.file(file, RULE_ID))
      .flatMap((file) =>
        tsdocViolations(file)
          .filter(({ line }) => !vibator.ignore.line(file, line, RULE_ID))
          .map(({ line, symbol, problem }) => ({
            file: file.path,
            line,
            message: `${symbol}: ${problem}`,
            expected:
              'A TSDoc block on every function, private ones included, with @param and @returns.',
            fix: 'Write the TSDoc block. A `//` comment above a function does not count.',
          })),
      ),
});
