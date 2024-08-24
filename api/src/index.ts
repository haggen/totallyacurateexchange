import { Hono } from "hono";
import { logger } from "hono/logger";
import { getConfig } from "~/src/config";
import { prepare } from "~/src/database";
import { app as users } from "~/src/modules/users/app";
import { handleError } from "~/src/shared/response";

prepare();

const app = new Hono();

app.onError(handleError);
app.use(logger());

app.route("/users", users);

export default {
  port: getConfig("port"),
  fetch: app.fetch,
};
