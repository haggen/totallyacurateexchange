import { Hono } from "hono";
import { setCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";
import { DateTime } from "luxon";
import type { z } from "zod";
import { api } from "~/src/api";
import { must } from "~/src/shared/must";
import type { Env } from "~/src/shared/request";
import { Status } from "~/src/shared/response";
import { Email, Id } from "~/src/shared/schema";
import { sql } from "~/src/shared/sql";

const app = new Hono<Env<z.infer<api.sessions.Session>>>();
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

  const session = must(
    await database.get<z.infer<api.sessions.Session>>(
      ...new sql.Query(
        "INSERT INTO sessions",
        new sql.Entry(api.sessions.create({ userId: user.id })),
        "RETURNING *;",
      ).toExpr(),
    ),
  );

  setCookie(ctx, "session", session.token, {
    httpOnly: true,
    expires: DateTime.fromISO(session.expiresAt, { zone: "utc" }).toJSDate(),
  });

  return ctx.json(session, Status.Created);
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
  criteria.push("userId = ?", session.userId);

  const target = await database.get<z.infer<api.sessions.Session>>(
    ...sql.q`SELECT * FROM sessions ${criteria} LIMIT 1;`,
  );

  if (!target) {
    throw new HTTPException(Status.NotFound);
  }

  return ctx.json(target);
});

app.delete("/:id{\\d+}", async (ctx) => {
  const database = ctx.get("database");
  const session = ctx.get("session");
  const id = Id.parse(ctx.req.param("id"));

  if (!session) {
    throw new HTTPException(Status.Unauthorized);
  }

  const criteria = new sql.Criteria();
  criteria.push("id = ?", id);
  criteria.push("userId = ?", session.userId);

  const target = await database.get<z.infer<api.sessions.Session>>(
    ...sql.q`UPDATE sessions SET expiresAt = ${DateTime.utc().toISO()} ${criteria} RETURNING *;`,
  );

  if (!target) {
    throw new HTTPException(Status.NotFound);
  }

  return ctx.json(target, Status.Ok);
});
