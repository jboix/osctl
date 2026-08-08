// The input-area screens: one route per path.

import { Text } from 'ink';
import type { ReactElement } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router';
import { ProfileStore } from '../../engine/engine';
import { PasswordPrompt } from '../components/password-prompt';
import { AliasRmScreen } from '../screens/alias-rm';
import { DocPick } from '../screens/doc-pick';
import { EditPreview } from '../screens/edit-preview';
import { IndexRmScreen } from '../screens/index-rm';
import { ProfileAddWizard } from '../screens/profile-add';
import { ProfileSelect } from '../screens/profile-select';
import { RemoveScreen } from '../screens/remove';
import { CommandInput } from './command-input';
import { pushLine } from './output';
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
  {
    path: '/edit/pick',
    render: (session) => <EditPickRoute session={session} />,
  },
  {
    path: '/edit/preview',
    render: (session) => <EditPreviewRoute session={session} />,
  },
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
        pushLine(props.session, `Default profile set to "${profile.name}".`);
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

const NOUNS = {
  template: 'templates',
  policy: 'policies',
  profile: 'profiles',
} as const;

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
  kind: 'template' | 'policy' | 'profile';
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
      title={`Delete ${NOUNS[props.kind]}`}
    />
  );
}

/**
 * Renders the /edit/pick screen, or returns home without a picker.
 *
 * @param props - The component props.
 * @param props.session - The running session.
 * @returns The document picker element.
 */
function EditPickRoute(props: { session: Session }): ReactElement {
  const state = props.session.editPick;
  if (state === undefined) {
    return <Navigate to="/" />;
  }
  return (
    <DocPick
      allowNew={state.action === 'apply'}
      names={state.names}
      noun={state.kind}
      onCancel={props.session.cancelEdit}
      onPick={props.session.pickEditTarget}
      title={state.kind === 'template' ? 'Templates' : 'Policies'}
    />
  );
}

/**
 * Renders the /edit/preview screen, or returns home without an edit.
 *
 * @param props - The component props.
 * @param props.session - The running session.
 * @returns The edit preview element.
 */
function EditPreviewRoute(props: { session: Session }): ReactElement {
  const state = props.session.editPreview;
  if (state === undefined) {
    return <Navigate to="/" />;
  }
  return (
    <EditPreview
      lines={state.lines}
      onCancel={props.session.cancelEdit}
      onConfirm={props.session.confirmEdit}
      title={state.title}
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
