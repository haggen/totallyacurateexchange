import { serve } from "bun";
import { Hono } from "hono";
import { api } from "~/src/api";
import { getConfig } from "~/src/config";
import { migrate, seed } from "~/src/database";
import { Database } from "~/src/shared/database";
import { print } from "~/src/shared/log";
import type { Env } from "~/src/shared/request";
import {
  handleErrors,
  logger,
  setRequestDatabase,
  setRequestSession,
} from "~/src/shared/request";
import v1 from "~/src/v1";

{
  await using database = await Database.open(getConfig("databaseUrl"));

  await migrate(database);
  await seed(database);
}

const app = new Hono<Env>();

app.onError(handleErrors);

app.use(logger);
app.use(setRequestDatabase(() => Database.open(getConfig("databaseUrl"))));
app.use(setRequestSession(api.sessions.findNotExpiredByToken));

app.route("/v1", v1);

print(
  "log",
  "server",
  getConfig("env"),
  "Listening on port",
  getConfig("port"),
);

serve({
  fetch: app.fetch,
  port: getConfig("port"),
});
