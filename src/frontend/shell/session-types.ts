// The session contracts: state, actions, and their dependencies.

import type { ReactNode } from 'react';
import type {
  AliasInfo,
  Connection,
  IndexInfo,
  Profile,
} from '../../engine/engine';
import type { DiffLine } from '../components/line-diff';
import type { LineEditor } from '../components/line-editor-machine';
import type { StatusBarProps } from '../components/status-bar';
import type { ProfileAnswers } from '../screens/profile-add-machine';
import type { EditKind } from './edit-content';

/** One block of scrollback output. */
export interface OutputItem {
  /** Stable identity for Ink's Static list. */
  id: number;
  /** The rendered block. */
  node: ReactNode;
}

/** What /copy puts on the clipboard. */
export interface CopyPayload {
  /** What the confirmation names, like `template "logs"` or `the index list`. */
  label: string;
  /** The plain text to copy. */
  text: string;
}

/**
 * Appends a block to the scrollback. The copy payload becomes what /copy
 * copies; omitting it clears the payload, `'keep'` leaves it unchanged.
 */
export type PushFn = (node: ReactNode, copy?: CopyPayload | 'keep') => void;

/** A failed add attempt the wizard resumes from. */
export interface AddProfileState {
  /** The answers of the failed attempt. */
  answers: ProfileAnswers;
  /** The failure message. */
  error: string;
}

/** The picker of the editor flow: choose a document or start a new one. */
export interface EditPickState {
  /** The picked resource kind. */
  kind: 'template' | 'policy';
  /** The existing document names. */
  names: string[];
  /** What picking a document does. Only `apply` offers the new entry. */
  action: 'apply' | 'show';
}

/** A parsed edit awaiting confirmation. */
export interface EditPreviewState {
  /** The edited resource kind. */
  kind: EditKind;
  /** The document name, absent for alias actions. */
  name?: string;
  /** The parsed payload to apply. */
  payload: unknown;
  /** The confirmation title. */
  title: string;
  /** The preview lines: a diff, a summary, or the plain body. */
  lines: DiffLine[];
}

/** A removal awaiting selection and confirmation. */
export type RemoveState =
  | { kind: 'index'; targets: IndexInfo[] }
  | { kind: 'alias'; targets: AliasInfo[] }
  | {
      kind: 'template' | 'policy';
      items: { label: string; value: string }[];
    }
  | { kind: 'profile'; items: { label: string; value: string }[] };

/** The actions the shell can trigger. */
export interface SessionActions {
  /** Opens the editor for the named document, or the picker without a name. */
  startEdit: (kind: 'template' | 'policy', name?: string) => void;
  /** Prints the named document, or opens the picker without a name. */
  startShow: (kind: 'template' | 'policy', name?: string) => void;
  /** Acts on the picked or newly named document. */
  pickEditTarget: (name: string, isNew: boolean) => void;
  /** Opens the editor over an alias actions skeleton. */
  startAliasEdit: () => void;
  /** Opens the editor over the body of a new index. */
  startIndexEdit: (name: string) => void;
  /** Closes the editor flow without applying. */
  cancelEdit: () => void;
  /** Applies the previewed edit. */
  confirmEdit: () => void;
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
  /** The picker the /edit/pick screen renders. */
  editPick?: EditPickState;
  /** Stores the picker state. */
  setEditPick: (state: EditPickState | undefined) => void;
  /** The edit the /edit/preview screen confirms. */
  editPreview?: EditPreviewState;
  /** Stores the edit awaiting confirmation. */
  setEditPreview: (state: EditPreviewState | undefined) => void;

  /** The scrollback generation. Bumping it repaints the scrollback. */
  generation: number;
  /** Clears the terminal and repaints everything at the current width. */
  redraw: () => void;

  /** The command input editor state. */
  editor: LineEditor;
  /** Replaces the command input editor state. */
  setEditor: (editor: LineEditor) => void;
}

/** The scrollback blocks and their copy payload. */
export interface Scrollback {
  /** The scrollback blocks, oldest first. */
  outputs: OutputItem[];
  /** Appends a block to the scrollback. */
  push: PushFn;
  /** Pushes a document block and makes it the copy payload. */
  showDoc: (title: string, text: string) => void;
  /** Whether any document block was pushed. */
  hasDocs: boolean;
  /** What /copy copies, set by the last output. */
  lastCopy?: CopyPayload;
}

/** The session the shell renders. */
export interface Session extends SessionState, SessionActions, Scrollback {
  /** Whether every document block renders expanded. */
  docsExpanded: boolean;
  /** Folds or expands every document block, repainting the scrollback. */
  toggleDocs: () => void;
}

/** The state, the scrollback, and the navigation the session flows drive. */
export interface SessionDeps extends SessionState {
  /** Appends an output block. */
  push: PushFn;
  /** Pushes a document block and makes it the copy payload. */
  showDoc: (title: string, text: string) => void;
  /** Moves the input area to another screen. */
  navigate: (to: string) => void;
  /** Switches the terminal raw mode, for handing the tty to an editor. */
  setRawMode: (raw: boolean) => void;
}
