// The shell frame: scrollback above, routed input area, status bar below.

import { Box } from 'ink';
import { Scrollback, useResizeRedraw } from 'inkstand';
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
 * @returns The root element of the frontend.
 */
export function Shell(): ReactElement {
  const session = useSession(<Header version={packageJson.version} />);
  useResizeRedraw(session.redraw);
  return (
    <DocFoldContext.Provider value={session.docsExpanded}>
      <Box flexDirection="column" paddingX={1}>
        <Scrollback generation={session.generation} items={session.outputs} />
        <Box flexDirection="column" marginTop={1}>
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
