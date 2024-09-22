import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { DateTime } from "luxon";
import { z } from "zod";
import { api } from "~/src/api";
import { must } from "~/src/shared/must";
import { hash } from "~/src/shared/object";
import type { Env } from "~/src/shared/request";
import { Status } from "~/src/shared/response";
import { Id } from "~/src/shared/schema";
import { scope } from "~/src/shared/scope";
import { sql } from "~/src/shared/sql";

const app = new Hono<Env<z.infer<api.sessions.Session>>>();
export default app;

app.post("/", async (ctx) => {
  const database = ctx.get("database");

  const trades: z.infer<api.trades.Trade>[] = [];

  // We prioritize the highest bidder, or the oldest if tied.
  const bids = await database.all<z.infer<api.orders.Order>>(
    ...new sql.Query(
      "SELECT * FROM orders",
      "WHERE type = 'bid' AND status = 'pending'",
      "ORDER BY price DESC, createdAt ASC;",
    ).toExpr(),
  );

  // We prioritize the lowest asker, or the oldest if tied.
  const asks = await database.all<z.infer<api.orders.Order>>(
    ...new sql.Query(
      "SELECT * FROM orders",
      "WHERE type = 'ask' AND status = 'pending'",
      "ORDER BY price ASC, createdAt ASC;",
    ).toExpr(),
  );

  if (bids.length === 0 || asks.length === 0) {
    return ctx.json({}, Status.NoContent);
  }

  // For each bid we're going to try and match an ask.
  for await (const bid of bids) {
    while (bid.remaining > 0) {
      // The ask should still be pending, with a matching
      // stock and a price lower or equal to the bid.
      const ask = asks.find(
        (ask) =>
          ask.status === "pending" &&
          ask.stockId === bid.stockId &&
          ask.price <= bid.price,
      );

      if (!ask) {
        break;
      }

      // We're trading, at most, all the remaining shares of one of the orders.
      const shares = Math.min(bid.remaining, ask.remaining);

      // Here we have to choose who we want to favor.
      // We have to use either the bid price, risking the buyer to pay
      // more, or the ask price, risking the seller to receive less.
      const price = shares * ask.price;

      if (bid.remaining > ask.remaining) {
        // If we're bidding for more shares than they're asking money for, we need to:
        // 1. Complete the ask order.
        // 2. Update remaining shares of the bid order.
        Object.assign(
          bid,
          await database.get<z.infer<api.orders.Order>>(
            ...new sql.Query(
              "UPDATE orders",
              new sql.Patch(
                api.orders.patch({ remaining: bid.remaining - shares }),
              ),
              ["WHERE id = ?", bid.id],
              "RETURNING *;",
            ).toExpr(),
          ),
        );

        Object.assign(
          ask,
          await database.get<z.infer<api.orders.Order>>(
            ...new sql.Query(
              "UPDATE orders",
              new sql.Patch(api.orders.patch({ remaining: 0 })),
              ["WHERE id = ?", ask.id],
              "RETURNING *;",
            ).toExpr(),
          ),
        );
      } else if (bid.remaining < ask.remaining) {
        // If we're bidding for less shares than they're asking money for, we need to:
        // 1. Complete the bid order.
        // 2. Update remaining shares of the ask order.
        Object.assign(
          bid,
          await database.get<z.infer<api.orders.Order>>(
            ...new sql.Query(
              "UPDATE orders",
              new sql.Patch(api.orders.patch({ remaining: 0 })),
              ["WHERE id = ?", bid.id],
              "RETURNING *;",
            ).toExpr(),
          ),
        );

        Object.assign(
          ask,
          await database.get<z.infer<api.orders.Order>>(
            ...new sql.Query(
              "UPDATE orders",
              new sql.Patch(
                api.orders.patch({ remaining: ask.remaining - shares }),
              ),
              ["WHERE id = ?", ask.id],
              "RETURNING *;",
            ).toExpr(),
          ),
        );
      } else {
        // If we're bidding for the same amount of shares they're asking money for, we need to complete both orders.
        Object.assign(
          bid,
          await database.get<z.infer<api.orders.Order>>(
            ...new sql.Query(
              "UPDATE orders",
              new sql.Patch(api.orders.patch({ remaining: 0 })),
              ["WHERE id = ?", bid.id],
              "RETURNING *;",
            ).toExpr(),
          ),
        );

        Object.assign(
          ask,
          await database.get<z.infer<api.orders.Order>>(
            ...new sql.Query(
              "UPDATE orders",
              new sql.Patch(api.orders.patch({ remaining: 0 })),
              ["WHERE id = ?", ask.id],
              "RETURNING *;",
            ).toExpr(),
          ),
        );
      }

      const holding = await database.get<
        Pick<z.infer<api.holdings.Holding>, "id" | "shares">
      >(
        ...new sql.Query(
          "SELECT id, shares FROM holdings",
          [
            "WHERE portfolioId = ? AND stockId = ?",
            bid.portfolioId,
            bid.stockId,
          ],
          "LIMIT 1;",
        ).toExpr(),
      );

      // Give the shares to the bidder.
      if (holding) {
        await database.run(
          ...new sql.Query(
            "UPDATE holdings",
            new sql.Patch(
              api.holdings.patch({ shares: holding.shares + shares }),
            ),
            ["WHERE id = ?", holding.id],
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
          ...new sql.Query(
            "SELECT * FROM portfolios",
            ["WHERE id = ?", ask.portfolioId],
            "LIMIT 1;",
          ).toExpr(),
        ),
      );

      // Give the money to the asker.
      await database.run(
        ...new sql.Query(
          "UPDATE portfolios",
          new sql.Patch(
            api.portfolios.patch({ balance: portfolio.balance + price }),
          ),
          ["WHERE id = ?", portfolio.id],
        ).toExpr(),
      );

      // Record the trade.
      trades.push(
        must(
          await database.get<z.infer<api.trades.Trade>>(
            ...new sql.Query(
              "INSERT INTO trades",
              new sql.Entry(
                api.trades.create({ bidId: bid.id, askId: ask.id, shares }),
              ),
              "RETURNING *;",
            ).toExpr(),
          ),
        ),
      );

      // Update price history.
      await database.run(
        ...new sql.Query(
          "INSERT INTO prices",
          new sql.Entry(
            api.prices.create({ stockId: bid.stockId, value: ask.price }),
          ),
        ).toExpr(),
      );

      // Update cached price.
      await database.run(
        ...new sql.Query(
          "UPDATE stocks",
          new sql.Patch(api.stocks.patch({ price: bid.price })),
          ["WHERE id = ?", bid.stockId],
        ).toExpr(),
      );
    }
  }

  return ctx.json(trades, Status.Created);
});

const Params = z.object({
  portfolio: Id.optional(),
  from: z
    .string()
    .date()
    .optional()
    .default(() => DateTime.utc().minus({ month: 1 }).toISODate()),
  until: z
    .string()
    .date()
    .optional()
    .default(() => DateTime.utc().toISODate()),
  page: z.coerce.number().default(1),
  length: z.coerce.number().default(100),
});

app.get("/", async (ctx) => {
  const database = ctx.get("database");
  const params = Params.parse(ctx.req.query());

  const criteria = new sql.Criteria();
  const join = new sql.Join();

  scope(params, "portfolio", (portfolioId) => {
    join.push(
      "LEFT JOIN orders ON orders.id = trades.askId OR orders.id = trades.bidId",
    );
    criteria.push("orders.portfolioId = ?", portfolioId);
  });

  criteria.push("trades.executedAt >= ?", params.from);
  criteria.push("trades.executedAt <= ?", params.until);

  const pagination = new sql.Pagination(params.length, params.page);

  const trades = await database.all<z.infer<api.trades.Trade>>(
    ...new sql.Query(
      "SELECT trades.* FROM trades",
      join,
      criteria,
      "ORDER BY trades.executedAt DESC",
      pagination,
    ).toExpr(),
  );

  const asks = hash(
    await database.all<z.infer<api.orders.Order>>(
      ...sql.q`SELECT * FROM orders WHERE id IN ${new sql.List(
        trades.map(({ askId }) => askId),
      )} LIMIT ${trades.length};`,
    ),
    (ask) => ask.id,
  );

  const bids = hash(
    await database.all<z.infer<api.orders.Order>>(
      ...sql.q`SELECT * FROM orders WHERE id IN ${new sql.List(
        trades.map(({ bidId }) => bidId),
      )} LIMIT ${trades.length};`,
    ),
    (bid) => bid.id,
  );

  return ctx.json(
    {
      data: trades.map((trade) => ({
        ...trade,
        ask: asks[trade.askId],
        bid: bids[trade.bidId],
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
