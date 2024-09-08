/**
 * Unauthorized database operation.
 */
export class Unauthorized extends Error {
  constructor() {
    super("Unauthorized");
  }
}
