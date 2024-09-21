import { useMutation, useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import type { User } from "~/src/lib/api";
import { request } from "~/src/lib/request";

type Props = {
  children: ReactNode;
};

export function Layout({ children }: Props) {
  const [, setLocation] = useLocation();

  const { mutate: signOut } = useMutation({
    mutationFn() {
      return request("/api/v1/sessions/1", { method: "delete" });
    },
    onSuccess() {
      setLocation("/sign-in");
    },
  });

  const {
    data: { body: user } = {},
  } = useQuery({
    queryKey: ["user"],
    queryFn({ signal }) {
      console.log("loading user");
      return request<User>("/api/v1/user", { signal });
    },
  });

  return (
    <div className="grid grid-rows-[4rem_1fr_4rem] h-dvh">
      <div className="border-b border-zinc-700">
        <nav className="container flex items-center justify-between h-full px-12 mx-auto">
          <h1 className="text-2xl font-bold text-zinc-100">
            <Link href="/">Totally Acurate Exchange</Link>
          </h1>

          {user ? (
            <ul className="flex items-center gap-6 font-bold">
              <li>
                <Link href="/profile">Arthur</Link>
              </li>
              <li>
                <button type="button" onClick={() => signOut()}>
                  Sign out
                </button>
              </li>
            </ul>
          ) : (
            <ul className="flex items-center gap-6 font-bold">
              <li>
                <Link href="/sign-in">Sign in</Link>
              </li>
              <li>
                <Link href="/join">Join the game</Link>
              </li>
            </ul>
          )}
        </nav>
      </div>

      {children}

      <div className="border-t border-zinc-700">
        <footer className="container flex items-center justify-center h-full gap-12 mx-auto">
          <p className="font-bold">&copy; 2024 Totally Acurate Exchange</p>

          <nav className="font-bold">
            <ul className="flex items-center gap-6">
              <li>
                <a href="https://github.com/haggen/totallyacurateexchange">
                  GitHub
                </a>
              </li>
              <li>
                <a href="/privacy">Privacy policy</a>
              </li>
              <li>
                <a href="https://github.com/haggen/totallyacurateexchange">
                  Help
                </a>
              </li>
            </ul>
          </nav>
        </footer>
      </div>
    </div>
  );
}
