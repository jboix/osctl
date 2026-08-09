// Value formatting shared by the engine and the frontend.

/** The size units, in 1024 steps. */
const UNITS = ['b', 'kb', 'mb', 'gb', 'tb', 'pb'];

/**
 * Formats a byte count with the largest fitting unit.
 *
 * @param bytes - The byte count.
 * @returns The formatted size, for example `1.5 gb`.
 */
export function formatBytes(bytes: number): string {
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const rounded = unit === 0 ? String(value) : value.toFixed(1);
  return `${rounded} ${UNITS[unit]}`;
}
