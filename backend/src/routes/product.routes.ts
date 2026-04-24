import { Router } from "express";
import { z } from "zod";
import { AppDataSource } from "../config/data-source";
import { Product } from "../entities/Product";
import { UserRole } from "../entities/User";
import { allowRoles, requireAuth } from "../middleware/auth.middleware";
import { validateBody } from "../utils/validation";
import { createAuditLog } from "../services/audit.service";
import { AuthenticatedRequest } from "../common/types";
import { AppError } from "../common/errors";

const router = Router();

const productSchema = z.object({
  productId: z.string().min(3),
  name: z.string().min(2),
  price: z.number().nonnegative(),
  costPrice: z.number().nonnegative().default(0),
  category: z.string().min(2),
  barcode: z.string().optional(),
  reorderLevel: z.number().int().nonnegative().default(10),
  description: z.string().optional(),
  isActive: z.boolean().optional()
});

const updateProductSchema = productSchema.partial();

router.get("/", requireAuth, async (_req, res, next) => {
  try {
    const products = await AppDataSource.getRepository(Product).find({
      order: { createdAt: "DESC" }
    });
    res.json({ success: true, data: products });
  } catch (error) {
    next(error);
  }
});

router.post(
  "/",
  requireAuth,
  allowRoles(UserRole.ADMIN, UserRole.MANAGER),
  validateBody(productSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const repository = AppDataSource.getRepository(Product);
      const product = repository.create({
        ...req.body,
        barcode: req.body.barcode ?? null,
        description: req.body.description ?? null
      } as Partial<Product>);
      const saved = await repository.save(product);

      await createAuditLog({
        action: "CREATE_PRODUCT",
        entityType: "Product",
        entityId: saved.id,
        metadata: { productId: saved.productId, name: saved.name },
        userId: req.user?.id
      });

      res.status(201).json({ success: true, data: saved });
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  "/:id",
  requireAuth,
  allowRoles(UserRole.ADMIN, UserRole.MANAGER),
  validateBody(updateProductSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const repository = AppDataSource.getRepository(Product);
      const product = await repository.findOne({ where: { id: String(req.params.id) } });
      if (!product) {
        throw new AppError(404, "Product not found");
      }

      repository.merge(product, req.body as Partial<Product>);
      const saved = await repository.save(product);

      await createAuditLog({
        action: "UPDATE_PRODUCT",
        entityType: "Product",
        entityId: saved.id,
        metadata: req.body,
        userId: req.user?.id
      });

      res.json({ success: true, data: saved });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
