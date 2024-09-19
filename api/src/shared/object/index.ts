/**
 * Returns a copy of object without the specified keys.
 */
export function omit<T extends object, K extends (keyof T)[]>(
	object: T,
	...keys: K
) {
	return Object.keys(object).reduce(
		(result, key) =>
			keys.includes(key as keyof T)
				? result
				: Object.assign(result, { [key]: object[key as keyof T] }),
		{} as Omit<T, K[number]>,
	);
}

/**
 * Returns a copy of object with only the specified keys.
 */
export function pick<T extends object, K extends (keyof T)[]>(
	object: T,
	...keys: K
) {
	return keys.reduce(
		(result, key) => Object.assign(result, { [key]: object[key] }),
		{} as Pick<T, K[number]>,
	);
}
