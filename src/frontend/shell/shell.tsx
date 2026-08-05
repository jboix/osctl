// The REPL frame: scrollback above, routed input area, status bar below.

import { Box, Static, useStdout } from 'ink';
import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import packageJson from '../../../package.json';
import { Header } from '../components/header';
import { StatusBar } from '../components/status-bar';
import { ScreenRoutes } from './screen-routes';
import { type OutputItem, useSession } from './session';

/**
 * Renders the REPL shell.
 *
 * @returns The root element of the frontend.
 */
export function Shell(): ReactElement {
  const session = useSession(<Header version={packageJson.version} />);
  const generation = useResizeRedraw();
  return (
    <Box flexDirection="column" paddingX={1}>
      <Static items={session.outputs} key={generation}>
        {(item: OutputItem) => (
          <Box key={item.id} paddingX={1}>
            {item.node}
          </Box>
        )}
      </Static>
      <Box flexDirection="column" marginTop={1}>
        <ScreenRoutes session={session} />
        <StatusBar {...session.status} />
      </Box>
    </Box>
  );
}

/**
 * Redraws everything when the terminal is resized: the stale frame rewraps
 * and breaks the layout, so the viewport is cleared and the scrollback is
 * re-rendered at the new width.
 *
 * @returns The scrollback generation, bumped on every resize.
 */
function useResizeRedraw(): number {
  const { stdout, write } = useStdout();
  const [generation, setGeneration] = useState(0);
  useEffect(() => {
    const redraw = (): void => {
      write('\u001B[2J\u001B[H');
      setGeneration((current) => current + 1);
    };
    stdout.on('resize', redraw);
    return () => {
      stdout.off('resize', redraw);
    };
  }, [stdout, write]);
  return generation;
}
