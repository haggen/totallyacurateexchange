import * as sessions from "~/src/modules/sessions/api";
import * as users from "~/src/modules/users/api";

// ORDER MATTERS!
export const api = {
  users,
  sessions,
};
