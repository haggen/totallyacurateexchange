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

describe("GET /", async () => {
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

  test.skip("missing authorization", async () => {
    const response = await app.request("/");

    expect(response.status).toBe(Status.Unauthorized);
  });

  test.skip("invalid authorization", async () => {
    const response = await app.request("/", {
      headers: {
        Cookie: "session=invalid",
      },
    });

    expect(response.status).toBe(Status.Unauthorized);
  });

  test.skip("valid authorization", async () => {
    const response = await app.request("/", {
      headers: {
        Cookie: `session=${session.token}`,
      },
    });

    expect(response.status).toBe(Status.Ok);
    expect(await response.json()).toEqual({ ...user, portfolio });
  });
});
