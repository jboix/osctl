// The /profile command runners of the registry.

import { ProfileStore } from '../../engine/engine';
import { matchesPattern } from '../../utils/pattern';
import type { CommandContext } from './command-types';
import { pushLine } from './output';

/**
 * Sets the default profile, interactively when no name is given.
 *
 * @param context - What the command can act on.
 * @param args - The command arguments; the first one is the profile name.
 * @returns Nothing.
 */
export function runProfileDefault(
  context: CommandContext,
  args: string[],
): void {
  const name = args[0];
  if (name === undefined) {
    context.navigate('/profile/default');
    return;
  }
  const profile = new ProfileStore().setDefault(name);
  if (profile === undefined) {
    pushLine(
      context.session,
      `No profile named "${name}". Run /profile ls.`,
      'yellow',
    );
    return;
  }
  pushLine(context.session, `Default profile set to "${name}".`);
}

/**
 * Opens the deletion screen for the profiles matching the pattern.
 *
 * @param context - What the command can act on.
 * @param pattern - A profile name or pattern; all profiles when omitted.
 * @returns Nothing.
 */
export function runProfileRm(context: CommandContext, pattern?: string): void {
  const profiles = new ProfileStore()
    .load()
    .profiles.filter((profile) => matchesPattern(profile.name, pattern));
  if (profiles.length === 0) {
    pushLine(context.session, 'No profiles match.', 'dim');
    return;
  }
  context.session.startRemove({
    kind: 'profile',
    items: profiles.map((profile) => ({
      label: `${profile.name.padEnd(16)} ${profile.host}`,
      value: profile.name,
    })),
  });
}
