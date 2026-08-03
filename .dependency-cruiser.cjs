/**
 * Architecture boundaries. Run with `bun run arch`.
 *
 * The layer rules are added together with the source layout. The rules below are
 * layout-independent.
 *
 * @type {import('dependency-cruiser').IConfiguration}
 */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'Circular dependencies make the graph hard to reason about.',
      from: {},
      to: { circular: true },
    },
    {
      name: 'no-test-deps-in-src',
      severity: 'error',
      comment: 'Production code must not import test files.',
      from: { pathNot: '\\.test\\.(ts|tsx)$' },
      to: { path: '\\.test\\.(ts|tsx)$' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsConfig: { fileName: 'tsconfig.json' },
    tsPreCompilationDeps: true,
    exclude: {
      path: 'node_modules|^dist/|^coverage/',
    },
  },
};
