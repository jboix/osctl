// The component template queries.

import type { Connection } from '../connection/connection';
import { statusOf } from '../connection/failure';

/** One component template row of /component ls. */
export interface ComponentInfo {
  /** The component template name. */
  name: string;
  /** The component template version. */
  version?: number;
}

/** One entry of the getComponentTemplate response. */
interface ComponentEntry {
  name: string;
  component_template: {
    version?: number;
  };
}

/**
 * Lists the component templates.
 *
 * @param connection - The live connection.
 * @returns The component templates sorted by name.
 */
export async function listComponents(
  connection: Connection,
): Promise<ComponentInfo[]> {
  const response = await connection.client.cluster.getComponentTemplate({});
  const body = response.body as { component_templates?: ComponentEntry[] };
  return (body.component_templates ?? [])
    .map((entry) => ({
      name: entry.name,
      version: entry.component_template.version,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Reads one component template. The cluster expands the name as a pattern,
 * so the response is filtered to the exact name.
 *
 * @param connection - The live connection.
 * @param name - The component template name.
 * @returns The definition, or undefined when the template is missing.
 */
export async function getComponent(
  connection: Connection,
  name: string,
): Promise<unknown> {
  try {
    const response = await connection.client.cluster.getComponentTemplate({
      name,
    });
    const body = response.body as {
      component_templates?: { name: string; component_template: unknown }[];
    };
    return body.component_templates?.find((entry) => entry.name === name)
      ?.component_template;
  } catch (error) {
    if (statusOf(error) === 404) {
      return undefined;
    }
    throw error;
  }
}
