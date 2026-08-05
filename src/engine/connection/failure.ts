// Translates client errors into displayable failure reports.

/** A displayable failure. */
export interface FailureReport {
  /** One sentence describing what happened. */
  message: string;
  /** The response body, pretty printed, when the cluster answered. */
  details?: string;
}

/**
 * Describes an error thrown by the OpenSearch client.
 *
 * @param error - The thrown value.
 * @returns The lead message, with the response body when the cluster answered.
 */
export function describeFailure(error: unknown): FailureReport {
  const meta = metaOf(error);
  if (meta?.statusCode !== undefined) {
    return {
      message: `The cluster responded with status ${meta.statusCode}.`,
      details:
        meta.body === undefined
          ? undefined
          : JSON.stringify(meta.body, null, 2),
    };
  }
  if (error instanceof Error) {
    return error.name === 'ConnectionError' || error.name === 'TimeoutError'
      ? { message: `The cluster could not be reached: ${error.message}.` }
      : { message: `The request failed: ${error.message}.` };
  }
  return { message: String(error) };
}

/**
 * Reads the response metadata of a client error.
 *
 * @param error - The thrown value.
 * @returns The status code and body, when the error carries them.
 */
function metaOf(
  error: unknown,
): { statusCode?: number; body?: unknown } | undefined {
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }
  return (error as { meta?: { statusCode?: number; body?: unknown } }).meta;
}
