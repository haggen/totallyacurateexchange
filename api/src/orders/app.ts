import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { z } from "zod";
import { api } from "~/src";
import { UnauthorizedError } from "~/src/shared/error";
import type { Env } from "~/src/shared/request";
import { Status } from "~/src/shared/response";

const app = new Hono<Env<z.infer<api.sessions.Session>>>();
export default app;

app.post("/", async (ctx) => {
  const database = ctx.get("database");
  const session = ctx.get("session");
  const data = await ctx.req.json();

  if (!session) {
    throw new UnauthorizedError();
  }

  const [portfolio] = await api.portfolios.find({
    database,
    payload: { id: data.portfolioId },
  });

  if (!portfolio) {
    throw new HTTPException(Status.UnprocessableEntity);
  }

  if (portfolio.userId !== session.userId) {
    throw new HTTPException(Status.Unauthorized);
  }

  const [holding] = await api.holdings.find({
    database,
    payload: { portfolioId: data.portfolioId, stockId: data.stockId },
  });

  if (!holding) {
    throw new HTTPException(Status.UnprocessableEntity);
  }

  const order = await api.orders.create({
    database,
    payload: {
      portfolioId: data.portfolioId,
      stockId: data.stockId,
      type: data.type,
      price: data.price,
      volume: data.volume,
    },
  });

  if (order.type === "ask") {
    if (holding.volume < data.volume) {
      throw new HTTPException(Status.UnprocessableEntity);
    }

    await api.holdings.update({
      database,
      payload: {
        id: holding.id,
        volume: holding.volume - data.volume,
      },
    });
  } else if (order.type === "bid") {
    const cost = data.price * data.volume;
    if (portfolio.balance < cost) {
      throw new HTTPException(Status.UnprocessableEntity);
    }

    await api.portfolios.update({
      database,
      payload: {
        id: portfolio.id,
        balance: portfolio.balance - cost,
      },
    });
  }

  return ctx.json({ data: order }, Status.Created);
});

app.get("/", async (ctx) => {
  const database = ctx.get("database");

  const orders = await api.orders.find({
    database,
    payload: {},
  });

  return ctx.json({ data: orders }, Status.Ok);
});

app.get("/:id{\\d+}", async (ctx) => {
  const database = ctx.get("database");
  const { id } = ctx.req.param();

  const [order] = await api.orders.find({
    database,
    payload: { id },
  });

  if (!order) {
    throw new HTTPException(Status.NotFound);
  }

  return ctx.json({ data: order });
});
