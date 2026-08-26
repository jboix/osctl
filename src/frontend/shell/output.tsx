// Push helpers: notices, plain lines, and their copy payloads.

import { Text } from 'ink';
import { Notice, type NoticeTone, noticeText } from 'inkstand';
import type { FailureReport } from '../../engine/engine';
import type { PushFn } from './session-types';

/** Where the helpers push to: the session or the session deps. */
interface Pusher {
  /** Appends an output block. */
  push: PushFn;
}

/** The style of a pushed line. */
type LineTone = 'dim' | 'plain';

/**
 * Pushes a notice block whose copy text is the notice as plain text. The
 * marker and the color come from the tone.
 *
 * @param target - The session or the session deps.
 * @param tone - The message tone.
 * @param message - One sentence describing what happened.
 * @param details - A body under the message, such as a response.
 * @returns Nothing.
 */
export function pushNotice(
  target: Pusher,
  tone: NoticeTone,
  message: string,
  details?: string,
): void {
  target.push(<Notice details={details} message={message} tone={tone} />, {
    label: tone === 'error' ? 'the error report' : 'the message',
    text: noticeText({ details, message, tone }),
  });
}

/**
 * Pushes a single unmarked line whose copy text is the line itself.
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
  target.push(<Text dimColor={tone === 'dim'}>{text}</Text>, {
    label: 'the message',
    text,
  });
}

/**
 * Pushes a failure notice whose copy text is the failure report.
 *
 * @param target - The session or the session deps.
 * @param report - The failure report.
 * @returns Nothing.
 */
export function pushFailure(target: Pusher, report: FailureReport): void {
  pushNotice(target, 'error', report.message, report.details);
}
