// osctl entry point.

import { render } from 'ink';
import { createMouseInput } from 'inkstand';
import { MemoryRouter } from 'react-router';
import { Shell } from './frontend/shell/shell';

// The mouse reports go to the shell; Ink reads the key input only.
const mouse = createMouseInput(process.stdin);

// The app owns the alternate screen; the terminal content returns on exit.
// The line editor owns ctrl+c: it clears the line, and quits on an empty one.
render(
  <MemoryRouter>
    <Shell mouse={mouse} />
  </MemoryRouter>,
  { alternateScreen: true, exitOnCtrlC: false, stdin: mouse.stdin },
);
