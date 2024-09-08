import type { Value } from "~/src/shared/database";

/**
 * Get SQL for update values.
 */
export function getUpdateSet<T extends Record<string, Value | undefined>>(
  data: T,
) {
  return Object.entries(data)
    .map(([key, value]) => (value === undefined ? "" : `${key} = $${key}`))
    .filter(Boolean)
    .join(", ");
}

/**
 * Get SQL for insert values.
 */
export function getInsertValues<T extends Record<string, Value | undefined>>(
  data: T,
) {
  const keys = Object.entries(data)
    .map(([key, value]) => (value === undefined ? "" : key))
    .filter(Boolean);

  return `(${keys.join(", ")}) VALUES (${keys
    .map((key) => `$${key}`)
    .join(", ")})`;
}
