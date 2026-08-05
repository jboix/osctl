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
import { TemplateRmScreen } from '../screens/template-rm';
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
  {
    path: '/index/rm',
    render: (session) => <IndexRmRoute session={session} />,
  },
  {
    path: '/alias/rm',
    render: (session) => <AliasRmRoute session={session} />,
  },
  {
    path: '/alias/apply',
    render: (session) => <AliasApplyRoute session={session} />,
  },
  {
    path: '/template/apply',
    render: (session) => <TemplateApplyRoute session={session} />,
  },
  {
    path: '/template/rm',
    render: (session) => <TemplateRmRoute session={session} />,
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
 * Renders the /index/rm screen, or returns home without targets.
 *
 * @param props - The component props.
 * @param props.session - The running session.
 * @returns The deletion screen element.
 */
function IndexRmRoute(props: { session: Session }): ReactElement {
  const targets = props.session.rmState;
  if (targets === undefined) {
    return <Navigate to="/" />;
  }
  return (
    <IndexRmScreen
      onCancel={props.session.cancelIndexRm}
      onConfirm={props.session.executeIndexRm}
      targets={targets}
    />
  );
}

/**
 * Renders the /alias/rm screen, or returns home without a pending removal.
 *
 * @param props - The component props.
 * @param props.session - The running session.
 * @returns The confirmation element.
 */
function AliasRmRoute(props: { session: Session }): ReactElement {
  const targets = props.session.aliasRmState;
  if (targets === undefined) {
    return <Navigate to="/" />;
  }
  return (
    <AliasRmScreen
      onCancel={props.session.cancelAliasRm}
      onConfirm={props.session.executeAliasRm}
      targets={targets}
    />
  );
}

/**
 * Renders the /alias/apply screen.
 *
 * @param props - The component props.
 * @param props.session - The running session.
 * @returns The apply screen element.
 */
function AliasApplyRoute(props: { session: Session }): ReactElement {
  return (
    <JsonApplyScreen
      docsUrl="https://docs.opensearch.org/docs/latest/im-plugin/index-alias/"
      onCancel={props.session.cancelAliasApply}
      onConfirm={props.session.executeAliasApply}
      title="Apply alias actions"
    />
  );
}

/**
 * Renders the /template/apply screen, or returns home without a name.
 *
 * @param props - The component props.
 * @param props.session - The running session.
 * @returns The apply screen element.
 */
function TemplateApplyRoute(props: { session: Session }): ReactElement {
  const name = props.session.templateApplyState;
  if (name === undefined) {
    return <Navigate to="/" />;
  }
  return (
    <JsonApplyScreen
      docsUrl="https://docs.opensearch.org/docs/latest/im-plugin/index-templates/"
      onCancel={props.session.cancelTemplateApply}
      onConfirm={props.session.executeTemplateApply}
      title={`Template "${name}"`}
    />
  );
}

/**
 * Renders the /template/rm screen, or returns home without targets.
 *
 * @param props - The component props.
 * @param props.session - The running session.
 * @returns The deletion screen element.
 */
function TemplateRmRoute(props: { session: Session }): ReactElement {
  const targets = props.session.templateRmState;
  if (targets === undefined) {
    return <Navigate to="/" />;
  }
  return (
    <TemplateRmScreen
      onCancel={props.session.cancelTemplateRm}
      onConfirm={props.session.executeTemplateRm}
      targets={targets}
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
