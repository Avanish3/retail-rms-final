import bcrypt from "bcryptjs";

export async function hashPassword(value: string) {
  return bcrypt.hash(value, 10);
}

export async function comparePassword(value: string, hashed: string) {
  return bcrypt.compare(value, hashed);
}
