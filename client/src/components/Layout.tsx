import type { ReactNode } from "react";
import { Link } from "wouter";

type Props = {
  children: ReactNode;
};

export function Layout({ children }: Props) {
  return (
    <div className="grid grid-rows-[4rem_1fr_4rem] h-dvh">
      <div className="border-b border-zinc-700">
        <nav className="container flex items-center justify-between h-full px-12 mx-auto">
          <h1 className="text-2xl font-bold text-zinc-100">
            <Link href="/">Totally Acurate Exchange</Link>
          </h1>

          <ul className="flex items-center gap-6 font-bold">
            <li>
              <Link href="/sign-in">Sign in</Link>
            </li>
            <li>
              <Link href="/sign-up">Join the game</Link>
            </li>
          </ul>
        </nav>
      </div>

      {children}

      <div className="border-t border-zinc-700">
        <footer className="container flex items-center justify-center h-full gap-12 mx-auto">
          <p className="font-bold">&copy; 2024 Totally Acurate Exchange</p>

          <nav className="font-bold">
            <ul className="flex items-center gap-6">
              <li>
                <a href="/">GitHub</a>
              </li>
              <li>
                <a href="/">Privacy policy</a>
              </li>
              <li>
                <a href="/">Help</a>
              </li>
            </ul>
          </nav>
        </footer>
      </div>
    </div>
  );
}
