import { Router } from "express";
import { z } from "zod";
import { AppDataSource } from "../config/data-source";
import { AppError } from "../common/errors";
import { AuthenticatedRequest } from "../common/types";
import { Inventory } from "../entities/Inventory";
import { Product } from "../entities/Product";
import { Store } from "../entities/Store";
import { UserRole } from "../entities/User";
import { allowRoles, requireAuth } from "../middleware/auth.middleware";
import { createAuditLog } from "../services/audit.service";
import { syncLowStockNotifications } from "../services/notification.service";
import { validateBody } from "../utils/validation";

const router = Router();

const upsertSchema = z.object({
  productId: z.string().uuid(),
  storeId: z.string().uuid(),
  stock: z.number().int().nonnegative(),
  reservedStock: z.number().int().nonnegative().default(0),
  warehouseLocation: z.string().optional()
});

router.get("/", requireAuth, async (_req, res, next) => {
  try {
    const items = await AppDataSource.getRepository(Inventory).find({
      relations: {
        product: true,
        store: true
      },
      order: { updatedAt: "DESC" }
    });
    res.json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
});

router.get("/low-stock", requireAuth, async (_req, res, next) => {
  try {
    const items = await AppDataSource.getRepository(Inventory).find({
      relations: {
        product: true,
        store: true
      }
    });
    const lowStock = items.filter((item) => item.stock <= item.product.reorderLevel);
    res.json({ success: true, data: lowStock });
  } catch (error) {
    next(error);
  }
});

router.post(
  "/upsert",
  requireAuth,
  allowRoles(UserRole.ADMIN, UserRole.MANAGER),
  validateBody(upsertSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const inventoryRepository = AppDataSource.getRepository(Inventory);
      const product = await AppDataSource.getRepository(Product).findOne({
        where: { id: req.body.productId }
      });
      const store = await AppDataSource.getRepository(Store).findOne({
        where: { id: req.body.storeId }
      });

      if (!product || !store) {
        throw new AppError(404, "Product or store not found");
      }

      let inventory = await inventoryRepository.findOne({
        where: {
          product: { id: product.id },
          store: { id: store.id }
        },
        relations: {
          product: true,
          store: true
        }
      });

      if (!inventory) {
        inventory = inventoryRepository.create({
          product,
          store,
          stock: req.body.stock,
          reservedStock: req.body.reservedStock,
          warehouseLocation: req.body.warehouseLocation ?? "Main Warehouse",
          lastRestockedAt: new Date()
        });
      } else {
        inventory.stock = req.body.stock;
        inventory.reservedStock = req.body.reservedStock;
        inventory.warehouseLocation = req.body.warehouseLocation ?? inventory.warehouseLocation;
        inventory.lastRestockedAt = new Date();
      }

      const saved = await inventoryRepository.save(inventory);
      await syncLowStockNotifications();
      await createAuditLog({
        action: "UPSERT_INVENTORY",
        entityType: "Inventory",
        entityId: saved.id,
        metadata: {
          stock: saved.stock,
          productId: product.productId,
          store: store.name
        },
        userId: req.user?.id
      });

      res.status(201).json({ success: true, data: saved });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
