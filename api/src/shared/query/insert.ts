/**
 * Get SQL for insert values.
 */
export function getInsertValues<T extends Record<string, unknown>>(data: T) {
  return `(${Object.keys(data).join(", ")}) VALUES (${Object.keys(data)
    .map((key) => `$${key}`)
    .join(", ")})`;
}
