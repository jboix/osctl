// Builds the release artifacts: one compiled binary per target and the Node bundle for npm.
import { $ } from 'bun';

const entry = 'src/index.tsx';

const targets = [
  'bun-linux-x64',
  'bun-linux-arm64',
  'bun-darwin-x64',
  'bun-darwin-arm64',
] as const;

for (const target of targets) {
  const suffix = target.replace('bun-', '');
  await $`bun build ${entry} --compile --target=${target} --outfile dist/osctl-${suffix}`;
}

await $`bun build ${entry} --target=node --banner '#!/usr/bin/env node' --outfile dist/index.js`;
