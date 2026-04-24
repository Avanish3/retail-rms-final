import { Router } from "express";
import { z } from "zod";
import { AppDataSource } from "../config/data-source";
import { AppError } from "../common/errors";
import { User, UserRole } from "../entities/User";
import { comparePassword, hashPassword } from "../utils/password";
import { signToken } from "../utils/jwt";
import { validateBody } from "../utils/validation";
import { createAuditLog } from "../services/audit.service";
import { Store } from "../entities/Store";

const router = Router();

const registerSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.nativeEnum(UserRole).optional(),
  storeId: z.string().uuid().optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

router.post("/register", validateBody(registerSchema), async (req, res, next) => {
  try {
    const userRepository = AppDataSource.getRepository(User);
    const storeRepository = AppDataSource.getRepository(Store);
    const existing = await userRepository.findOne({ where: { email: req.body.email } });
    const requestedRole = req.body.role ?? UserRole.CASHIER;

    if (existing) {
      throw new AppError(409, "User already exists");
    }

    if (requestedRole === UserRole.ADMIN) {
      throw new AppError(403, "Public signup cannot create admin users");
    }

    const store = req.body.storeId
      ? await storeRepository.findOne({ where: { id: req.body.storeId } })
      : null;

    if (req.body.storeId && !store) {
      throw new AppError(404, "Store not found");
    }

    const user = userRepository.create({
      fullName: req.body.fullName,
      email: req.body.email,
      passwordHash: await hashPassword(req.body.password),
      role: requestedRole,
      store
    });

    const savedUser = await userRepository.save(user);
    await createAuditLog({
      action: "REGISTER_USER",
      entityType: "User",
      entityId: savedUser.id,
      metadata: { email: savedUser.email, role: savedUser.role }
    });

    res.status(201).json({
      success: true,
      data: {
        id: savedUser.id,
        fullName: savedUser.fullName,
        email: savedUser.email,
        role: savedUser.role
      }
    });
  } catch (error) {
    next(error);
  }
});

router.post("/login", validateBody(loginSchema), async (req, res, next) => {
  try {
    const repository = AppDataSource.getRepository(User);
    const user = await repository.findOne({
      where: { email: req.body.email },
      relations: { store: true }
    });

    if (!user || !(await comparePassword(req.body.password, user.passwordHash))) {
      throw new AppError(401, "Invalid email or password");
    }

    const token = signToken({
      id: user.id,
      email: user.email,
      role: user.role,
      storeId: user.store?.id ?? null
    });

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          store: user.store
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
