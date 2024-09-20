import type { ComponentProps } from "react";

export function Button({ className, ...props }: ComponentProps<"button">) {
  return (
    <button
      {...props}
      className={`bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-900 rounded-sm px-6 h-10 font-bold ${className}`}
    />
  );
}
