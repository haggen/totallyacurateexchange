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
  const payload = await ctx.req.json();

  const user = must(
    await database.get<z.infer<api.users.User>>(
      ...new sql.Query(
        "INSERT INTO users",
        new sql.Entry(
          await api.users.create({
            name: payload.name,
            email: payload.email,
            password: payload.password,
          }),
        ),
        "RETURNING *",
      ).toParams(),
    ),
  );

  await database.run(
    ...new sql.Query(
      "INSERT INTO portfolios",
      new sql.Entry(
        api.portfolios.create({
          userId: user.id,
        }),
      ),
    ).toParams(),
  );

  return ctx.json({ data: user }, Status.Created);
});

app.get("/:id{\\d+}", async (ctx) => {
  const database = ctx.get("database");
  const session = ctx.get("session");
  const id = Id.parse(ctx.req.param("id"));

  if (!session) {
    throw new HTTPException(Status.Unauthorized);
  }

  const criteria = new sql.Criteria();

  criteria.push("id = ?", id);
  criteria.push("id = ?", session.userId);

  const user = await database.get<z.infer<api.users.User>>(
    ...new sql.Query("SELECT * FROM users", criteria, "LIMIT 1").toParams(),
  );

  if (!user) {
    throw new HTTPException(Status.NotFound);
  }

  return ctx.json({ data: user });
});

app.patch("/:id{\\d+}", async (ctx) => {
  const database = ctx.get("database");
  const session = ctx.get("session");
  const id = Id.parse(ctx.req.param("id"));
  const payload = await ctx.req.json();

  if (!session) {
    throw new HTTPException(Status.Unauthorized);
  }

  const data = api.users.User.pick({
    name: true,
    email: true,
    password: true,
  })
    .partial()
    .parse(payload);

  if (data.password) {
    data.password = await api.users.password.hash(data.password);
  }

  const patch = new sql.Patch(data);
  const criteria = new sql.Criteria();

  criteria.push("id = ?", id);
  criteria.push("id = ?", session.userId);

  const user = await database.get<z.infer<api.users.User>>(
    ...new sql.Query("UPDATE users", patch, criteria, "RETURNING *").toParams(),
  );

  return ctx.json({ data: user });
});
