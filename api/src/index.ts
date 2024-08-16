import { Hono } from "hono";
import { routers } from "~/src/routers";

const app = new Hono();

app.route("/users", routers.users);

export default app;
