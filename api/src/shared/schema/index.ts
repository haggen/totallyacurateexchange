import { DateTime } from "luxon";
import { z } from "zod";
import { squeeze } from "~/src/shared/string";

/**
 * Id schema.
 */
export const Id = z.coerce.number().gt(0);

/**
 * Email schema.
 */
export const Email = z.string().trim().toLowerCase().email();

/**
 * Password schema.
 */
export const Password = z.string().min(12);

/**
 * Name schema.
 */
export const Name = z.string().transform((value) => squeeze(String(value)));

/**
 * Automatic datetime schema.
 */
export const AutoDateTime = z
  .string()
  .datetime()
  .optional()
  .default(() => DateTime.now().toISO());
