/** The `writing-style` rule: the prose follows the Writing section of CLAUDE.md. */
import { defineRule, vibator } from 'vibator';

/** The rule id, as ignore markers name it. */
const RULE_ID = 'writing-style';

/** U+2014, built from its code point so this file does not contain one. */
const EM_DASH = new RegExp(String.fromCodePoint(0x2014));

/** The files that carry prose: docs, code comments, and user-facing strings. */
const PROSE = [
  '**/*.{md,ts,tsx,mjs,cjs,js,yml,yaml,sh}',
  '!CHANGELOG.md',
  '!docs/CODE_OF_CONDUCT.md',
];

export default defineRule({
  id: RULE_ID,
  title: 'No em-dashes in documentation, comments, or user-facing strings',
  docs: './CLAUDE.md',
  check: () =>
    vibator.text
      .search(
        vibator.project.files
          .match(PROSE)
          .filter((file) => !vibator.ignore.file(file, RULE_ID)),
        EM_DASH,
      )
      .map((hit) => ({
        ...hit,
        message: 'The text uses an em-dash.',
        expected: 'Commas, colons, parentheses, or periods.',
        fix: 'Rewrite the sentence with a comma, a colon, parentheses, or two sentences.',
      })),
});
