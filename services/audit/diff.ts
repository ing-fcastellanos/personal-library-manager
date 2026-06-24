/**
 * Pure field-diff for the change log (#15, design D7). Returns the names of the
 * fields in `input` whose value differs from `existing`. Undefined input fields
 * (not part of a partial update) are ignored; values are compared structurally so
 * arrays/objects diff by content. Unit-tested in the emulator-free lane.
 */
export function changedFields(
  existing: Record<string, unknown>,
  input: Record<string, unknown>,
): string[] {
  const changed: string[] = [];
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) continue;
    const before = JSON.stringify(existing[key] ?? null);
    const after = JSON.stringify(value ?? null);
    if (before !== after) changed.push(key);
  }
  return changed;
}
