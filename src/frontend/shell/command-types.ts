// The command contracts.

import type { Command as ToolkitCommand } from 'inkstand';
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
export type Command = ToolkitCommand<CommandContext>;
