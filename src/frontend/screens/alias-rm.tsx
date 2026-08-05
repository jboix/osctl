// The /alias rm flavor of the removal screen: the affected indices.

import { Text } from 'ink';
import type { ReactElement, ReactNode } from 'react';
import type { AliasInfo } from '../../engine/engine';
import { RemoveScreen } from './remove';

/** The screen contract. */
export interface AliasRmScreenProps {
  /** The aliases the pattern matched. */
  targets: AliasInfo[];
  /** Called with the confirmed alias names. */
  onConfirm: (names: string[]) => void;
  /** Called when the user cancels. */
  onCancel: () => void;
}

/**
 * Renders the alias removal flow.
 *
 * @param props - The component props.
 * @returns The screen element.
 */
export function AliasRmScreen(props: AliasRmScreenProps): ReactElement {
  return (
    <RemoveScreen
      confirmation={(chosen) => summary(props.targets, chosen)}
      items={props.targets.map((alias) => ({
        label: `${alias.name.padEnd(20)} ${alias.targets.length} ${
          alias.targets.length === 1 ? 'index' : 'indices'
        }`,
        value: alias.name,
      }))}
      onCancel={props.onCancel}
      onConfirm={props.onConfirm}
      title="Remove aliases"
    />
  );
}

/**
 * Builds the confirmation summary: the union of the affected indices.
 *
 * @param targets - The aliases the pattern matched.
 * @param chosen - The selected alias names.
 * @returns The summary element.
 */
function summary(targets: AliasInfo[], chosen: string[]): ReactNode {
  const affected = new Set(
    targets
      .filter((alias) => chosen.includes(alias.name))
      .flatMap((alias) => alias.targets.map((target) => target.index)),
  );
  return (
    <Text>
      Remove {chosen.join(', ')} from {affected.size}{' '}
      {affected.size === 1 ? 'index' : 'indices'}:{' '}
      {[...affected].sort().join(', ')}
    </Text>
  );
}
