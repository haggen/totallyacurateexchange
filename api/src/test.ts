import { setConfig } from "~/src/config";
import { prepare } from "~/src/database";

setConfig("databaseUrl", new URL("sqlite:///"));

prepare();
