import type { RequestHandler } from "express";
import { param, validationResult } from "express-validator";

/** Returns 422 with the list of failed fields. Place after the validation chains. */
export const validate: RequestHandler = (req, res, next) => {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    res.status(422).json({
      error: "Validation failed",
      errors: result.array().map((e) => ({
        field: "path" in e ? e.path : "unknown",
        message: String(e.msg),
      })),
    });
    return;
  }
  next();
};

/** Rejects malformed :id params with 400 before they reach Postgres. */
export const uuidParam = (name = "id") => [
  param(name).isUUID().withMessage(`${name} must be a valid UUID`),
  validate,
];
