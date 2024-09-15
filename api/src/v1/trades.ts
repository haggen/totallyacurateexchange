import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { z } from "zod";
import { api } from "~/src/api";
import { must } from "~/src/shared/must";
import type { Env } from "~/src/shared/request";
import { Status } from "~/src/shared/response";
import { Id } from "~/src/shared/schema";
import { sql } from "~/src/shared/sql";

const app = new Hono<Env<z.infer<api.sessions.Session>>>();
export default app;

app.post("/", async (ctx) => {
  const database = ctx.get("database");

  const trades: z.infer<api.trades.Trade>[] = [];

  const bids = await database.all<z.infer<api.orders.Order>>(
    "SELECT * FROM orders WHERE type = 'bid' AND status = 'pending' ORDER BY createdAt ASC;",
  );

  const asks = await database.all<z.infer<api.orders.Order>>(
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
          await database.get<z.infer<api.orders.Order>>(
            "UPDATE orders SET remaining = remaining - ? WHERE id = ? RETURNING *;",
            ask.remaining,
            bid.id,
          ),
        );

        Object.assign(
          ask,
          await database.get<z.infer<api.orders.Order>>(
            "UPDATE orders SET status = 'completed', remaining = 0 WHERE id = ? RETURNING *;",
            ask.id,
          ),
        );
      } else if (bid.remaining < ask.remaining) {
        Object.assign(
          bid,
          await database.get<z.infer<api.orders.Order>>(
            "UPDATE orders SET status = 'completed', remaining = 0 WHERE id = ? RETURNING *;",
            bid.id,
          ),
        );

        Object.assign(
          ask,
          await database.get<z.infer<api.orders.Order>>(
            "UPDATE orders SET remaining = remaining - ? WHERE id = ? RETURNING *;",
            bid.remaining,
            ask.id,
          ),
        );
      } else {
        Object.assign(
          bid,
          await database.get<z.infer<api.orders.Order>>(
            "UPDATE orders SET status = 'completed', remaining = 0 WHERE id = ? RETURNING *;",
            bid.id,
          ),
        );

        Object.assign(
          ask,
          await database.get<z.infer<api.orders.Order>>(
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
        must(
          await database.get<z.infer<api.trades.Trade>>(
            ...new sql.Query(
              "INSERT INTO trades",
              new sql.Entry(api.trades.create({
                bidId: bid.id,
                askId: ask.id,
                volume,
              })),
              "RETURNING *",
            ).toParams(),
          ),
        ),
      );
    }
  }

  return ctx.json({ data: trades }, Status.Created);
});

app.get("/", async (ctx) => {
  const database = ctx.get("database");

  const trades = await database.all<z.infer<api.trades.Trade>>(
    "SELECT * FROM trades ORDER BY executedAt DESC;",
  );

  return ctx.json({ data: trades }, Status.Ok);
});

app.get("/:id{\\d+}", async (ctx) => {
  const database = ctx.get("database");
  const id = Id.parse(ctx.req.param("id"));

  const criteria = new sql.Criteria();

  criteria.push("id = ?", id);

  const trade = await database.get<z.infer<api.trades.Trade>>(
    ...new sql.Query("SELECT * FROM trades", criteria, "LIMIT 1").toParams(),
  );

  if (!trade) {
    throw new HTTPException(Status.NotFound);
  }

  return ctx.json({ data: trade });
});
