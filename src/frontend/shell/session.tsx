// Session state for the REPL: startup, scrollback outputs, and the status line.

import { Text } from 'ink';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  type Connection,
  createConnection,
  describeFailure,
  type FailureReport,
  health,
  type Profile,
  ProfileStore,
} from '../../engine/engine';
import { FailureBlock } from '../components/failure-block';
import { LineEditor } from '../components/line-editor-machine';
import type { StatusBarProps } from '../components/status-bar';
import type { ProfileAnswers } from '../screens/profile-add-machine';

import type {
  AddProfileState,
  JsonApplyState,
  OutputItem,
  RemoveState,
  Session,
  SessionActions,
  SessionDeps,
  SessionState,
} from './session-types';

export type { OutputItem, Session };

import { createApplyActions } from './apply-actions';
import { createRemoveActions } from './remove-actions';

/**
 * Owns the session state and runs the startup connection flow.
 *
 * @param header - The block shown first in the scrollback.
 * @returns The session the shell renders.
 */
export function useSession(header: ReactNode): Session {
  const navigate = useNavigate();
  const { outputs, push } = useOutputs(header);
  const state = useSessionState();
  const deps: SessionDeps = { ...state, push, navigate };
  useStartup(deps);
  useStatusRefresh(state.connection, state.setStatus);
  return { outputs, push, ...state, ...createActions(deps) };
}

/**
 * Owns the session state values.
 *
 * @returns The values and their setters.
 */
function useSessionState(): SessionState {
  const [status, setStatus] = useState<StatusBarProps>({});
  const [connection, setConnection] = useState<Connection | undefined>();
  const [editor, setEditor] = useState(() => LineEditor.create());
  return {
    status,
    setStatus,
    connection,
    setConnection,
    editor,
    setEditor,
    ...useScreenState(),
  };
}

/** The screen related part of the session state. */
type ScreenState = Omit<
  SessionState,
  | 'status'
  | 'setStatus'
  | 'connection'
  | 'setConnection'
  | 'editor'
  | 'setEditor'
>;

/**
 * Owns the state of the input-area screens.
 *
 * @returns The values and their setters.
 */
function useScreenState(): ScreenState {
  const [pendingProfile, setPendingProfile] = useState<Profile | undefined>();
  const [addState, setAddProfileState] = useState<AddProfileState>();
  const [removeState, setRemoveState] = useState<RemoveState | undefined>();
  const [applyState, setApplyState] = useState<JsonApplyState | undefined>();
  return {
    pendingProfile,
    setPendingProfile,
    addState,
    setAddProfileState,
    removeState,
    setRemoveState,
    applyState,
    setApplyState,
  };
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
 * Refreshes the status bar every 30 seconds while connected, so a stale
 * health status or a lost cluster becomes visible.
 *
 * @param connection - The live connection, when there is one.
 * @param setStatus - Updates the status bar values.
 * @returns Nothing.
 */
function useStatusRefresh(
  connection: Connection | undefined,
  setStatus: (status: StatusBarProps) => void,
): void {
  useEffect(() => {
    if (connection === undefined) {
      return;
    }
    const timer = setInterval(() => {
      void refreshStatus(connection, setStatus);
    }, 30_000);
    return () => clearInterval(timer);
  }, [connection, setStatus]);
}

/**
 * Reads the health once and updates the status bar, silently.
 *
 * @param connection - The live connection.
 * @param setStatus - Updates the status bar values.
 * @returns Nothing.
 */
async function refreshStatus(
  connection: Connection,
  setStatus: (status: StatusBarProps) => void,
): Promise<void> {
  const base = {
    profileName: connection.profile.name,
    host: connection.profile.host,
  };
  try {
    const result = await health(connection);
    setStatus({
      ...base,
      clusterName: result.clusterName,
      status: result.status,
    });
  } catch {
    setStatus({ ...base, status: 'unreachable' });
  }
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
    ...createRemoveActions(deps),
    ...createApplyActions(deps),
  };
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
