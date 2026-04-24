import { NextFunction, Response } from "express";
import { AppError } from "../common/errors";
import { AuthenticatedRequest } from "../common/types";
import { UserRole } from "../entities/User";
import { verifyToken } from "../utils/jwt";

export function requireAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(new AppError(401, "Missing or invalid authorization header"));
  }

  try {
    req.user = verifyToken(header.slice(7));
    next();
  } catch {
    next(new AppError(401, "Invalid or expired token"));
  }
}

export function allowRoles(...roles: UserRole[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError(401, "Unauthorized"));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, "Forbidden for this role"));
    }

    next();
  };
}
