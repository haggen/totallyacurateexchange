import { describe, expect, setSystemTime, test } from "bun:test";
import type { z } from "zod";
import { api } from "~/src/api";
import { must } from "~/src/shared/must";
import { Status } from "~/src/shared/response";
import { sql } from "~/src/shared/sql";
import { now, prepare } from "~/src/test";

import endpoints from "./users";

const examples = {
	user: {
		name: "John Doe",
		email: "jdoe@example.com",
		password: "0123456789abcdef",
	},
	portfolio: {
		userId: 1,
	},
	session: {
		userId: 1,
	},
};

describe("POST /", async () => {
	setSystemTime(now);

	const { app, database } = await prepare();
	app.route("/", endpoints);

	const response = await app.request("/", {
		method: "POST",
		body: JSON.stringify({
			name: examples.user.name,
			email: examples.user.email,
			password: examples.user.password,
		}),
		headers: {
			"Content-Type": "application/json",
		},
	});

	expect(response.status).toBe(201);
	expect(await response.json()).toEqual({
		data: {
			id: 1,
			createdAt: expect.any(String),
			updatedAt: expect.any(String),
			name: examples.user.name,
			email: examples.user.email,
			password: expect.any(String),
			portfolio: {
				id: 1,
				createdAt: expect.any(String),
				updatedAt: expect.any(String),
				userId: 1,
				balance: expect.any(Number),
			},
		},
	});
});

describe("GET /id", async () => {
	setSystemTime(now);

	const { app, database } = await prepare();
	app.route("/", endpoints);

	const user = must(
		await database.get<z.infer<api.users.User>>(
			...sql.q`INSERT INTO users ${new sql.Entry(await api.users.create(examples.user))} RETURNING *;`,
		),
	);

	const portfolio = must(
		await database.get<z.infer<api.portfolios.Portfolio>>(
			...sql.q`INSERT INTO portfolios ${new sql.Entry(api.portfolios.create(examples.portfolio))} RETURNING *;`,
		),
	);

	const session = must(
		await database.get<z.infer<api.sessions.Session>>(
			...sql.q`INSERT INTO sessions ${new sql.Entry(api.sessions.create(examples.session))} RETURNING *;`,
		),
	);

	test("missing authorization", async () => {
		const response = await app.request(`/${user.id}`);

		expect(response.status).toBe(Status.Unauthorized);
	});

	test("invalid authorization", async () => {
		const response = await app.request(`/${user.id}`, {
			headers: {
				Authorization: "Bearer invalid",
			},
		});

		expect(response.status).toBe(Status.Unauthorized);
	});

	test("valid authorization", async () => {
		const response = await app.request(`/${user.id}`, {
			headers: {
				Authorization: `Bearer ${session.token}`,
			},
		});

		expect(response.status).toBe(Status.Ok);
		expect(await response.json()).toEqual({ ...user, portfolio });
	});
});
