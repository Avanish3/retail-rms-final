import { Router } from "express";
import { z } from "zod";
import { AppDataSource } from "../config/data-source";
import { AppError } from "../common/errors";
import { AuthenticatedRequest } from "../common/types";
import { Customer } from "../entities/Customer";
import { allowRoles, requireAuth } from "../middleware/auth.middleware";
import { UserRole } from "../entities/User";
import { createAuditLog } from "../services/audit.service";
import { validateBody } from "../utils/validation";

const router = Router();

const customerSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(8),
  email: z.string().email().optional(),
  address: z.string().optional()
});

router.get("/", requireAuth, async (_req, res, next) => {
  try {
    const customers = await AppDataSource.getRepository(Customer).find({
      order: { updatedAt: "DESC" }
    });
    res.json({ success: true, data: customers });
  } catch (error) {
    next(error);
  }
});

router.get("/:id/history", requireAuth, async (req, res, next) => {
  try {
    const customer = await AppDataSource.getRepository(Customer).findOne({
      where: { id: String(req.params.id) },
      relations: {
        orders: {
          items: {
            product: true
          },
          payments: true
        }
      }
    });
    if (!customer) {
      throw new AppError(404, "Customer not found");
    }
    res.json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
});

router.post(
  "/",
  requireAuth,
  allowRoles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER),
  validateBody(customerSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const repository = AppDataSource.getRepository(Customer);
      const customer = repository.create({
        ...req.body,
        email: req.body.email ?? null,
        address: req.body.address ?? null
      } as Partial<Customer>);
      const saved = await repository.save(customer);

      await createAuditLog({
        action: "CREATE_CUSTOMER",
        entityType: "Customer",
        entityId: saved.id,
        metadata: { phone: saved.phone },
        userId: req.user?.id
      });

      res.status(201).json({ success: true, data: saved });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
