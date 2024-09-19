import type { ComponentProps } from "react";

export function Button({ className, ...props }: ComponentProps<"button">) {
	return (
		<button
			{...props}
			className={`bg-zinc-100 text-zinc-700 px-3 h-10 font-bold ${className}`}
		/>
	);
}
