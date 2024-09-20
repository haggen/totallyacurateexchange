import { useMutation } from "@tanstack/react-query";
import type { FormEvent } from "react";
import { useLocation } from "wouter";
import { Button } from "~/src/components/Button";
import { Field } from "~/src/components/Field";
import { Input } from "~/src/components/Input";
import type { Session } from "~/src/lib/api";
import { request } from "~/src/lib/request";

export default function Page() {
  const [, setLocation] = useLocation();

  const {
    mutate: signIn,
    error,
    isPending,
  } = useMutation({
    mutationFn: (data: FormData) => {
      return request<Session>("/api/v1/sessions", {
        body: data,
      });
    },
    onSuccess: () => {
      setLocation("/");
    },
  });

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    signIn(data);
  };

  return (
    <div className="flex flex-col items-center justify-center gap-12">
      <form
        onSubmit={handleSubmit}
        aria-busy={isPending}
        className="flex flex-col gap-9 w-80"
      >
        <legend className="sr-only">Sign in</legend>

        {error ? <pre>{JSON.stringify(error)}</pre> : null}

        <fieldset className="flex flex-col gap-6">
          <Field label="E-mail">
            {({ id }) => (
              <Input
                type="email"
                id={id}
                name="email"
                placeholder="warren@example.com"
                required
              />
            )}
          </Field>

          <Field label="Password">
            {({ id }) => (
              <Input
                type="password"
                id={id}
                name="password"
                placeholder="************"
                required
                minLength={12}
              />
            )}
          </Field>
        </fieldset>

        <footer>
          <Button type="submit" disabled={isPending}>
            Sign in
          </Button>
        </footer>
      </form>
    </div>
  );
}
