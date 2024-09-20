import { useQuery } from "@tanstack/react-query";
import type { ComponentType, ReactNode } from "react";
import { request } from "~/src/lib/request";

type Props<T> = {
  Component: ComponentType<T>;
  exit: ReactNode;
  loading: ReactNode;
};

export function withSession<T extends object>({
  Component,
  exit,
  loading,
}: Props<T>) {
  return (props: T) => {
    const { isError, isPending } = useQuery({
      queryKey: ["portfolio"],
      queryFn: () => request("/api/v1/portfolio"),
    });
    if (isPending) {
      return loading;
    }
    if (!isError) {
      return exit;
    }
    return <Component {...props} />;
  };
}
