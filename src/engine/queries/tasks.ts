// The task queries.

import type { Connection } from '../connection/connection';
import { statusOf } from '../connection/failure';

/** One task row of /task ls. */
export interface TaskInfo {
  /** The task identifier, `<node-id>:<number>`. */
  id: string;
  /** The action the task runs. */
  action: string;
  /** The task type, for example `transport`. */
  type: string;
  /** The parent task identifier, when the task has one. */
  parent?: string;
  /** The running time, human readable. */
  runningTime: string;
  /** The running time in nanoseconds, used for sorting. */
  runningNanos: number;
  /** The name of the node running the task. */
  node: string;
}

/** One row of the cat tasks response. */
interface CatTaskRow {
  action: string;
  task_id: string;
  parent_task_id: string;
  type: string;
  running_time: string;
  running_time_ns: string;
  node: string;
}

/**
 * Lists the running tasks.
 *
 * @param connection - The live connection.
 * @returns The tasks, longest running first.
 */
export async function listTasks(connection: Connection): Promise<TaskInfo[]> {
  const response = await connection.client.cat.tasks({
    format: 'json',
    h: [
      'action',
      'task_id',
      'parent_task_id',
      'type',
      'running_time',
      'running_time_ns',
      'node',
    ],
  });
  return (response.body as CatTaskRow[])
    .map((row) => ({
      id: row.task_id,
      action: row.action,
      type: row.type,
      parent: row.parent_task_id === '-' ? undefined : row.parent_task_id,
      runningTime: row.running_time,
      runningNanos: Number(row.running_time_ns),
      node: row.node,
    }))
    .sort((a, b) => b.runningNanos - a.runningNanos);
}

/**
 * Reads one task: its status, and whether it completed.
 *
 * @param connection - The live connection.
 * @param id - The task identifier.
 * @returns The task document, or undefined when the task does not exist.
 */
export async function getTask(
  connection: Connection,
  id: string,
): Promise<unknown> {
  try {
    const response = await connection.client.tasks.get({ task_id: id });
    return response.body;
  } catch (error) {
    if (statusOf(error) === 404) {
      return undefined;
    }
    throw error;
  }
}
