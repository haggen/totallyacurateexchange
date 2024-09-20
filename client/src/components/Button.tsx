import type { ComponentProps } from "react";

export function Button({
  type = "button",
  className,
  ...props
}: ComponentProps<"button">) {
  return (
    <button
      type={type}
      className={`bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-900 rounded-sm px-6 h-10 font-bold ${className}`}
      {...props}
    />
  );
}
