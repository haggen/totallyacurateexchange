import { describe, expect, setSystemTime, test } from "bun:test";
import { now } from "~/src/test";

import { create, patch } from "./holdings";

describe("create", () => {
  test("valid data", async () => {
    setSystemTime(now);

    expect(create({ portfolioId: 1, stockId: 1, volume: 1 })).toEqual({
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      portfolioId: 1,
      stockId: 1,
      volume: 1,
    });
  });
});

describe("patch", () => {
  test("valid data", async () => {
    setSystemTime(now);

    expect(patch({ volume: 1 })).toEqual({
      updatedAt: now.toISOString(),
      volume: 1,
    });
  });
});
