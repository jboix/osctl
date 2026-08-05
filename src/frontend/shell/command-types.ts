// The command contracts.

import type { Session } from './session';

/** What a command can act on. */
export interface CommandContext {
  /** The running session. */
  session: Session;
  /** Ends the application. */
  exit: () => void;
  /** Moves the input area to another screen. */
  navigate: (to: string) => void;
}

/** One osctl command. */
export interface Command {
  /** The official name, with the leading slash. */
  name: string;
  /** One line shown by /help and the suggestions. */
  description: string;
  /** Runs the command. */
  run: (context: CommandContext, args: string[]) => void;
}
