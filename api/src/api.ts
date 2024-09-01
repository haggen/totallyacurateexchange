import * as sessions from "~/src/modules/sessions/api";
import * as users from "~/src/modules/users/api";

// ORDER MATTERS! Migrations will run in order, so put dependencies first.
export const api = {
  users,
  sessions,
};
