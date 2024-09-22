import { useQuery } from "@tanstack/react-query";
import { useLayoutEffect, useRef } from "react";
import { Button } from "~/src/components/Button";
import { Header } from "~/src/components/Header";
import { Modal } from "~/src/components/Modal";
import { OrderForm } from "~/src/components/OrderForm";
import type { Holding, Order, Portfolio } from "~/src/lib/api";
import { fmt } from "~/src/lib/format";
import { request } from "~/src/lib/request";

export default function Page() {
  const postDialogRef = useRef<HTMLDialogElement>(null);
  const postFormRef = useRef<HTMLFormElement>(null);

  const {
    data: { body: portfolio } = {},
  } = useQuery({
    queryKey: ["portfolio"],
    refetchInterval: 2000,
    queryFn: ({ signal }) => {
      return request<Portfolio>("/api/v1/portfolio", { signal });
    },
  });

  const {
    data: { body: holdings } = {},
  } = useQuery({
    queryKey: ["holdings"],
    refetchInterval: 2000,
    queryFn: ({ signal }) => {
      return request<Holding[]>("/api/v1/holdings", { signal });
    },
  });

  const {
    data: { body: market } = {},
  } = useQuery({
    queryKey: ["orders", { hide: portfolio?.id, status: "pending" }],
    refetchInterval: 2000,
    queryFn: ({ signal }) => {
      return request<Order[]>(
        `/api/v1/orders?hide=${portfolio?.id}&status=pending`,
        {
          signal,
        },
      );
    },
    enabled: !!portfolio,
  });

  const {
    data: { body: orders } = {},
  } = useQuery({
    queryKey: ["orders", { portfolio: portfolio?.id }],
    refetchInterval: 2000,
    queryFn: ({ signal }) => {
      return request<Order[]>(`/api/v1/orders?portfolio=${portfolio?.id}`, {
        signal,
      });
    },
    enabled: !!portfolio,
  });

  useLayoutEffect(() => {
    if (!postFormRef.current) {
      throw new Error("Can't set portfolioId");
    }

    const controls = postFormRef.current.elements as unknown as {
      portfolioId: HTMLInputElement;
    };

    controls.portfolioId.value = String(portfolio?.id);
  }, [portfolio]);

  const createMatchingOrder = (order: Order) => {
    if (!postFormRef.current) {
      return;
    }

    if (!postDialogRef.current) {
      return;
    }

    const controls = postFormRef.current.elements as unknown as {
      type: HTMLSelectElement;
      stockId: HTMLInputElement;
      shares: HTMLInputElement;
      price: HTMLInputElement;
    };

    controls.type.value = order.type === "bid" ? "ask" : "bid";
    controls.stockId.value = String(order.stock.id);
    controls.shares.value = String(order.remaining);
    controls.price.value = String(order.price);

    postDialogRef.current.showModal();
  };

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
                <th className="p-2 text-right border-l border-zinc-700">
                  Shares
                </th>
                <th className="p-2 text-right border-l border-zinc-700">
                  Price
                </th>
                <th className="p-2 text-right border-l border-zinc-700">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {holdings?.map((holding) => (
                <tr key={holding.id} className="border-t border-zinc-700">
                  <td className="p-2">{holding.stock.name}</td>
                  <td className="p-2 text-right border-l border-zinc-700">
                    {fmt.number(holding.shares)}
                  </td>
                  <td className="p-2 text-right border-l border-zinc-700">
                    {fmt.currency(holding.stock.price)}
                  </td>
                  <td className="p-2 text-right border-l border-zinc-700">
                    {fmt.currency(holding.shares * holding.stock.price)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="flex flex-col gap-3">
          <Header title="History" />

          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="p-2 text-left border-zinc-700">Date</th>
                <th className="p-2 text-left border-l border-zinc-700">Type</th>
                <th className="p-2 text-left border-l border-zinc-700">
                  Stock
                </th>
                <th className="p-2 text-right border-l border-zinc-700">
                  Shares
                </th>
                <th className="p-2 text-right border-l border-zinc-700">
                  Price
                </th>
                <th className="p-2 text-right border-l border-zinc-700">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {orders?.map((order) => (
                <tr key={order.id} className="border-t border-zinc-700">
                  <td className="p-2 border-zinc-700">
                    {fmt.datetime(order.createdAt)}
                  </td>
                  <td className="p-2 border-l border-zinc-700">
                    {fmt.capitalize(order.type)}
                  </td>
                  <td className="p-2 truncate border-l max-w-24 border-zinc-700">
                    {order.stock.name}
                  </td>
                  <td className="p-2 text-right border-l border-zinc-700">
                    {fmt.number(order.shares)}
                  </td>
                  <td className="p-2 text-right border-l border-zinc-700">
                    {fmt.currency(order.price)}
                  </td>
                  <td className="p-2 text-right border-l border-zinc-700">
                    {fmt.capitalize(order.status)}
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
                <th className="p-2 text-right border-l border-zinc-700">
                  &nbsp;
                </th>
              </tr>
            </thead>
            <tbody>
              {market?.map((order) => (
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
                  <td className="p-2 text-center border-l border-zinc-700">
                    <Button
                      variant="small"
                      onClick={() => createMatchingOrder(order)}
                    >
                      Match
                    </Button>
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

            <OrderForm formRef={postFormRef} />
          </div>
        </Modal>
      </div>
    </div>
  );
}
