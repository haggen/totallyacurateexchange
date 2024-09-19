import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { FormEvent } from "react";
import { Button } from "~/src/components/Button";
import { Field } from "~/src/components/Field";
import { Header } from "~/src/components/Header";
import { Input } from "~/src/components/Input";
import type { Holding, Order, Portfolio } from "~/src/lib/api";
import { currency } from "~/src/lib/format";
import { request } from "~/src/lib/request";

function PostForm({ portfolioId }: { portfolioId: number }) {
	const queryClient = useQueryClient();

	const {
		mutate: post,
		error,
		isPending,
	} = useMutation({
		mutationFn: (data: FormData) => {
			return request<Order>("/api/v1/orders", {
				body: data,
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["orders"] });
		},
	});

	const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const data = new FormData(e.currentTarget);
		post(data);
	};

	return (
			<form
				onSubmit={handleSubmit}
				aria-busy={isPending}
				className="flex flex-col gap-6"
			>
				{error ? <pre>{JSON.stringify(error)}</pre> : null}

				<Field label="Portfolio">
					{({ id }) => (
						<Input
							type="text"
							value={portfolioId}
							id={id}
							name="portfolioId"
							readOnly
						/>
					)}
				</Field>

				<Field label="Stock">
					{({ id }) => <Input type="text" id={id} name="stockId" />}
				</Field>

				<Field label="Type">
					{({ id }) => (
						<select id={id} name="type">
							<option value="bid">Bid</option>
							<option value="ask">Ask</option>
						</select>
					)}
				</Field>

				<Field label="Price">
					{({ id }) => <Input type="number" id={id} name="price" />}
				</Field>

				<Field label="Volume">
					{({ id }) => <Input type="number" id={id} name="volume" />}
				</Field>

				<footer>
					<Button type="submit" disabled={isPending}>
						Post order
					</Button>
				</footer>
			</form>
	);
}

export default function Page() {
	const {
		data: { body: portfolio } = {},
	} = useQuery({
		queryKey: ["portfolio"],
		queryFn: () => {
			return request<Portfolio>("/api/v1/portfolio");
		},
	});

	const {
		data: { body: holdings } = {},
	} = useQuery({
		queryKey: ["holdings"],
		queryFn: () => {
			return request<Holding[]>("/api/v1/holdings");
		},
	});

	const {
		data: { body: orders } = {},
	} = useQuery({
		queryKey: ["orders"],
		queryFn: () => {
			return request<Order[]>("/api/v1/orders");
		},
	});

	return (
		<div className="container grid grid-cols-2 gap-12 py-6 mx-auto">
			<div className="flex flex-col gap-12">
				<section className="flex flex-col gap-3">
					<Header title="Portfolio" />

					<table className="w-full border-collapse">
						<tbody>
							<tr>
								<th className="p-2 text-left">
									Balance
								</th>
								<td className="p-2 border-l border-zinc-700">
									{portfolio ? currency(portfolio.balance) : "Loading..."}
								</td>
							</tr>
							<tr className="border-t border-zinc-700">
								<th className="p-2 text-left">
									Assets
								</th>
								<td className="p-2 border-l border-zinc-700">
									{portfolio
										? currency(portfolio.total - portfolio.balance)
										: "Loading..."}
								</td>
							</tr>
							<tr className="border-t border-zinc-700">
								<th className="p-2 text-left">
									Total
								</th>
								<td className="p-2 border-l border-zinc-700">
									{portfolio ? currency(portfolio.total) : "Loading..."}
								</td>
							</tr>
						</tbody>
					</table>
				</section>

				<section className="flex flex-col gap-3">
					<Header title="Holdings" />
					
					<table className="w-full border-collapse">
						<tbody>
							{holdings?.map((holding) => (
								<tr key={holding.id} className="border-t first:border-t-0 border-zinc-700">
									<th className="p-2">
										{holding.stock.name}
									</th>
									<td className="p-2 border-l border-zinc-700">
										{holding.stock.ask}—{holding.stock.bid}
									</td>
									<td className="p-2 border-l border-zinc-700">
										{holding.volume}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</section>
			</div>

			<div className="flex flex-col gap-12">
				<section className="flex flex-col gap-3">
					<Header title="Market" />

					<table className="w-full border-collapse">
						<tbody>
							{orders?.map((order) => (
								<tr key={order.id} className="border-t first:border-t-0 border-zinc-700">
									<td className="p-2">
										{order.createdAt}
									</td>
									<td className="p-2 border-l border-zinc-700">{order.status}</td>
									<td className="p-2 border-l border-zinc-700">
										{order.stockId}
									</td>
									<td className="p-2 border-l border-zinc-700">{order.type}</td>
									<td className="p-2 border-l border-zinc-700">{order.price}</td>
									<td className="p-2 border-l border-zinc-700">
										{order.remaining}/{order.volume}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</section>

				<section className="flex flex-col gap-3">
					<Header title="Post order" />
					<PostForm portfolioId={portfolio?.id ?? 0} />
				</section>
			</div>
		</div>
	);
}
