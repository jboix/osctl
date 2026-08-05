// The session contracts: state, actions, and their dependencies.

import type { ReactNode } from 'react';
import type {
  AliasInfo,
  Connection,
  IndexInfo,
  Profile,
} from '../../engine/engine';
import type { LineEditor } from '../components/line-editor-machine';
import type { StatusBarProps } from '../components/status-bar';
import type { ProfileAnswers } from '../screens/profile-add-machine';

/** One block of scrollback output. */
export interface OutputItem {
  /** Stable identity for Ink's Static list. */
  id: number;
  /** The rendered block. */
  node: ReactNode;
}

/** A failed add attempt the wizard resumes from. */
export interface AddProfileState {
  /** The answers of the failed attempt. */
  answers: ProfileAnswers;
  /** The failure message. */
  error: string;
}

/** What the JSON apply screen writes to. */
export type JsonApplyState =
  | { kind: 'alias' }
  | { kind: 'index'; name: string }
  | { kind: 'template'; name: string }
  | { kind: 'policy'; name: string };

/** A removal awaiting selection and confirmation. */
export type RemoveState =
  | { kind: 'index'; targets: IndexInfo[] }
  | { kind: 'alias'; targets: AliasInfo[] }
  | {
      kind: 'template' | 'policy';
      items: { label: string; value: string }[];
    };

/** The actions the shell can trigger. */
export interface SessionActions {
  /** Opens the JSON apply screen for the given target. */
  startApply: (state: JsonApplyState) => void;
  /** Closes the JSON apply screen without applying. */
  cancelApply: () => void;
  /** Applies the confirmed payload to the stored target. */
  executeApply: (payload: unknown) => void;
  /** Opens the removal screen for the matched resources. */
  startRemove: (state: RemoveState) => void;
  /** Closes the removal screen without deleting. */
  cancelRemove: () => void;
  /** Deletes the confirmed names. */
  executeRemove: (names: string[]) => void;
  /** Opens the /profile add wizard. */
  startProfileAdd: () => void;
  /** Closes the wizard without saving. */
  cancelProfileAdd: () => void;
  /** Tests the wizard answers and saves the profile on success. */
  submitProfileAdd: (answers: ProfileAnswers) => void;
  /** Submits the password for the pending profile. */
  submitPassword: (password: string) => void;
  /** Closes the password prompt without connecting. */
  cancelPassword: () => void;
  /** Connects to the given profile, asking for its password when needed. */
  switchProfile: (profile: Profile) => void;
}

/** The session state values and their setters. */
export interface SessionState {
  /** The values the status bar displays. */
  status: StatusBarProps;
  /** Updates the status bar values. */
  setStatus: (status: StatusBarProps) => void;
  /** The profile awaiting a password on the /password screen. */
  pendingProfile?: Profile;
  /** Stores the profile awaiting a password. */
  setPendingProfile: (profile: Profile | undefined) => void;
  /** The failed add attempt the /profile/add screen resumes from. */
  addState?: AddProfileState;
  /** Stores the failed add attempt. */
  setAddProfileState: (state: AddProfileState | undefined) => void;
  /** The live connection, set after a successful connect. */
  connection?: Connection;
  /** Stores the live connection. */
  setConnection: (connection: Connection | undefined) => void;
  /** The removal the /remove screen runs. */
  removeState?: RemoveState;
  /** Stores the removal awaiting selection and confirmation. */
  setRemoveState: (state: RemoveState | undefined) => void;
  /** The target the /apply screen writes to. */
  applyState?: JsonApplyState;
  /** Stores the apply target. */
  setApplyState: (state: JsonApplyState | undefined) => void;

  /** The command input editor state. */
  editor: LineEditor;
  /** Replaces the command input editor state. */
  setEditor: (editor: LineEditor) => void;
}

/** The session the shell renders. */
export interface Session extends SessionState, SessionActions {
  /** The scrollback blocks, oldest first. */
  outputs: OutputItem[];
  /** Appends a block to the scrollback. */
  push: (node: ReactNode) => void;
}

/** The state, the scrollback, and the navigation the session flows drive. */
export interface SessionDeps extends SessionState {
  /** Appends an output block. */
  push: (node: ReactNode) => void;
  /** Moves the input area to another screen. */
  navigate: (to: string) => void;
}
