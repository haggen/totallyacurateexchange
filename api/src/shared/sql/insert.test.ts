// import { expect, test } from "bun:test";

// import { insert, values } from "./insert";

// test("insert", () => {
//   const query = insert("table");
//   expect(query.toString()).toEqual("INSERT INTO table;");
// });

// test("values", () => {
//   const query = values({ a: 1, b: 2 });
//   expect(query.toString()).toEqual("(a, b) VALUES ($a, $b);");
//   expect(query.bindings).toEqual({ a: 1, b: 2 });
// });

// test("merge", () => {
//   const query = insert("");
//   query.merge(insert("table"));
//   query.merge(values({ a: 1 }));
//   query.merge(values({ b: 2 }));
//   expect(query.toString()).toEqual("INSERT INTO table (a, b) VALUES ($a, $b);");
//   expect(query.bindings).toEqual({ a: 1, b: 2 });
// });
