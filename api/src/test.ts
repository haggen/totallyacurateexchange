import { beforeAll } from "bun:test";
import { setConfig } from "./shared/config";

// Use in memory database.
setConfig("databaseUrl", new URL("sqlite:///"));

beforeAll(() => {
  require("~/src/migrate");
});
