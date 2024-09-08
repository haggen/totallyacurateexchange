import type { Serve } from "bun";
import { Hono } from "hono";
import { api, migrate, seed } from "~/src/api";
import { app as portfolios } from "~/src/app/portfolios/app";
import { app as sessions } from "~/src/app/sessions/app";
import { app as stocks } from "~/src/app/stocks/app";
import { app as users } from "~/src/app/users/app";
import { getConfig } from "~/src/config";
import { Database } from "~/src/shared/database";
import { print } from "~/src/shared/log";
import type { Env } from "~/src/shared/request";
import {
  getAuthentication,
  getDatabase,
  getLogger,
  handleErrors,
} from "~/src/shared/request";

const app = new Hono<Env>();

{
  await using database = await Database.open(getConfig("databaseUrl"));
  database.verbose = true;
  await migrate(database);
  await seed(database);
}

app.onError(handleErrors);
app.use(getLogger());
app.use(getDatabase(getConfig("databaseUrl")));

app.use(
  getAuthentication(async (database, token) => {
    const [session] = await api.sessions.find({ database, payload: { token } });
    return session;
  }),
);

/**
 * Route table.
 */
app.route("/users", users);
app.route("/stocks", stocks);
app.route("/sessions", sessions);
app.route("/portfolios", portfolios);

/**
 * Server banner.
 */
print(
  "log",
  "server",
  getConfig("env"),
  "Listening on port",
  getConfig("port"),
);

/**
 * @see https://bun.sh/docs/api/http#export-default-syntax
 */
export default {
  port: getConfig("port"),
  fetch: app.fetch,
} satisfies Serve;
