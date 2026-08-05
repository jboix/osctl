// Session state for the REPL: startup, scrollback outputs, and the status line.

import { Text } from 'ink';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  type AliasInfo,
  type Connection,
  createConnection,
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
import { createAliasActions } from './alias-actions';
import type {
  AddProfileState,
  OutputItem,
  Session,
  SessionActions,
  SessionDeps,
  SessionState,
} from './session-types';

export type { OutputItem, Session };

import { createIndexActions } from './index-actions';

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
  return { outputs, push, ...state, ...createActions(deps) };
}

/**
 * Owns the session state values.
 *
 * @returns The values and their setters.
 */
function useSessionState(): SessionState {
  const [status, setStatus] = useState<StatusBarProps>({});
  const [pendingProfile, setPendingProfile] = useState<Profile | undefined>();
  const [addState, setAddProfileState] = useState<AddProfileState>();
  const [connection, setConnection] = useState<Connection | undefined>();
  const [rmState, setRmState] = useState<IndexInfo[] | undefined>();
  const [aliasRmState, setAliasRmState] = useState<AliasInfo[] | undefined>();
  const [editor, setEditor] = useState(() => LineEditor.create());
  return {
    status,
    setStatus,
    pendingProfile,
    setPendingProfile,
    addState,
    setAddProfileState,
    connection,
    setConnection,
    rmState,
    setRmState,
    aliasRmState,
    setAliasRmState,
    editor,
    setEditor,
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
    ...createAliasActions(deps),
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
