// The shell frame: the transcript above, the routed input area and the status bar below, filling the screen.

import { Box, useWindowSize } from 'ink';
import { type MouseInput, Transcript, useTranscript } from 'inkstand';
import type { ReactElement } from 'react';
import packageJson from '../../../package.json';
import { DocFoldContext } from '../components/doc-block';
import { Header } from '../components/header';
import { StatusBar } from '../components/status-bar';
import { ScreenRoutes } from './screen-routes';
import { useSession } from './session';

/**
 * Renders the shell.
 *
 * @param props - The component props.
 * @param props.mouse - The mouse input, from `createMouseInput`.
 * @returns The root element of the frontend.
 */
export function Shell(props: { mouse: MouseInput }): ReactElement {
  const { rows, columns } = useWindowSize();
  const session = useSession(<Header version={packageJson.version} />);
  const transcript = useTranscript({ mouse: props.mouse });
  return (
    <DocFoldContext.Provider value={session.docsExpanded}>
      <Box flexDirection="column" height={rows} paddingX={1} width={columns}>
        <Transcript
          {...transcript}
          hint="ctrl+end returns to the end"
          items={session.outputs}
        />
        <Box flexDirection="column" flexShrink={0} marginTop={1}>
          <ScreenRoutes session={session} />
          <StatusBar
            {...session.status}
            hint={
              session.lastCopy === undefined
                ? undefined
                : '/copy copies the last output'
            }
          />
        </Box>
      </Box>
    </DocFoldContext.Provider>
  );
}
