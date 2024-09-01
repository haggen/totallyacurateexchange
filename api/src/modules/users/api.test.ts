import { SQLiteError } from "bun:sqlite";
import { beforeEach, expect, setSystemTime, test } from "bun:test";
import { ZodError } from "zod";
import { prepare } from "~/src/database";
import { now } from "~/src/shared/test/fixtures.json";

import { create, find, password, update } from "./api";
import fixtures from "./fixtures.json";

beforeEach(() => {
  setSystemTime(new Date(now));
  prepare();
});

test("password", async () => {
  const hash = await password.hash("password");

  expect(hash).not.toBe("password");
  expect(await password.verify("password", hash)).toBeTrue();
  expect(await password.verify("wrong", hash)).toBeFalse();
});

test("create", async () => {
  expect(async () => {
    await create({
      payload: {
        email: "",
        name: "",
        password: "",
      },
    });
  }).toThrowError(ZodError);

  const john = await create({
    payload: {
      email: fixtures.john.email,
      name: fixtures.john.name,
      password: fixtures.john.password,
    },
  });

  expect(john).toEqual({
    id: expect.any(Number),
    createdAt: now,
    updatedAt: now,
    name: fixtures.john.name,
    email: fixtures.john.email,
    password: expect.any(String),
  });

  expect(
    await password.verify(fixtures.john.password, john.password),
  ).toBeTrue();

  expect(async () => {
    await create({
      payload: {
        email: fixtures.john.email,
        name: fixtures.john.name,
        password: fixtures.john.password,
      },
    });
  }).toThrow(SQLiteError);
});

test("find", async () => {
  const john = await create({
    payload: {
      email: fixtures.john.email,
      name: fixtures.john.name,
      password: fixtures.john.password,
    },
  });

  expect(
    await find({
      options: {
        limit: 1,
      },
    }),
  ).toEqual([john]);

  expect(
    await find({
      options: {
        id: john.id,
      },
    }),
  ).toEqual([john]);

  expect(
    await find({
      options: {
        email: john.email,
      },
    }),
  ).toEqual([john]);
});

test("update", async () => {
  const john = await create({
    payload: {
      email: fixtures.john.email,
      name: fixtures.john.name,
      password: fixtures.john.password,
    },
  });

  const bob = await update({
    payload: {
      name: fixtures.bob.name,
      email: fixtures.bob.email,
      password: fixtures.bob.password,
    },
    options: {
      id: john.id,
    },
  });

  expect(bob).toEqual({
    id: bob.id,
    createdAt: now,
    updatedAt: now,
    name: fixtures.bob.name,
    email: fixtures.bob.email,
    password: expect.any(String),
  });

  expect(await password.verify(fixtures.bob.password, bob.password)).toBeTrue();
});
