import { serve } from "bun";
import { Hono } from "hono";
import { api, migrate, seed } from "~/src/api";
import { getConfig } from "~/src/config";
import { app as holdings } from "~/src/holdings/app";
import { app as orders } from "~/src/orders/app";
import { app as portfolios } from "~/src/portfolios/app";
import { app as sessions } from "~/src/sessions/app";
import { Database } from "~/src/shared/database";
import { print } from "~/src/shared/log";
import type { Env } from "~/src/shared/request";
import {
  getAuthentication,
  getDatabase,
  getLogger,
  handleErrors,
} from "~/src/shared/request";
import { app as stocks } from "~/src/stocks/app";
import { app as trades } from "~/src/trades/app";
import { app as users } from "~/src/users/app";

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
app.route("/holdings", holdings);
app.route("/orders", orders);
app.route("/portfolios", portfolios);
app.route("/sessions", sessions);
app.route("/stocks", stocks);
app.route("/trades", trades);
app.route("/users", users);

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
 * Listen.
 */
serve({
  fetch: app.fetch,
  port: getConfig("port"),
});
