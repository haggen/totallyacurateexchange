import { expect, test } from "bun:test";

import { getUpdateSet } from "./update";

test("getUpdateValues", () => {
  const values = getUpdateSet({
    a: 1,
    b: 2,
    c: undefined,
  });

  expect(values).toEqual("a = $a, b = $b");
});
