// A failed request: the lead message and the raw response under it.

import { Notice, noticeText } from 'inkstand';
import type { ReactElement } from 'react';

/**
 * Renders the failure message with the pretty printed response below it.
 *
 * @param props - The component props.
 * @param props.message - One sentence describing what happened.
 * @param props.details - The response body, pretty printed.
 * @returns The failure element.
 */
export function FailureBlock(props: {
  message: string;
  details?: string;
}): ReactElement {
  return (
    <Notice details={props.details} message={props.message} tone="error" />
  );
}

/**
 * Formats a failure as the plain text the block renders.
 *
 * @param props - The failure message and the optional response body.
 * @param props.message - One sentence describing what happened.
 * @param props.details - The response body, pretty printed.
 * @returns The failure text.
 */
export function failureText(props: {
  message: string;
  details?: string;
}): string {
  return noticeText({ ...props, tone: 'error' });
}
