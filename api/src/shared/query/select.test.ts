import { expect, test } from "bun:test";

import {
  from,
  groupBy,
  join,
  limit,
  offset,
  orderBy,
  select,
  where,
} from "./select";

test("select", () => {
  const query = select("a", "b", "c");
  expect(query.toString()).toEqual("SELECT a, b, c;");
});

test("from", () => {
  const query = from("table");
  expect(query.toString()).toEqual("FROM table;");
});

test("join", () => {
  const query = join("table ON table.a = table.b");
  expect(query.toString()).toEqual("JOIN table ON table.a = table.b;");
});

test("where", () => {
  const query = where("a = ? AND b = ?", 1, 2);
  expect(query.toString()).toEqual("WHERE a = ? AND b = ?;");
  expect(query.bindings).toEqual([1, 2]);
});

test("groupBy", () => {
  const query = groupBy("a", "b", "c");
  expect(query.toString()).toEqual("GROUP BY a, b, c;");
});

test("orderBy", () => {
  const query = orderBy("a", "b", "c");
  expect(query.toString()).toEqual("ORDER BY a, b, c;");
});

test("limit", () => {
  const query = limit(10);
  expect(query.toString()).toEqual("LIMIT 10;");
});

test("offset", () => {
  const query = offset(10);
  expect(query.toString()).toEqual("OFFSET 10;");
});

test("merge", () => {
  const query = select("a");
  query.merge(select("b"));
  query.merge(from("a"));
  query.merge(from("b"));
  query.merge(join("a ON a = a"));
  query.merge(join("b ON b = b"));
  query.merge(where("a = ?", 1));
  query.merge(where("b = ?", 2));
  query.merge(groupBy("a"));
  query.merge(groupBy("b"));
  query.merge(orderBy("a"));
  query.merge(orderBy("b"));
  query.merge(limit(10));
  query.merge(offset(10));
  expect(query.toString()).toEqual(
    "SELECT a, b FROM a, b JOIN a ON a = a JOIN b ON b = b WHERE a = ? AND b = ? GROUP BY a, b ORDER BY a, b LIMIT 10 OFFSET 10;",
  );
  expect(query.bindings).toEqual([1, 2]);
});
