import { Router } from "express";
import { z } from "zod";
import { AuthenticatedRequest } from "../common/types";
import { OrderStatus, OrderType } from "../entities/Order";
import { PaymentMethod } from "../entities/Payment";
import { UserRole } from "../entities/User";
import { allowRoles, requireAuth } from "../middleware/auth.middleware";
import { createAuditLog } from "../services/audit.service";
import { createOrder, listOrders } from "../services/order.service";
import { validateBody } from "../utils/validation";

const router = Router();

const itemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative().optional(),
  taxRate: z.number().nonnegative().optional()
});

const paymentSchema = z.object({
  method: z.nativeEnum(PaymentMethod),
  amount: z.number().positive(),
  reference: z.string().optional()
});

const orderSchema = z.object({
  type: z.nativeEnum(OrderType),
  status: z.nativeEnum(OrderStatus).optional(),
  storeId: z.string().uuid(),
  customerId: z.string().uuid().optional(),
  supplierName: z.string().optional(),
  discountAmount: z.number().nonnegative().optional(),
  notes: z.string().optional(),
  taxRate: z.number().nonnegative().optional(),
  items: z.array(itemSchema).min(1),
  payments: z.array(paymentSchema).optional()
});

router.get("/", requireAuth, async (_req, res, next) => {
  try {
    const orders = await listOrders();
    res.json({ success: true, data: orders });
  } catch (error) {
    next(error);
  }
});

router.post(
  "/",
  requireAuth,
  allowRoles(UserRole.ADMIN, UserRole.MANAGER),
  validateBody(orderSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const order = await createOrder({
        ...req.body,
        createdById: req.user?.id
      });

      await createAuditLog({
        action: "CREATE_ORDER",
        entityType: "Order",
        entityId: order.id,
        metadata: {
          orderNumber: order.orderNumber,
          type: order.type
        },
        userId: req.user?.id
      });

      res.status(201).json({ success: true, data: order });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
