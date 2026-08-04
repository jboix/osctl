// Creates the OpenSearch client handle for a profile.

import { Client } from '@opensearch-project/opensearch';
import type { Profile } from '../config/profile';

/** A live connection to an OpenSearch cluster. */
export interface Connection {
  /** The underlying OpenSearch client. */
  client: Client;
  /** The profile this connection was created from. */
  profile: Profile;
}

/**
 * Creates a connection for the given profile.
 *
 * @param profile - The cluster profile.
 * @param password - The session password for profiles with a username.
 * @returns The connection handle used by queries and commands.
 */
export function createConnection(
  profile: Profile,
  password?: string,
): Connection {
  const auth =
    profile.username !== undefined && password !== undefined
      ? { username: profile.username, password }
      : undefined;
  const client = new Client({
    node: profile.host,
    auth,
    ssl: { rejectUnauthorized: profile.tlsVerify },
  });
  return { client, profile };
}
