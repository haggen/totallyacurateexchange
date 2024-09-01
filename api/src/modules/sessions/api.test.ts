import { beforeAll, beforeEach, expect, setSystemTime, test } from "bun:test";
import { api } from "~/src/api";
import { prepare } from "~/src/database";
import { create, destroy, find } from "./api";

const now = new Date("1990-05-04T10:00:00Z");

let lastId: string;

beforeAll(() => {
  prepare();
});

beforeEach(() => {
  setSystemTime(now);
});

test("create", async () => {
  const user = await api.users.create({
    payload: {
      name: "Test",
      email: "test@example.com",
      password: "0123456789abcdef",
    },
  });

  const session = await create({
    payload: { userId: user.id },
  });

  expect(session).toEqual({
    id: expect.any(String),
    createdAt: now.toISOString(),
    expiresAt: expect.any(String),
    userId: user.id,
  });

  lastId = session.id;
});

test("find", async () => {
  const session = await find({
    options: {
      limit: 1,
    },
  });

  expect(session).toEqual({
    id: lastId,
    createdAt: now.toISOString(),
    expiresAt: expect.any(String),
    userId: expect.any(Number),
  });
});

test("destroy", async () => {
  let session = await find({
    options: {
      limit: 1,
    },
  });

  session = await destroy({
    options: {
      id: session.id,
    },
  });

  expect(session).toEqual({
    id: lastId,
    createdAt: now.toISOString(),
    expiresAt: expect.any(String),
    userId: 1,
  });
});
