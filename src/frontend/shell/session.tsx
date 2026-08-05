// Session state for the REPL: startup, scrollback outputs, and the status line.

import { Text } from 'ink';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  type Connection,
  createConnection,
  deleteIndices,
  describeFailure,
  type FailureReport,
  health,
  type IndexInfo,
  type Profile,
  ProfileStore,
} from '../../engine/engine';
import { FailureBlock } from '../components/failure-block';
import { LineEditor } from '../components/line-editor-machine';
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
interface AddProfileState {
  /** The answers of the failed attempt. */
  answers: ProfileAnswers;
  /** The failure message. */
  error: string;
}

/** The actions the shell can trigger. */
interface SessionActions {
  /** Opens the /index rm screen for the matched indices. */
  startIndexRm: (targets: IndexInfo[]) => void;
  /** Closes the /index rm screen without deleting. */
  cancelIndexRm: () => void;
  /** Deletes the confirmed indices. */
  executeIndexRm: (names: string[]) => void;
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

/** The session the shell renders. */
export interface Session extends SessionActions {
  /** The scrollback blocks, oldest first. */
  outputs: OutputItem[];
  /** The values the status bar displays. */
  status: StatusBarProps;
  /** Appends a block to the scrollback. */
  push: (node: ReactNode) => void;
  /** The profile awaiting a password on the /password screen. */
  pendingProfile?: Profile;
  /** The failed add attempt the /profile/add screen resumes from. */
  addState?: AddProfileState;
  /** The live connection, set after a successful connect. */
  connection?: Connection;
  /** The indices the /index/rm screen offers for deletion. */
  rmState?: IndexInfo[];
  /** The command input editor state. */
  editor: LineEditor;
  /** Replaces the command input editor state. */
  setEditor: (editor: LineEditor) => void;
}

/** The state setters and the navigation the session flows drive. */
interface SessionDeps {
  /** The profile awaiting a password, when there is one. */
  pendingProfile?: Profile;
  /** Appends an output block. */
  push: (node: ReactNode) => void;
  /** Updates the status bar values. */
  setStatus: (status: StatusBarProps) => void;
  /** Stores the profile awaiting a password. */
  setPendingProfile: (profile: Profile | undefined) => void;
  /** Stores the failed add attempt. */
  setAddProfileState: (state: AddProfileState | undefined) => void;
  /** Stores the live connection. */
  setConnection: (connection: Connection | undefined) => void;
  /** The live connection, when there is one. */
  connection?: Connection;
  /** Stores the indices offered for deletion. */
  setRmState: (targets: IndexInfo[] | undefined) => void;
  /** Moves the input area to another screen. */
  navigate: (to: string) => void;
}

/**
 * Owns the session state and runs the startup connection flow.
 *
 * @param header - The block shown first in the scrollback.
 * @returns The session the shell renders.
 */
export function useSession(header: ReactNode): Session {
  const navigate = useNavigate();
  const { outputs, push } = useOutputs(header);
  const [status, setStatus] = useState<StatusBarProps>({});
  const [pendingProfile, setPendingProfile] = useState<Profile | undefined>();
  const [addState, setAddProfileState] = useState<AddProfileState>();
  const [connection, setConnection] = useState<Connection | undefined>();
  const [rmState, setRmState] = useState<IndexInfo[] | undefined>();
  const deps: SessionDeps = {
    pendingProfile,
    connection,
    push,
    setStatus,
    setPendingProfile,
    setAddProfileState,
    setConnection,
    setRmState,
    navigate,
  };
  useStartup(deps);
  const [editor, setEditor] = useState(() => LineEditor.create());
  const view = { outputs, status, push, pendingProfile, addState, connection };
  return { ...view, rmState, editor, setEditor, ...createActions(deps) };
}

/**
 * Runs the startup connection flow exactly once. The navigation function
 * changes identity on every route change, so the effect re-fires and must
 * guard against reconnecting.
 *
 * @param deps - The session state setters and the navigation.
 * @returns Nothing.
 */
function useStartup(deps: SessionDeps): void {
  const started = useRef(false);
  useEffect(() => {
    if (!started.current) {
      started.current = true;
      void start(deps);
    }
  }, [deps]);
}

/**
 * Owns the scrollback blocks.
 *
 * @param header - The block shown first.
 * @returns The blocks and the push function.
 */
function useOutputs(header: ReactNode): {
  outputs: OutputItem[];
  push: (node: ReactNode) => void;
} {
  const [outputs, setOutputs] = useState<OutputItem[]>([
    { id: 0, node: header },
  ]);
  const push = useCallback((node: ReactNode) => {
    setOutputs((previous) => [...previous, { id: previous.length, node }]);
  }, []);
  return { outputs, push };
}

/**
 * Builds the actions the shell can trigger.
 *
 * @param deps - The session state setters and the navigation.
 * @returns The session actions.
 */
function createActions(deps: SessionDeps): SessionActions {
  return {
    startProfileAdd: (): void => {
      deps.setAddProfileState(undefined);
      deps.navigate('/profile/add');
    },
    cancelProfileAdd: (): void => {
      deps.setAddProfileState(undefined);
      deps.navigate('/');
    },
    submitProfileAdd: (answers: ProfileAnswers): void => {
      deps.navigate('/');
      void finishProfileAdd(answers, deps);
    },
    submitPassword: (password: string): void => {
      if (deps.pendingProfile !== undefined) {
        deps.navigate('/');
        void verifyPassword(deps.pendingProfile, password, deps);
      }
    },
    cancelPassword: (): void => {
      deps.setPendingProfile(undefined);
      deps.navigate('/');
    },
    switchProfile: (profile: Profile): void => {
      void connectTo(profile, deps);
    },
    ...createIndexActions(deps),
  };
}

/**
 * Builds the /index rm actions.
 *
 * @param deps - The session state setters and the navigation.
 * @returns The index actions.
 */
function createIndexActions(
  deps: SessionDeps,
): Pick<SessionActions, 'startIndexRm' | 'cancelIndexRm' | 'executeIndexRm'> {
  return {
    startIndexRm: (targets: IndexInfo[]): void => {
      deps.setRmState(targets);
      deps.navigate('/index/rm');
    },
    cancelIndexRm: (): void => {
      deps.setRmState(undefined);
      deps.navigate('/');
    },
    executeIndexRm: (names: string[]): void => {
      deps.setRmState(undefined);
      deps.navigate('/');
      void finishIndexRm(names, deps);
    },
  };
}

/**
 * Deletes the confirmed indices and reports the outcome.
 *
 * @param names - The index names to delete.
 * @param deps - The session state setters and the navigation.
 * @returns Nothing.
 */
async function finishIndexRm(
  names: string[],
  deps: SessionDeps,
): Promise<void> {
  if (deps.connection === undefined) {
    return;
  }
  try {
    await deleteIndices(deps.connection, names);
    deps.push(
      <Text color="green">
        ✔ Deleted {names.length} {names.length === 1 ? 'index' : 'indices'}:{' '}
        {names.join(', ')}.
      </Text>,
    );
  } catch (error) {
    deps.push(<FailureBlock {...describeFailure(error)} />);
  }
}

/**
 * Resolves the startup profile, then connects or asks for a password.
 *
 * @param deps - The session state setters and the navigation.
 * @returns Nothing.
 */
async function start(deps: SessionDeps): Promise<void> {
  const profile = new ProfileStore().defaultProfile();
  if (profile === undefined) {
    deps.push(
      <Text color="yellow">
        No profile found. Run /profile add to connect to a cluster.
      </Text>,
    );
    return;
  }
  await connectTo(profile, deps);
}

/**
 * Connects to a profile, asking for its password when it has a username.
 *
 * @param profile - The profile to connect to.
 * @param deps - The session state setters and the navigation.
 * @returns Nothing.
 */
async function connectTo(profile: Profile, deps: SessionDeps): Promise<void> {
  deps.setStatus({ profileName: profile.name, host: profile.host });
  if (profile.username !== undefined) {
    deps.setPendingProfile(profile);
    deps.navigate('/password');
    return;
  }
  const failure = await probe(profile, undefined, deps);
  if (failure !== undefined) {
    deps.push(<FailureBlock {...failure} />);
  }
}

/**
 * Connects with the submitted password and reports the outcome.
 *
 * @param profile - The profile awaiting the password.
 * @param password - The submitted password.
 * @param deps - The session state setters and the navigation.
 * @returns Nothing.
 */
async function verifyPassword(
  profile: Profile,
  password: string,
  deps: SessionDeps,
): Promise<void> {
  const failure = await probe(profile, password, deps);
  if (failure !== undefined) {
    deps.push(<FailureBlock {...failure} />);
    deps.navigate('/password');
  }
}

/**
 * Tests the wizard answers and saves the profile on success.
 *
 * @param answers - The wizard answers.
 * @param deps - The session state setters and the navigation.
 * @returns Nothing.
 */
async function finishProfileAdd(
  answers: ProfileAnswers,
  deps: SessionDeps,
): Promise<void> {
  const profile: Profile = {
    name: answers.name,
    host: answers.host,
    username: answers.username,
    tlsVerify: answers.tlsVerify,
  };
  const failure = await probe(profile, answers.password, deps);
  if (failure !== undefined) {
    deps.setAddProfileState({ answers, error: failure.message });
    deps.navigate('/profile/add');
    return;
  }
  const store = new ProfileStore();
  store.upsert(profile);
  store.setDefault(profile.name);
  deps.push(<Text>Profile "{profile.name}" saved as default.</Text>);
}

/**
 * Runs the health query and updates the status bar on success.
 *
 * @param profile - The profile to connect to.
 * @param password - The session password, omitted for clusters without auth.
 * @param deps - The session state setters and the navigation.
 * @returns Undefined on success, the failure report otherwise.
 */
async function probe(
  profile: Profile,
  password: string | undefined,
  deps: SessionDeps,
): Promise<FailureReport | undefined> {
  try {
    const connection = createConnection(profile, password);
    const result = await health(connection);
    deps.setConnection(connection);
    deps.setStatus({
      profileName: profile.name,
      host: profile.host,
      clusterName: result.clusterName,
      status: result.status,
    });
    deps.push(
      <Text color="green">
        ✔ Connected to {result.clusterName} ({result.status}).
      </Text>,
    );
    return undefined;
  } catch (error) {
    return describeFailure(error);
  }
}
