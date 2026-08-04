// osctl entry point.

import { render } from 'ink';
import { MemoryRouter } from 'react-router';
import { Shell } from './frontend/shell/shell';

// Clear the visible screen and home the cursor so the app starts on a clean
// viewport. Not `3J`: the terminal scrollback stays intact.
process.stdout.write('\u001B[2J\u001B[H');

// The line editor owns ctrl+c: it clears the line, and quits on an empty one.
render(
  <MemoryRouter>
    <Shell />
  </MemoryRouter>,
  { exitOnCtrlC: false },
);
