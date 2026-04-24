import { Router } from "express";
import { z } from "zod";
import { AppDataSource } from "../config/data-source";
import { AppError } from "../common/errors";
import { AuthenticatedRequest } from "../common/types";
import { Store } from "../entities/Store";
import { User, UserRole } from "../entities/User";
import { allowRoles, requireAuth } from "../middleware/auth.middleware";
import { createAuditLog } from "../services/audit.service";
import { hashPassword } from "../utils/password";
import { validateBody } from "../utils/validation";

const router = Router();

const createUserSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.nativeEnum(UserRole),
  storeId: z.string().uuid().optional()
});

router.get("/", requireAuth, allowRoles(UserRole.ADMIN), async (_req, res, next) => {
  try {
    const users = await AppDataSource.getRepository(User).find({
      relations: { store: true },
      order: { createdAt: "DESC" }
    });

    res.json({
      success: true,
      data: users.map((user) => ({
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        store: user.store,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }))
    });
  } catch (error) {
    next(error);
  }
});

router.post(
  "/",
  requireAuth,
  allowRoles(UserRole.ADMIN),
  validateBody(createUserSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const userRepository = AppDataSource.getRepository(User);
      const storeRepository = AppDataSource.getRepository(Store);

      const existing = await userRepository.findOne({ where: { email: req.body.email } });
      if (existing) {
        throw new AppError(409, "User already exists");
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
        role: req.body.role,
        store
      });

      const savedUser = await userRepository.save(user);

      await createAuditLog({
        action: "ADMIN_CREATE_USER",
        entityType: "User",
        entityId: savedUser.id,
        metadata: { email: savedUser.email, role: savedUser.role },
        userId: req.user?.id
      });

      res.status(201).json({
        success: true,
        data: {
          id: savedUser.id,
          fullName: savedUser.fullName,
          email: savedUser.email,
          role: savedUser.role,
          store: savedUser.store,
          createdAt: savedUser.createdAt,
          updatedAt: savedUser.updatedAt
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
