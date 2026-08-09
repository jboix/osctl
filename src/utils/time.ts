// Time formatting shared by the engine and the frontend.

/**
 * Formats a time as a compact stamp usable in file names.
 *
 * @param date - The time to format.
 * @returns The stamp, `YYYYMMDD-HHMMSS` local time.
 */
export function compactStamp(date: Date): string {
  const day = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
  const time = `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  return `${day}-${time}`;
}

/**
 * Expands a compact stamp for display.
 *
 * @param stamp - A stamp in the `YYYYMMDD-HHMMSS` form.
 * @returns The stamp as `YYYY-MM-DD HH:MM:SS`, or the input when it does not
 * match the form.
 */
export function readableStamp(stamp: string): string {
  const match = /^(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})$/.exec(stamp);
  if (match === null) {
    return stamp;
  }
  const [, year, month, day, hour, minute, second] = match;
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

/**
 * Pads a number to two digits.
 *
 * @param value - The number to pad.
 * @returns The padded digits.
 */
function pad(value: number): string {
  return String(value).padStart(2, '0');
}
