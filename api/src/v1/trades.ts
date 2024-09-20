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
    "SELECT * FROM orders WHERE type = 'bid' AND status = 'pending' ORDER BY price DESC, createdAt ASC;",
  );

  const asks = await database.all<z.infer<api.orders.Order>>(
    "SELECT * FROM orders WHERE type = 'ask' AND status = 'pending' ORDER BY price ASC, createdAt ASC;",
  );

  if (bids.length === 0 || asks.length === 0) {
    return ctx.json({}, Status.NoContent);
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

      const shares = Math.min(bid.remaining, ask.remaining);

      // Here we choose who we want to favor; the asker or the bidder.
      const price = shares * ask.price;

      if (bid.remaining > ask.remaining) {
        // If we're buying more than the shares being sold, we need to:
        // 1. Complete the ask order.
        // 2. Update remaining shares of the bid order.
        Object.assign(
          bid,
          await database.get<z.infer<api.orders.Order>>(
            ...sql.q`UPDATE orders ${new sql.Patch(
              api.orders.patch({
                remaining: bid.remaining - shares,
              }),
            )} WHERE id = ${bid.id} RETURNING *;`,
          ),
        );

        Object.assign(
          ask,
          await database.get<z.infer<api.orders.Order>>(
            ...sql.q`UPDATE orders ${new sql.Patch(
              api.orders.patch({
                remaining: 0,
              }),
            )} WHERE id = ${ask.id} RETURNING *;`,
          ),
        );
      } else if (bid.remaining < ask.remaining) {
        // If we're buying less than the shares being sold, we need to:
        // 1. Complete the bid order.
        // 2. Update remaining shares of the ask order.
        Object.assign(
          bid,
          await database.get<z.infer<api.orders.Order>>(
            ...sql.q`UPDATE orders ${new sql.Patch(
              api.orders.patch({
                remaining: 0,
              }),
            )} WHERE id = ${bid.id} RETURNING *;`,
          ),
        );

        Object.assign(
          ask,
          await database.get<z.infer<api.orders.Order>>(
            ...sql.q`UPDATE orders ${new sql.Patch(
              api.orders.patch({
                remaining: ask.remaining - shares,
              }),
            )} WHERE id = ${ask.id} RETURNING *;`,
          ),
        );
      } else {
        // If we're buying the exact shares being sold, we need to complete both orders.
        Object.assign(
          bid,
          await database.get<z.infer<api.orders.Order>>(
            ...sql.q`UPDATE orders ${new sql.Patch(
              api.orders.patch({
                remaining: 0,
              }),
            )} WHERE id = ${bid.id} RETURNING *;`,
          ),
        );

        Object.assign(
          ask,
          await database.get<z.infer<api.orders.Order>>(
            ...sql.q`UPDATE orders ${new sql.Patch(
              api.orders.patch({
                remaining: 0,
              }),
            )} WHERE id = ${ask.id} RETURNING *;`,
          ),
        );
      }

      const holding = await database.get<
        Pick<z.infer<api.holdings.Holding>, "id" | "shares">
      >(
        ...sql.q`SELECT id, shares FROM holdings WHERE portfolioId = ${bid.portfolioId} AND stockId = ${bid.stockId} LIMIT 1;`,
      );

      // Update the holdings of the buyer.
      if (holding) {
        await database.run(
          ...new sql.Query(
            "UPDATE holdings",
            new sql.Patch(
              api.holdings.patch({
                shares: holding.shares + shares,
              }),
            ),
            new sql.Criteria("id = ?", holding.id),
          ).toExpr(),
        );
      } else {
        await database.run(
          ...new sql.Query(
            "INSERT INTO holdings",
            new sql.Entry(
              api.holdings.create({
                portfolioId: bid.portfolioId,
                stockId: bid.stockId,
                shares,
              }),
            ),
          ).toExpr(),
        );
      }

      const portfolio = must(
        await database.get<z.infer<api.portfolios.Portfolio>>(
          ...sql.q`SELECT id, balance FROM portfolios WHERE id = ${ask.portfolioId} LIMIT 1;`,
        ),
      );

      // Update the balance of the seller.
      await database.run(
        ...sql.q`UPDATE portfolios ${new sql.Patch(
          api.portfolios.patch({
            balance: portfolio.balance + price,
          }),
        )} WHERE id = ${portfolio.id};`,
      );

      // Record the trade.
      trades.push(
        must(
          await database.get<z.infer<api.trades.Trade>>(
            ...sql.q`INSERT INTO trades ${new sql.Entry(
              api.trades.create({
                bidId: bid.id,
                askId: ask.id,
                shares,
              }),
            )} RETURNING *;`,
          ),
        ),
      );
    }
  }

  return ctx.json(trades, Status.Created);
});

app.get("/", async (ctx) => {
  const database = ctx.get("database");

  const trades = await database.all<z.infer<api.trades.Trade>>(
    "SELECT * FROM trades ORDER BY executedAt DESC;",
  );

  const asks = await database.all<z.infer<api.orders.Order>>(
    ...sql.q`SELECT * FROM orders WHERE id IN ${new sql.List(
      trades.map(({ askId }) => askId),
    )} LIMIT ${trades.length};`,
  );

  const bids = await database.all<z.infer<api.orders.Order>>(
    ...sql.q`SELECT * FROM orders WHERE id IN ${new sql.List(
      trades.map(({ bidId }) => bidId),
    )} LIMIT ${trades.length};`,
  );

  return ctx.json(
    {
      data: trades.map((trade) => ({
        ...trade,
        ask: asks.find(({ id }) => id === trade.askId),
        bid: bids.find(({ id }) => id === trade.bidId),
      })),
    },
    Status.Ok,
  );
});

app.get("/:id{\\d+}", async (ctx) => {
  const database = ctx.get("database");
  const id = Id.parse(ctx.req.param("id"));

  const criteria = new sql.Criteria();
  criteria.push("id = ?", id);

  const trade = await database.get<z.infer<api.trades.Trade>>(
    ...sql.q`SELECT * FROM trades ${criteria} LIMIT 1;`,
  );

  if (!trade) {
    throw new HTTPException(Status.NotFound);
  }

  const ask = must(
    await database.get<z.infer<api.orders.Order>>(
      ...sql.q`SELECT * FROM orders WHERE id = ${trade.askId} LIMIT 1;`,
    ),
  );

  const bid = must(
    await database.get<z.infer<api.orders.Order>>(
      ...sql.q`SELECT * FROM orders WHERE id = ${trade.bidId} LIMIT 1;`,
    ),
  );

  return ctx.json({ ...trade, ask, bid });
});
