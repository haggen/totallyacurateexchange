import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { Button } from "~/src/components/Button";
import { Header } from "~/src/components/Header";
import { Modal } from "~/src/components/Modal";
import { OrderForm } from "~/src/components/OrderForm";
import type { Holding, Order, Portfolio } from "~/src/lib/api";
import { fmt } from "~/src/lib/format";
import { request } from "~/src/lib/request";

export default function Page() {
  const queryClient = useQueryClient();
  const postDialogRef = useRef<HTMLDialogElement>(null);

  const { mutate: executeTrades } = useMutation({
    mutationFn() {
      return request("/api/v1/trades", { method: "post" });
    },
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: ["holdings"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
    },
  });

  const {
    data: { body: portfolio } = {},
  } = useQuery({
    queryKey: ["portfolio"],
    queryFn: ({ signal }) => {
      return request<Portfolio>("/api/v1/portfolio", { signal });
    },
  });

  const {
    data: { body: holdings } = {},
  } = useQuery({
    queryKey: ["holdings"],
    queryFn: ({ signal }) => {
      return request<Holding[]>("/api/v1/holdings", { signal });
    },
  });

  const {
    data: { body: orders } = {},
  } = useQuery({
    queryKey: ["orders"],
    queryFn: ({ signal }) => {
      return request<Order[]>("/api/v1/orders", { signal });
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
          <Header title="Holdings">
            <menu>
              <li>
                <Button
                  onClick={() => {
                    postDialogRef.current?.showModal();
                  }}
                >
                  Post new order
                </Button>
              </li>
            </menu>
          </Header>

          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="p-2 text-left">Stock</th>
                <th className="p-2 text-left border-l border-zinc-700">
                  Shares
                </th>
                <th className="p-2 text-right border-l border-zinc-700">Bid</th>
                <th className="p-2 text-right border-l border-zinc-700">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {holdings?.map((holding) => (
                <tr key={holding.id} className="border-t border-zinc-700">
                  <td className="p-2">{holding.stock.name}</td>
                  <td className="p-2 border-l border-zinc-700">
                    {fmt.number(holding.shares)}
                  </td>
                  <td className="p-2 text-right border-l border-zinc-700">
                    {fmt.currency(holding.stock.bid)}
                  </td>
                  <td className="p-2 text-right border-l border-zinc-700">
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
          <Header title="Market">
            <menu>
              <li>
                <Button
                  onClick={() => {
                    executeTrades();
                  }}
                >
                  Execute trades
                </Button>
              </li>
            </menu>
          </Header>

          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="p-2 text-left border-zinc-700">Order</th>
                <th className="p-2 text-left border-l border-zinc-700">
                  Stock
                </th>
                <th className="p-2 text-right border-l border-zinc-700">
                  Shares
                </th>
                <th className="p-2 text-right border-l border-zinc-700">
                  Price
                </th>
              </tr>
            </thead>
            <tbody>
              {orders?.map((order) => (
                <tr key={order.id} className="border-t border-zinc-700">
                  <td className="p-2 border-zinc-700">
                    {fmt.capitalize(order.type)}
                  </td>
                  <td className="p-2 border-l border-zinc-700">
                    {order.stock.name}
                  </td>
                  <td className="p-2 text-right border-l border-zinc-700">
                    {fmt.number(order.remaining)}
                  </td>
                  <td className="p-2 text-right border-l border-zinc-700">
                    {fmt.currency(order.price)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <Modal dialog={postDialogRef}>
          <div className="flex flex-col gap-6">
            <Header title="Post order">
              <Button onClick={() => postDialogRef.current?.close()}>
                Close
              </Button>
            </Header>

            <OrderForm portfolioId={portfolio?.id ?? 0} />
          </div>
        </Modal>
      </div>
    </div>
  );
}
