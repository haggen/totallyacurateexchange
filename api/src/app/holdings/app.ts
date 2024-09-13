import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { z } from "zod";
import { api } from "~/src/api";
import { UnauthorizedError } from "~/src/shared/error";
import type { Env } from "~/src/shared/request";
import { Status } from "~/src/shared/response";

export const app = new Hono<Env<z.infer<typeof api.sessions.Session>>>();

app.get("/", async (ctx) => {
  const database = ctx.get("database");
  const session = ctx.get("session");

  if (!session) {
    throw new UnauthorizedError();
  }

  const [portfolio] = await api.portfolios.find({
    database,
    payload: { userId: session.userId },
  });

  if (!portfolio) {
    throw new HTTPException(Status.NotFound);
  }

  const holdings = await api.holdings.find({
    database,
    payload: { portfolioId: portfolio.id },
  });

  return ctx.json({ data: holdings }, Status.Ok);
});

app.get("/:id{\\d+}", async (ctx) => {
  const database = ctx.get("database");
  const { id } = ctx.req.param();

  const [holding] = await api.holdings.find({
    database,
    payload: { id },
  });

  if (!holding) {
    throw new HTTPException(Status.NotFound);
  }

  return ctx.json({ data: holding });
});
