import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useRef } from "react";
import { Alert } from "~/src/components/Alert";
import { Button } from "~/src/components/Button";
import { Field } from "~/src/components/Field";
import { Header } from "~/src/components/Header";
import { Input } from "~/src/components/Input";
import { Select } from "~/src/components/Select";
import type { Holding, Order, Portfolio, Stock } from "~/src/lib/api";
import { fmt } from "~/src/lib/format";
import { request } from "~/src/lib/request";

function PostForm({ portfolioId }: { portfolioId: number }) {
  const queryClient = useQueryClient();
  const formRef = useRef<HTMLFormElement>(null);

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
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });

      formRef.current?.reset();
    },
  });

  const {
    data: { body: stocks = [] } = {},
    isLoading: isLoadingStocks,
  } = useQuery({
    queryKey: ["stocks"],
    queryFn: () => {
      return request<Stock[]>("/api/v1/stocks");
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
      className="flex flex-col gap-9"
      ref={formRef}
    >
      {error ? (
        <Alert>
          <pre>{JSON.stringify(error)}</pre>
        </Alert>
      ) : null}

      <fieldset className="flex flex-col gap-6">
        <input type="hidden" name="portfolioId" value={portfolioId} />

        <Field label="Stock">
          {({ id }) => (
            <Select id={id} name="stockId" required>
              {isLoadingStocks ? (
                <option value="" disabled selected>
                  Loading...
                </option>
              ) : (
                [
                  <option
                    key="loading"
                    value=""
                    disabled
                    selected
                    className="hidden"
                  >
                    ...
                  </option>,
                  ...stocks.map((stock) => (
                    <option key={stock.id} value={stock.id}>
                      {stock.name}
                    </option>
                  )),
                ]
              )}
            </Select>
          )}
        </Field>

        <Field label="Type">
          {({ id }) => (
            <Select id={id} name="type" required>
              <option value="" disabled selected className="hidden">
                ...
              </option>
              <option value="bid">Bid</option>
              <option value="ask">Ask</option>
            </Select>
          )}
        </Field>

        <Field label="Price">
          {({ id }) => (
            <Input type="number" id={id} name="price" placeholder="999" />
          )}
        </Field>

        <Field label="Shares">
          {({ id }) => (
            <Input type="number" id={id} name="shares" placeholder="99" />
          )}
        </Field>
      </fieldset>

      <footer>
        <Button type="submit" disabled={isPending}>
          Post
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
    <div className="container grid grid-cols-2 gap-12 px-12 py-6 mx-auto">
      <div className="flex flex-col gap-12">
        <section className="flex flex-col gap-3">
          <Header title="Portfolio" />

          <table className="w-full border-collapse">
            <tbody>
              <tr>
                <th className="p-2 text-left">Holdings</th>
                <td className="p-2 border-l border-zinc-700">
                  {portfolio
                    ? fmt.currency(portfolio.total - portfolio.balance)
                    : "Loading..."}
                </td>
              </tr>
              <tr className="border-t border-zinc-700">
                <th className="p-2 text-left">Liquid</th>
                <td className="p-2 border-l border-zinc-700">
                  {portfolio ? fmt.currency(portfolio.balance) : "Loading..."}
                </td>
              </tr>
              <tr className="border-t border-zinc-700">
                <th className="p-2 text-left">Total</th>
                <td className="p-2 border-l border-zinc-700">
                  {portfolio ? fmt.currency(portfolio.total) : "Loading..."}
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="flex flex-col gap-3">
          <Header title="Holdings" />

          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="p-2 text-left">Stock</th>
                <th className="p-2 text-left border-l border-zinc-700">
                  Shares
                </th>
                <th className="p-2 text-left border-l border-zinc-700">
                  Potential
                </th>
              </tr>
            </thead>
            <tbody>
              {holdings?.map((holding) => (
                <tr
                  key={holding.id}
                  className="border-t first:border-t-0 border-zinc-700"
                >
                  <th className="p-2">{holding.stock.name}</th>
                  <td className="p-2 border-l border-zinc-700">
                    {fmt.number(holding.shares)}
                  </td>
                  <td className="p-2 border-l border-zinc-700">
                    {fmt.currency(holding.shares * holding.stock.bid)}
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
            <thead>
              <tr>
                <th className="p-2 text-sm text-left">Date</th>
                <th className="p-2 text-sm text-left border-l border-zinc-700">
                  Order
                </th>
                <th className="p-2 text-sm text-left border-l border-zinc-700">
                  Stock
                </th>
                <th className="p-2 text-sm text-left border-l border-zinc-700">
                  Shares
                </th>
                <th className="p-2 text-sm text-left border-l border-zinc-700">
                  Price
                </th>
              </tr>
            </thead>
            <tbody>
              {orders?.map((order) => (
                <tr key={order.id} className="border-t border-zinc-700">
                  <td className="p-2">{fmt.datetime(order.createdAt)}</td>
                  <td className="p-2 border-l border-zinc-700">
                    {fmt.capitalize(order.type)}
                  </td>
                  <td className="p-2 border-l border-zinc-700">
                    {order.stock.name}
                  </td>
                  <td className="p-2 border-l border-zinc-700">
                    {fmt.number(order.remaining)}
                  </td>
                  <td className="p-2 border-l border-zinc-700">
                    {fmt.currency(order.price)}
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
