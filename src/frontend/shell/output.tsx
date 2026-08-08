// Push helpers: styled lines and failure blocks with their copy payloads.

import { Text } from 'ink';
import type { FailureReport } from '../../engine/engine';
import { FailureBlock, failureText } from '../components/failure-block';
import type { PushFn } from './session-types';

/** Where the helpers push to: the session or the session deps. */
interface Pusher {
  /** Appends an output block. */
  push: PushFn;
}

/** The style of a pushed line. */
type LineTone = 'green' | 'yellow' | 'dim' | 'plain';

/**
 * Pushes a single styled line whose copy text is the line itself.
 *
 * @param target - The session or the session deps.
 * @param text - The line to push.
 * @param tone - The line style; plain when omitted.
 * @returns Nothing.
 */
export function pushLine(
  target: Pusher,
  text: string,
  tone: LineTone = 'plain',
): void {
  target.push(
    <Text
      color={tone === 'green' || tone === 'yellow' ? tone : undefined}
      dimColor={tone === 'dim'}
    >
      {text}
    </Text>,
    { label: 'the message', text },
  );
}

/**
 * Pushes a failure block whose copy text is the failure report.
 *
 * @param target - The session or the session deps.
 * @param report - The failure report.
 * @returns Nothing.
 */
export function pushFailure(target: Pusher, report: FailureReport): void {
  target.push(<FailureBlock {...report} />, {
    label: 'the error report',
    text: failureText(report),
  });
}
