import { SQLiteError } from "bun:sqlite";
import { beforeAll, beforeEach, expect, setSystemTime, test } from "bun:test";
import { ZodError } from "zod";
import { prepare } from "~/src/database";
import { create, find, password, update } from "./api";

const now = new Date("1990-05-04T10:00:00Z");

beforeAll(() => {
  prepare();
});

beforeEach(() => {
  setSystemTime(now);
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

  const payload = {
    name: "John  Doe ",
    email: "JohnDoe@Example.com ",
    password: "password1234567",
  };

  const result = await create({
    payload,
  });

  expect(result).toEqual({
    id: expect.any(Number),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    name: "John Doe",
    email: "johndoe@example.com",
    password: expect.any(String),
  });

  expect(await password.verify(payload.password, result.password)).toBeTrue();

  expect(async () => {
    await create({
      payload,
    });
  }).toThrow(SQLiteError);
});

test("find", async () => {
  const john = await find({
    options: {
      limit: 1,
    },
  });

  expect(john).toEqual({
    id: expect.any(Number),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    name: expect.any(String),
    email: expect.any(String),
    password: expect.any(String),
  });

  const subject = [
    await find({
      options: {
        id: john.id,
      },
    }),
    await find({
      options: {
        email: john.email,
      },
    }),
  ];

  expect(subject).toEqual([john, john]);
});

test("update", async () => {
  const id = 1;

  expect(async () => {
    await update({
      payload: {
        name: "",
      },
      options: {
        id,
      },
    });
  });

  const payload = {
    name: "Bob  Smith ",
    email: "Bob@Example.com",
    password: "thisisnewpassword",
  };

  const result = await update({
    payload,
    options: { id },
  });

  expect(result).toEqual({
    id,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    name: "Bob Smith",
    email: "bob@example.com",
    password: expect.any(String),
  });

  expect(await password.verify(payload.password, result.password)).toBeTrue();
});
