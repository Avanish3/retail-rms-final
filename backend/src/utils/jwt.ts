import jwt, { Secret, SignOptions } from "jsonwebtoken";
import { env } from "../config/env";
import { AuthUser } from "../common/types";

export function signToken(user: AuthUser) {
  const options: SignOptions = {
    expiresIn: env.jwtExpiresIn as SignOptions["expiresIn"]
  };
  return jwt.sign(user, env.jwtSecret as Secret, options);
}

export function verifyToken(token: string) {
  return jwt.verify(token, env.jwtSecret as Secret) as AuthUser;
}
