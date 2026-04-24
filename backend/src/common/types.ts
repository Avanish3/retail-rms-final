import { Request } from "express";
import { UserRole } from "../entities/User";

export type AuthUser = {
  id: string;
  email: string;
  role: UserRole;
  storeId?: string | null;
};

export type AuthenticatedRequest = Request & {
  user?: AuthUser;
};
