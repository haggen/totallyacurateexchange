import type { Serve } from "bun";
import { Hono } from "hono";
import { migrate } from "~/src/api";
import { app as sessions } from "~/src/app/sessions/app";
import { app as users } from "~/src/app/users/app";
import { getConfig } from "~/src/config";
import { Database } from "~/src/shared/database";
import type { Env } from "~/src/shared/request";
import { getDatabaser, getLogger, handleErrors } from "~/src/shared/request";

const app = new Hono<Env>();

{
  await using database = await Database.open(getConfig("databaseUrl"));
  database.verbose = true;
  migrate(database);
}

app.onError(handleErrors);
app.use(getLogger());
app.use(getDatabaser(getConfig("databaseUrl")));

/**
 * Route table.
 */
app.route("/users", users);
app.route("/sessions", sessions);

/**
 * @see https://bun.sh/docs/api/http#export-default-syntax
 */
export default {
  port: getConfig("port"),
  fetch: app.fetch,
} satisfies Serve;
