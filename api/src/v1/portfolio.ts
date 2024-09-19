import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { z } from "zod";
import type { api } from "~/src/api";
import type { Env } from "~/src/shared/request";
import { Status } from "~/src/shared/response";
import { sql } from "~/src/shared/sql";

const app = new Hono<Env<z.infer<api.sessions.Session>>>();
export default app;

app.get("/", async (ctx) => {
	const database = ctx.get("database");
	const session = ctx.get("session");

	if (!session) {
		throw new HTTPException(Status.Unauthorized);
	}

	const portfolio = await database.get<
		z.infer<api.portfolios.Portfolio> & { total: number }
	>(
		...sql.q`
			SELECT portfolios.*, portfolios.balance + COALESCE(SUM(stocks.bid * holdings.volume), 0) AS total FROM portfolios 
			LEFT JOIN holdings ON holdings.portfolioId = portfolios.id
			LEFT JOIN stocks ON stocks.id = holdings.stockId
			WHERE portfolios.userId = ${session.userId} GROUP BY portfolios.id LIMIT 1;
		`,
	);

	if (!portfolio) {
		throw new HTTPException(Status.NotFound);
	}

	return ctx.json(portfolio);
});
