import { Hono } from "hono";
import { deleteCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";
import { DateTime } from "luxon";
import type { z } from "zod";
import type { api } from "~/src/api";
import { must } from "~/src/shared/must";
import type { Env } from "~/src/shared/request";
import { Status } from "~/src/shared/response";
import { sql } from "~/src/shared/sql";

const app = new Hono<Env<z.infer<api.sessions.Session>>>();
export default app;

app.get("/", async (ctx) => {
  const session = ctx.get("session");

  if (!session) {
    throw new HTTPException(Status.Unauthorized);
  }

  return ctx.json(session);
});

app.delete("/", async (ctx) => {
  const database = ctx.get("database");
  const session = ctx.get("session");

  if (!session) {
    throw new HTTPException(Status.Unauthorized);
  }

  const target = must(
    await database.get<z.infer<api.sessions.Session>>(
      ...sql.q`UPDATE sessions SET expiresAt = ${DateTime.utc().toISO()} WHERE id = ${session.id} RETURNING *;`,
    ),
  );

  deleteCookie(ctx, "session");

  return ctx.json(target, Status.Ok);
});
