import { useMutation } from "@tanstack/react-query";
import type { FormEvent } from "react";
import { useLocation } from "wouter";
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
				className="flex flex-col gap-6 mx-auto w-80"
			>
				<legend className="sr-only">Sign up</legend>

				{error ? <div>{String(error)}</div> : null}

				<Field label="Name">
					{({ id }) => (
						<Input
							type="text"
							id={id}
							name="name"
							placeholder="Richie McRich"
						/>
					)}
				</Field>

				<Field label="E-mail">
					{({ id }) => (
						<Input
							type="email"
							id={id}
							name="email"
							placeholder="richie@example.com"
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
							autoComplete="new-password"
						/>
					)}
				</Field>

				<footer>
					<Button type="submit" disabled={isPending}>
						Sign up
					</Button>
				</footer>
			</form>
		</div>
	);
}
