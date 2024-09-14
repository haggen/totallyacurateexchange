import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { z } from "zod";
import { api } from "~/src/api";
import type { Env } from "~/src/shared/request";
import { Status } from "~/src/shared/response";

export const app = new Hono<Env<z.infer<typeof api.sessions.Session>>>();

app.post("/", async (ctx) => {
  const database = ctx.get("database");

  const trades: z.infer<typeof api.trades.Trade>[] = [];

  const bids = await database.all<z.infer<typeof api.orders.Order>>(
    "SELECT * FROM orders WHERE type = 'bid' AND status = 'pending' ORDER BY createdAt ASC;",
  );

  const asks = await database.all<z.infer<typeof api.orders.Order>>(
    "SELECT * FROM orders WHERE type = 'ask' AND status = 'pending' ORDER BY createdAt ASC;",
  );

  if (bids.length === 0 || asks.length === 0) {
    return ctx.json(undefined, Status.NoContent);
  }

  for await (const bid of bids) {
    while (bid.remaining > 0) {
      const ask = asks.find(
        (ask) =>
          ask.status === "pending" &&
          ask.stockId === bid.stockId &&
          ask.price <= bid.price,
      );

      if (!ask) {
        break;
      }

      const volume = Math.min(bid.remaining, ask.remaining);
      const price = volume * bid.price;

      if (bid.remaining > ask.remaining) {
        Object.assign(
          bid,
          await database.get<z.infer<typeof api.orders.Order>>(
            "UPDATE orders SET remaining = remaining - ? WHERE id = ? RETURNING *;",
            ask.remaining,
            bid.id,
          ),
        );

        Object.assign(
          ask,
          await database.get<z.infer<typeof api.orders.Order>>(
            "UPDATE orders SET status = 'completed', remaining = 0 WHERE id = ? RETURNING *;",
            ask.id,
          ),
        );
      } else if (bid.remaining < ask.remaining) {
        Object.assign(
          bid,
          await database.get<z.infer<typeof api.orders.Order>>(
            "UPDATE orders SET status = 'completed', remaining = 0 WHERE id = ? RETURNING *;",
            bid.id,
          ),
        );

        Object.assign(
          ask,
          await database.get<z.infer<typeof api.orders.Order>>(
            "UPDATE orders SET remaining = remaining - ? WHERE id = ? RETURNING *;",
            bid.remaining,
            ask.id,
          ),
        );
      } else {
        Object.assign(
          bid,
          await database.get<z.infer<typeof api.orders.Order>>(
            "UPDATE orders SET status = 'completed', remaining = 0 WHERE id = ? RETURNING *;",
            bid.id,
          ),
        );

        Object.assign(
          ask,
          await database.get<z.infer<typeof api.orders.Order>>(
            "UPDATE orders SET status = 'completed', remaining = 0 WHERE id = ? RETURNING *;",
            ask.id,
          ),
        );
      }

      await database.run(
        "UPDATE portfolios SET balance = balance + ? WHERE id = ?;",
        price,
        ask.portfolioId,
      );

      trades.push(
        await api.trades.create({
          database,
          payload: {
            bidId: bid.id,
            askId: ask.id,
            volume,
          },
        }),
      );
    }
  }

  return ctx.json({ data: trades }, Status.Created);
});

app.get("/", async (ctx) => {
  const database = ctx.get("database");

  const trades = await api.trades.find({
    database,
    payload: {},
  });

  return ctx.json({ data: trades }, Status.Ok);
});

app.get("/:id{\\d+}", async (ctx) => {
  const database = ctx.get("database");
  const { id } = ctx.req.param();

  const [trade] = await api.orders.find({
    database,
    payload: { id },
  });

  if (!trade) {
    throw new HTTPException(Status.NotFound);
  }

  return ctx.json({ data: trade });
});
