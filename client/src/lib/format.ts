export function currency(
	value: number,
	options: Intl.NumberFormatOptions = {},
) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		currencySign: "standard",
		...options,
	}).format(value);
}
