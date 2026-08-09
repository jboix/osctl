// Name matching shared by the engine and the frontend.

/**
 * Matches a name against a pattern where `*` matches anything.
 *
 * @param name - The name to test.
 * @param pattern - The pattern; everything matches when omitted.
 * @returns Whether the name matches.
 */
export function matchesPattern(name: string, pattern?: string): boolean {
  if (pattern === undefined) {
    return true;
  }
  const escaped = pattern
    .split('*')
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*');
  return new RegExp(`^${escaped}$`).test(name);
}
