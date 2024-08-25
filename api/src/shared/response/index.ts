import { SQLiteError } from "bun:sqlite";
import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { ZodError } from "zod";

export enum Status {
  Ok = 200,
  Created = 201,
  NoContent = 204,
  BadRequest = 400,
  Unauthorized = 401,
  Forbidden = 403,
  NotFound = 404,
  MethodNotAllowed = 405,
  Conflict = 409,
  InternalServerError = 500,
}

export function handleError(err: Error, ctx: Context) {
  if (err instanceof HTTPException) {
    return err.getResponse();
  }

  if (err instanceof ZodError) {
    return ctx.json({ error: err }, Status.BadRequest);
  }

  if (err instanceof SQLiteError && err.code?.startsWith("SQLITE_CONSTRAINT")) {
    return ctx.json({ error: err }, Status.Conflict);
  }

  return ctx.json(null, Status.InternalServerError);
}
