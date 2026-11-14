// Markdown formatting and link checks: `bun run docs:check`, `bun run docs:format`.
import remarkGfm from 'remark-gfm';
import remarkValidateLinks from 'remark-validate-links';

/** The output style. The `markdown-formatted` rule formats with the same settings. */
export const settings = /** @type {const} */ ({
  bullet: '-',
  emphasis: '_',
  strong: '*',
  fence: '`',
  rule: '-',
  listItemIndent: 'one',
});

export default {
  settings,
  plugins: [remarkGfm, [remarkValidateLinks, { repository: 'jboix/osctl' }]],
};
