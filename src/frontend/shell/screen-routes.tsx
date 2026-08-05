// The input-area screens: one route per path.

import { Text } from 'ink';
import type { ReactElement } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router';
import { ProfileStore } from '../../engine/engine';
import { PasswordPrompt } from '../components/password-prompt';
import { AliasRmScreen } from '../screens/alias-rm';
import { IndexRmScreen } from '../screens/index-rm';
import { JsonApplyScreen } from '../screens/json-apply';
import { ProfileAddWizard } from '../screens/profile-add';
import { ProfileSelect } from '../screens/profile-select';
import { RemoveScreen } from '../screens/remove';
import { applyPresentation } from './apply-actions';
import { CommandInput } from './command-input';
import type { Session } from './session';

/** The input-area screens, one route per path. */
const SCREENS: {
  path: string;
  render: (session: Session) => ReactElement;
}[] = [
  { path: '/', render: (session) => <CommandInput session={session} /> },
  {
    path: '/profile/add',
    render: (session) => <ProfileAddRoute session={session} />,
  },
  {
    path: '/profile/ls',
    render: (session) => <ProfileLsRoute session={session} />,
  },
  {
    path: '/profile/default',
    render: (session) => <ProfileDefaultRoute session={session} />,
  },
  {
    path: '/password',
    render: (session) => <PasswordRoute session={session} />,
  },
  { path: '/apply', render: (session) => <ApplyRoute session={session} /> },
  {
    path: '/remove',
    render: (session) => <RemoveRoute session={session} />,
  },
];

/**
 * Renders one route per screen.
 *
 * @param props - The component props.
 * @param props.session - The running session.
 * @returns The routes element.
 */
export function ScreenRoutes(props: { session: Session }): ReactElement {
  return (
    <Routes>
      {SCREENS.map((screen) => (
        <Route
          element={screen.render(props.session)}
          key={screen.path}
          path={screen.path}
        />
      ))}
    </Routes>
  );
}

/**
 * Renders the /profile/add screen.
 *
 * @param props - The component props.
 * @param props.session - The running session.
 * @returns The wizard element.
 */
function ProfileAddRoute(props: { session: Session }): ReactElement {
  return (
    <ProfileAddWizard
      error={props.session.addState?.error}
      initialAnswers={props.session.addState?.answers}
      onCancel={props.session.cancelProfileAdd}
      onSubmit={props.session.submitProfileAdd}
    />
  );
}

/**
 * Renders the /profile/ls screen: pick a profile to switch to.
 *
 * @param props - The component props.
 * @param props.session - The running session.
 * @returns The picker element.
 */
function ProfileLsRoute(props: { session: Session }): ReactElement {
  const navigate = useNavigate();
  return (
    <ProfileSelect
      currentName={props.session.status.profileName}
      onCancel={() => navigate('/')}
      onPick={(profile) => {
        navigate('/');
        props.session.switchProfile(profile);
      }}
      profiles={new ProfileStore().load().profiles}
      title="Profiles"
    />
  );
}

/**
 * Renders the /profile/default screen: pick the profile to make default.
 *
 * @param props - The component props.
 * @param props.session - The running session.
 * @returns The picker element.
 */
function ProfileDefaultRoute(props: { session: Session }): ReactElement {
  const navigate = useNavigate();
  const config = new ProfileStore().load();
  return (
    <ProfileSelect
      currentName={config.defaultProfile}
      onCancel={() => navigate('/')}
      onPick={(profile) => {
        new ProfileStore().setDefault(profile.name);
        props.session.push(
          <Text>Default profile set to "{profile.name}".</Text>,
        );
        navigate('/');
      }}
      profiles={config.profiles}
      title="Set the default profile"
    />
  );
}

/**
 * Renders the /remove screen, or returns home without a removal.
 *
 * @param props - The component props.
 * @param props.session - The running session.
 * @returns The removal screen element.
 */
function RemoveRoute(props: { session: Session }): ReactElement {
  const state = props.session.removeState;
  const shared = {
    onCancel: props.session.cancelRemove,
    onConfirm: props.session.executeRemove,
  };
  if (state === undefined) {
    return <Navigate to="/" />;
  }
  if (state.kind === 'index') {
    return <IndexRmScreen {...shared} targets={state.targets} />;
  }
  if (state.kind === 'alias') {
    return <AliasRmScreen {...shared} targets={state.targets} />;
  }
  return (
    <NamedRemove
      items={state.items}
      kind={state.kind}
      session={props.session}
    />
  );
}

/**
 * Renders the removal of name based resources: templates and policies.
 *
 * @param props - The component props.
 * @param props.kind - What is being removed.
 * @param props.items - The selectable rows.
 * @param props.session - The running session.
 * @returns The removal screen element.
 */
function NamedRemove(props: {
  kind: 'template' | 'policy';
  items: { label: string; value: string }[];
  session: Session;
}): ReactElement {
  return (
    <RemoveScreen
      confirmation={(chosen) => (
        <Text>
          Delete {chosen.length} {props.kind}
          {chosen.length === 1 ? '' : 's'}: {chosen.join(', ')}
        </Text>
      )}
      items={props.items}
      onCancel={props.session.cancelRemove}
      onConfirm={props.session.executeRemove}
      title={`Delete ${props.kind === 'template' ? 'templates' : 'policies'}`}
    />
  );
}

/**
 * Renders the /apply screen, or returns home without a target.
 *
 * @param props - The component props.
 * @param props.session - The running session.
 * @returns The apply screen element.
 */
function ApplyRoute(props: { session: Session }): ReactElement {
  const state = props.session.applyState;
  if (state === undefined) {
    return <Navigate to="/" />;
  }
  const presentation = applyPresentation(state);
  return (
    <JsonApplyScreen
      allowEmpty={presentation.allowEmpty}
      docsUrl={presentation.docsUrl}
      onCancel={props.session.cancelApply}
      onConfirm={props.session.executeApply}
      title={presentation.title}
    />
  );
}

/**
 * Renders the /password screen, or returns home when nothing is pending.
 *
 * @param props - The component props.
 * @param props.session - The running session.
 * @returns The password prompt element.
 */
function PasswordRoute(props: { session: Session }): ReactElement {
  const profile = props.session.pendingProfile;
  if (profile === undefined) {
    return <Navigate to="/" />;
  }
  return (
    <PasswordPrompt
      host={profile.host}
      onCancel={props.session.cancelPassword}
      onSubmit={props.session.submitPassword}
      username={profile.username ?? ''}
    />
  );
}
