/**
 * Get SQL for update values.
 */
export function getUpdateSet<T extends Record<string, unknown>>(data: T) {
  return Object.entries(data)
    .map(([key, value]) => (value !== undefined ? `${key} = $${key}` : ""))
    .filter(Boolean)
    .join(", ");
}
