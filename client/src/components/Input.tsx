import type { ComponentProps } from "react";

export function Input({ className, ...props }: ComponentProps<"input">) {
	return (
		<input
			{...props}
			className={`border border-zinc-400 bg-zinc-900 p-2 h-10 ${className}`}
		/>
	);
}
