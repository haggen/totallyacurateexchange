import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export function Alert({ children }: Props) {
  return (
    <div className="p-6 border rounded-sm border-zinc-700">{children}</div>
  );
}
