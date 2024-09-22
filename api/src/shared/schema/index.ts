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
  .default(() => DateTime.utc().toISO());

/**
 * Parse boolan-like strings. Fit for parsing parameters.
 */
export const Boolish = z
  .union([z.string(), z.number(), z.boolean()])
  .transform((value) => {
    if (typeof value === "string") {
      return /^(t(rue)?|y(es)?|1|on)$/.test(value.trim().toLowerCase());
    }
    return !!value;
  });
