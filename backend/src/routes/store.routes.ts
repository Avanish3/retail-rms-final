import { Router } from "express";
import { z } from "zod";
import { AppDataSource } from "../config/data-source";
import { Store } from "../entities/Store";
import { allowRoles, requireAuth } from "../middleware/auth.middleware";
import { UserRole } from "../entities/User";
import { validateBody } from "../utils/validation";
import { createAuditLog } from "../services/audit.service";
import { AuthenticatedRequest } from "../common/types";

const router = Router();

const storeSchema = z.object({
  code: z.string().min(2),
  name: z.string().min(2),
  city: z.string().min(2),
  isActive: z.boolean().optional()
});

router.get("/", requireAuth, async (_req, res, next) => {
  try {
    const stores = await AppDataSource.getRepository(Store).find({
      order: { createdAt: "DESC" }
    });
    res.json({ success: true, data: stores });
  } catch (error) {
    next(error);
  }
});

router.post(
  "/",
  requireAuth,
  allowRoles(UserRole.ADMIN, UserRole.MANAGER),
  validateBody(storeSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const repository = AppDataSource.getRepository(Store);
      const store = repository.create(req.body as Partial<Store>);
      const saved = await repository.save(store);

      await createAuditLog({
        action: "CREATE_STORE",
        entityType: "Store",
        entityId: saved.id,
        metadata: req.body,
        userId: req.user?.id
      });

      res.status(201).json({ success: true, data: saved });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
