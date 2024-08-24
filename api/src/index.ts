import { Hono } from "hono";
import { getConfig } from "~/src/config";
import { prepare } from "~/src/database";
import { app as users } from "~/src/modules/users/app";
import { handleError } from "~/src/shared/response";

prepare();

const app = new Hono();

app.onError(handleError);

app.use(async (ctx, next) => {
  const start = performance.now();

  await next();

  const duration = performance.now() - start;

  console.log(
    new Date().toISOString(),
    ctx.req.method,
    new URL(ctx.req.url).pathname,
    ctx.res.status,
    `${duration.toFixed(2)}ms`,
  );
});

app.route("/users", users);

export default {
  port: getConfig("port"),
  fetch: app.fetch,
};
