import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { z } from "zod";
import { api } from "~/src/api";
import { must } from "~/src/shared/must";
import type { Env } from "~/src/shared/request";
import { Status } from "~/src/shared/response";
import { Id } from "~/src/shared/schema";
import { sql } from "~/src/shared/sql";

const app = new Hono<Env<z.infer<api.sessions.Session>>>();
export default app;

app.post("/", async (ctx) => {
	const database = ctx.get("database");
	const payload = await ctx.req.json();

	const user = must(
		await database.get<z.infer<api.users.User>>(
			...sql.q`INSERT INTO users ${new sql.Entry(
				await api.users.create({
					name: payload.name,
					email: payload.email,
					password: payload.password,
				}),
			)} RETURNING *;`,
		),
	);

	const portfolio = await database.get<z.infer<api.portfolios.Portfolio>>(
		...sql.q`INSERT INTO portfolios ${new sql.Entry(
			api.portfolios.create({
				userId: user.id,
			}),
		)} RETURNING *;`,
	);

	return ctx.json({ ...user, portfolio }, Status.Created);
});

app.get("/:id{\\d+}", async (ctx) => {
	const database = ctx.get("database");
	const session = ctx.get("session");
	const id = Id.parse(ctx.req.param("id"));

	if (!session) {
		throw new HTTPException(Status.Unauthorized);
	}

	const criteria = new sql.Criteria();

	criteria.push("id = ?", id);
	criteria.push("id = ?", session.userId);

	const user = await database.get<z.infer<api.users.User>>(
		...sql.q`SELECT * FROM users ${criteria} LIMIT 1;`,
	);

	if (!user) {
		throw new HTTPException(Status.NotFound);
	}

	const portfolio = await database.get<z.infer<api.portfolios.Portfolio>>(
		...sql.q`SELECT * FROM portfolios WHERE userId = ${user.id} LIMIT 1;`,
	);

	if (!portfolio) {
		throw new HTTPException(Status.NotFound);
	}

	return ctx.json({ ...user, portfolio });
});

app.patch("/:id{\\d+}", async (ctx) => {
	const database = ctx.get("database");
	const session = ctx.get("session");
	const id = Id.parse(ctx.req.param("id"));
	const payload = await ctx.req.json();

	if (!session) {
		throw new HTTPException(Status.Unauthorized);
	}

	const patch = new sql.Patch(await api.users.patch(payload));

	const criteria = new sql.Criteria();
	criteria.push("id = ?", id);
	criteria.push("id = ?", session.userId);

	const user = await database.get<z.infer<api.users.User>>(
		...sql.q`UPDATE users ${patch} ${criteria} RETURNING *;`,
	);

	return ctx.json(user);
});
