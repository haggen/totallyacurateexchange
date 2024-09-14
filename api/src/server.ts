import { serve } from "bun";
import { Hono } from "hono";
import { api } from "~/src";
import { getConfig } from "~/src/config";
import { migrate, seed } from "~/src/database";
import { Database } from "~/src/shared/database";
import { print } from "~/src/shared/log";
import type { Env } from "~/src/shared/request";
import {
  getDatabase,
  getLogger,
  getSession,
  handleErrors,
} from "~/src/shared/request";
import v1 from "~/src/v1";

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
  getSession(async (database, token) => {
    const [session] = await api.sessions.find({ database, payload: { token } });
    return session;
  }),
);

app.route("/v1", v1);

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
