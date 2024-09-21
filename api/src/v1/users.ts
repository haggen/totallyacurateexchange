import { Hono } from "hono";
import type { z } from "zod";
import { api } from "~/src/api";
import { must } from "~/src/shared/must";
import type { Env } from "~/src/shared/request";
import { Status } from "~/src/shared/response";
import { sql } from "~/src/shared/sql";

const app = new Hono<Env<z.infer<api.sessions.Session>>>();
export default app;

app.post("/", async (ctx) => {
  const database = ctx.get("database");
  const payload = await ctx.req.json();

  const user = must(
    await database.get<z.infer<api.users.User>>(
      ...sql.q`INSERT INTO users ${new sql.Entry(
        await api.users.create({
          name: payload.name,
          email: payload.email,
          password: payload.password,
        }),
      )} RETURNING *;`,
    ),
  );

  const portfolio = await database.get<z.infer<api.portfolios.Portfolio>>(
    ...sql.q`INSERT INTO portfolios ${new sql.Entry(
      api.portfolios.create({
        userId: user.id,
      }),
    )} RETURNING *;`,
  );

  return ctx.json({ ...user, portfolio }, Status.Created);
});
