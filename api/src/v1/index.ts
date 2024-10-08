import { Hono } from "hono";

import holdings from "./holdings";
import orders from "./orders";
import portfolio from "./portfolio";
import prices from "./prices";
import session from "./session";
import sessions from "./sessions";
import stocks from "./stocks";
import trades from "./trades";
import user from "./user";
import users from "./users";

const app = new Hono();
export default app;

app.route("/holdings", holdings);
app.route("/orders", orders);
app.route("/portfolio", portfolio);
app.route("/sessions", sessions);
app.route("/session", session);
app.route("/stocks", stocks);
app.route("/trades", trades);
app.route("/users", users);
app.route("/prices", prices);
app.route("/user", user);
