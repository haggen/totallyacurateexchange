import { Hono } from "hono";

import holdings from "./holdings";
import orders from "./orders";
import portfolios from "./portfolios";
import sessions from "./sessions";
import stocks from "./stocks";
import trades from "./trades";
import users from "./users";

const app = new Hono();
export default app;

app.route("/holdings", holdings);
app.route("/orders", orders);
app.route("/portfolios", portfolios);
app.route("/sessions", sessions);
app.route("/stocks", stocks);
app.route("/trades", trades);
app.route("/users", users);
