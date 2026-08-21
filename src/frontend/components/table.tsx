// The table view from the toolkit, plus the plain text lines for /copy.

import type { TableProps } from 'inkstand';

export { Table, type TableProps } from 'inkstand';

/**
 * Formats the table as plain lines: the header first, then the rows.
 *
 * @param props - The table contract.
 * @returns The formatted lines.
 */
export function tableLines(props: TableProps): string[] {
  const widths = props.columns.map((column, index) =>
    Math.max(
      column.label.length,
      ...props.rows.map((row) => (row[index] ?? '').length),
    ),
  );
  const header = props.columns.map((column) => column.label);
  return [header, ...props.rows].map((row) =>
    formatRow(row, widths, props.columns),
  );
}

/**
 * Pads the cells to their column width and joins them.
 *
 * @param cells - The row cells.
 * @param widths - The column widths.
 * @param columns - The columns, for the alignment.
 * @returns The formatted line.
 */
function formatRow(
  cells: string[],
  widths: number[],
  columns: TableProps['columns'],
): string {
  return cells
    .map((cell, index) =>
      columns[index]?.alignRight === true
        ? cell.padStart(widths[index] ?? 0)
        : cell.padEnd(widths[index] ?? 0),
    )
    .join('  ')
    .trimEnd();
}
