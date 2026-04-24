import { NextFunction, Request, Response } from "express";
import { ZodSchema } from "zod";
import { AppError } from "../common/errors";

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return next(new AppError(400, "Validation failed", result.error.flatten()));
    }

    req.body = result.data;
    next();
  };
}
