// The index template queries.

import type { Connection } from '../connection/connection';
import { statusOf } from '../connection/failure';

/** One template row of /template ls. */
export interface TemplateInfo {
  /** The template name. */
  name: string;
  /** The index patterns the template applies to. */
  patterns: string[];
  /** The template priority. */
  priority?: number;
  /** The template version. */
  version?: number;
}

/**
 * Lists the index templates.
 *
 * @param connection - The live connection.
 * @returns The templates sorted by name.
 */
export async function listTemplates(
  connection: Connection,
): Promise<TemplateInfo[]> {
  const response = await connection.client.indices.getIndexTemplate({});
  const body = response.body as { index_templates?: TemplateEntry[] };
  return (body.index_templates ?? [])
    .map((entry) => ({
      name: entry.name,
      patterns: entry.index_template.index_patterns,
      priority: entry.index_template.priority,
      version: entry.index_template.version,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** One entry of the getIndexTemplate response. */
interface TemplateEntry {
  name: string;
  index_template: {
    index_patterns: string[];
    priority?: number;
    version?: number;
  };
}

/**
 * Reads one index template. The cluster expands the name as a pattern, so the
 * response is filtered to the exact name.
 *
 * @param connection - The live connection.
 * @param name - The template name.
 * @returns The template definition, or undefined when the template is missing.
 */
export async function getTemplate(
  connection: Connection,
  name: string,
): Promise<unknown> {
  try {
    const response = await connection.client.indices.getIndexTemplate({ name });
    const body = response.body as {
      index_templates?: { name: string; index_template: unknown }[];
    };
    return body.index_templates?.find((entry) => entry.name === name)
      ?.index_template;
  } catch (error) {
    if (statusOf(error) === 404) {
      return undefined;
    }
    throw error;
  }
}
