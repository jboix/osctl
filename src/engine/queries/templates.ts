// The index template queries.

import type { Connection } from '../connection/connection';

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
 * Reads one index template.
 *
 * @param connection - The live connection.
 * @param name - The template name.
 * @returns The template definition. Throws when the template is missing.
 */
export async function getTemplate(
  connection: Connection,
  name: string,
): Promise<unknown> {
  const response = await connection.client.indices.getIndexTemplate({ name });
  const body = response.body as {
    index_templates?: { index_template: unknown }[];
  };
  return body.index_templates?.[0]?.index_template;
}
