// The /task command runners.

import { Table, type TableProps, tableText } from 'inkstand';
import {
  describeFailure,
  getTask,
  listTasks,
  type TaskInfo,
} from '../../engine/engine';
import type { CommandContext } from './command-types';
import { requireConnection } from './command-utils';
import { pushFailure, pushLine, pushNotice } from './output';

/**
 * Lists the running tasks as a table block, longest running first.
 *
 * @param context - What the command can act on.
 * @returns Nothing.
 */
export async function runTaskLs(context: CommandContext): Promise<void> {
  const connection = requireConnection(context);
  if (connection === undefined) {
    return;
  }
  try {
    const tasks = await listTasks(connection);
    if (tasks.length === 0) {
      pushLine(context.session, 'No running tasks.', 'dim');
      return;
    }
    const table = taskTable(tasks);
    context.session.push(<Table {...table} />, {
      label: 'the task list',
      text: tableText(table),
    });
  } catch (error) {
    pushFailure(context.session, describeFailure(error));
  }
}

/**
 * Builds the task listing table.
 *
 * @param tasks - The tasks to list.
 * @returns The table contract.
 */
function taskTable(tasks: TaskInfo[]): TableProps {
  return {
    columns: [
      { label: 'task' },
      { label: 'action' },
      { label: 'type' },
      { label: 'parent' },
      { label: 'running', alignRight: true },
      { label: 'node' },
    ],
    rows: tasks.map((task) => [
      task.id,
      task.action,
      task.type,
      task.parent ?? '',
      task.runningTime,
      task.node,
    ]),
  };
}

/**
 * Prints the named task as a document block.
 *
 * @param context - What the command can act on.
 * @param id - The task identifier.
 * @returns Nothing.
 */
export async function runTaskShow(
  context: CommandContext,
  id?: string,
): Promise<void> {
  const connection = requireConnection(context);
  if (connection === undefined) {
    return;
  }
  if (id === undefined) {
    pushNotice(context.session, 'warn', 'Usage: /task show <id>.');
    return;
  }
  try {
    const task = await getTask(connection, id);
    if (task === undefined) {
      pushNotice(context.session, 'warn', `No task "${id}".`);
      return;
    }
    context.session.showDoc(`task "${id}"`, JSON.stringify(task, null, 2));
  } catch (error) {
    pushFailure(context.session, describeFailure(error));
  }
}

/**
 * Opens the cancel screen for the running tasks, or the named one.
 *
 * @param context - What the command can act on.
 * @param id - The task identifier; all running tasks when omitted.
 * @returns Nothing.
 */
export async function runTaskCancel(
  context: CommandContext,
  id?: string,
): Promise<void> {
  const connection = requireConnection(context);
  if (connection === undefined) {
    return;
  }
  try {
    const tasks = (await listTasks(connection)).filter(
      (task) => id === undefined || task.id === id,
    );
    if (tasks.length === 0) {
      pushLine(
        context.session,
        id === undefined ? 'No running tasks.' : `No task "${id}".`,
        'dim',
      );
      return;
    }
    context.session.startRemove({
      kind: 'task',
      items: tasks.map((task) => ({
        label: `${task.id.padEnd(28)} ${task.action} (${task.runningTime})`,
        value: task.id,
      })),
    });
  } catch (error) {
    pushFailure(context.session, describeFailure(error));
  }
}
