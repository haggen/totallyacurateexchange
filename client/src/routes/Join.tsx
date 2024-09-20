import { useMutation } from "@tanstack/react-query";
import type { FormEvent } from "react";
import { useLocation } from "wouter";
import { Alert } from "~/src/components/Alert";
import { Button } from "~/src/components/Button";
import { Field } from "~/src/components/Field";
import { Input } from "~/src/components/Input";
import { request } from "~/src/lib/request";

export default function Page() {
  const [, setLocation] = useLocation();

  const {
    mutate: signUp,
    data,
    error,
    isPending,
  } = useMutation({
    mutationFn: (data: FormData) => {
      return request("/api/v1/users", {
        body: data,
      });
    },
    onSuccess: () => {
      setLocation("/sign-in");
    },
  });

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    signUp(data);
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <form
        onSubmit={handleSubmit}
        aria-busy={isPending}
        className="flex flex-col mx-auto gap-9 w-80"
      >
        <legend className="sr-only">Sign up</legend>

        <Alert error={error} />

        <fieldset className="flex flex-col gap-6">
          <Field label="Name">
            {({ id }) => (
              <Input
                type="text"
                id={id}
                name="name"
                placeholder="e.g. Warren Buffett"
                autoComplete="name"
                required
              />
            )}
          </Field>

          <Field label="E-mail">
            {({ id }) => (
              <Input
                type="email"
                id={id}
                name="email"
                placeholder="e.g. warren@example.com"
                autoComplete="email"
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
                placeholder="e.g. ************"
                autoComplete="new-password"
                required
                minLength={12}
              />
            )}
          </Field>
        </fieldset>

        <footer>
          <Button type="submit" disabled={isPending}>
            Sign up
          </Button>
        </footer>
      </form>
    </div>
  );
}
