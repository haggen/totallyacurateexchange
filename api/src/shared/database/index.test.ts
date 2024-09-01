import { Database } from "bun:sqlite";
import { expect, test } from "bun:test";

import { open } from ".";

test("open", () => {
  const database = open(new URL("sqlite://"));
  expect(database).toBeInstanceOf(Database);
});
