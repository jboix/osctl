// Builds the release artifacts: one tar.gz per target, plus their checksums.

import { $ } from 'bun';

const entry = 'src/index.tsx';

const targets = [
  'bun-linux-x64',
  'bun-linux-arm64',
  'bun-darwin-x64',
  'bun-darwin-arm64',
] as const;

/**
 * Compiles one target and packs it as a tar.gz. The archive carries the
 * binary as `osctl`, mode 755, which a plain release asset cannot.
 *
 * @param target - The Bun compile target.
 * @returns The archive name, relative to `dist`.
 */
async function pack(target: (typeof targets)[number]): Promise<string> {
  const suffix = target.replace('bun-', '');
  const stage = `dist/${suffix}`;
  await $`mkdir -p ${stage}`;
  await $`bun build ${entry} --compile --target=${target} --outfile ${stage}/osctl`;
  await $`chmod 755 ${stage}/osctl`;
  const archive = `osctl-${suffix}.tar.gz`;
  await $`tar -czf dist/${archive} -C ${stage} osctl`;
  await $`rm -rf ${stage}`;
  return archive;
}

/**
 * Writes `dist/SHA256SUMS` in the format `sha256sum -c` reads.
 *
 * @param archives - The archive names, relative to `dist`.
 * @returns Nothing.
 */
async function writeChecksums(archives: string[]): Promise<void> {
  const lines: string[] = [];
  for (const archive of archives) {
    const bytes = await Bun.file(`dist/${archive}`).arrayBuffer();
    const sum = new Bun.CryptoHasher('sha256').update(bytes).digest('hex');
    lines.push(`${sum}  ${archive}`);
  }
  await Bun.write('dist/SHA256SUMS', `${lines.join('\n')}\n`);
}

const archives: string[] = [];
for (const target of targets) {
  archives.push(await pack(target));
}
await writeChecksums(archives);
