// A block caret: solid on mount, blinking while idle. Remount it with a
// changing `key` to reset the blink on every edit.

import { Text } from 'ink';
import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';

/**
 * Renders the caret over the given character.
 *
 * @param props - The component props.
 * @param props.char - The character under the caret, a space when at the end.
 * @returns The caret element.
 */
export function Caret(props: { char?: string }): ReactElement {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const timer = setInterval(() => setVisible((current) => !current), 500);
    return () => clearInterval(timer);
  }, []);
  return <Text inverse={visible}>{props.char ?? ' '}</Text>;
}
