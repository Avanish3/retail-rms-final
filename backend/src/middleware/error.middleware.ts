import { NextFunction, Request, Response } from "express";
import { AppError } from "../common/errors";

export function errorHandler(error: Error, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
      details: error.details ?? null
    });
  }

  console.error(error);
  return res.status(500).json({
    success: false,
    message: "Internal server error"
  });
}
