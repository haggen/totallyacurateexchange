import { Hono } from "hono";

import holdings from "~/src/holdings/app";
import orders from "~/src/orders/app";
import portfolios from "~/src/portfolios/app";
import sessions from "~/src/sessions/app";
import stocks from "~/src/stocks/app";
import trades from "~/src/trades/app";
import users from "~/src/users/app";

const app = new Hono();
export default app;

app.route("/holdings", holdings);
app.route("/orders", orders);
app.route("/portfolios", portfolios);
app.route("/sessions", sessions);
app.route("/stocks", stocks);
app.route("/trades", trades);
app.route("/users", users);
