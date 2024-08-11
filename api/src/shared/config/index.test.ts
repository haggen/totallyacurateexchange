import { expect, test } from "bun:test";

import { getConfig, setConfig } from ".";

test("getConfig", () => {
  expect(getConfig()).toEqual({ env: "test", databaseUrl: expect.any(URL) });
  expect(getConfig("env")).toBe("test");
});

test("setConfig", () => {
  const url = new URL("sqlite:///test.sqlite");
  setConfig("databaseUrl", url);

  expect(getConfig("databaseUrl")).toEqual(url);
});
