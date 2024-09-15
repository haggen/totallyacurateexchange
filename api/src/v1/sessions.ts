import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { z } from "zod";
import { api } from "~/src/api";
import type { Env } from "~/src/shared/request";
import { Status } from "~/src/shared/response";
import { Email, Id } from "~/src/shared/schema";
import { sql } from "~/src/shared/sql";

const app = new Hono<Env>();
export default app;

app.post("/", async (ctx) => {
  const database = ctx.get("database");
  const payload = await ctx.req.json();

  const user = await database.get<z.infer<api.users.User>>(
    "SELECT * FROM users WHERE email = ? LIMIT 1;",
    Email.parse(payload.email),
  );

  if (!user) {
    throw new HTTPException(Status.NotFound);
  }

  const authenticated = await api.users.password.verify(
    payload.password,
    user.password,
  );

  if (!authenticated) {
    throw new HTTPException(Status.Unauthorized);
  }

  const entry = new sql.Entry(api.sessions.create({ userId: user.id }));

  const session = await database.get<z.infer<api.sessions.Session>>(
    `INSERT INTO sessions ${entry} RETURNING *;`,
    ...entry.bindings,
  );

  return ctx.json({ data: session }, Status.Created);
});

app.get("/:id{\\d+}", async (ctx) => {
  const database = ctx.get("database");
  const id = Id.parse(ctx.req.param("id"));

  const criteria = new sql.Criteria();

  criteria.push("id = ?", id);

  const session = await database.get<z.infer<api.sessions.Session>>(
    `SELECT * FROM sessions ${criteria} LIMIT 1;`,
    ...criteria.bindings,
  );

  if (!session) {
    throw new HTTPException(Status.NotFound);
  }

  return ctx.json({ data: session });
});

app.delete("/:id{\\d+}", async (ctx) => {
  const database = ctx.get("database");
  const id = Id.parse(ctx.req.param("id"));

  const session = await database.get<z.infer<api.sessions.Session>>(
    "DELETE FROM sessions WHERE id = ? RETURNING *;",
    id,
  );

  if (!session) {
    throw new HTTPException(Status.NotFound);
  }

  return ctx.json({ data: session }, Status.Ok);
});
