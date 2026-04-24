import { Router } from "express";
import { z } from "zod";
import { AuthenticatedRequest } from "../common/types";
import { OrderType } from "../entities/Order";
import { PaymentMethod } from "../entities/Payment";
import { UserRole } from "../entities/User";
import { allowRoles, requireAuth } from "../middleware/auth.middleware";
import { createOrder } from "../services/order.service";
import { validateBody } from "../utils/validation";

const router = Router();

const billSchema = z.object({
  storeId: z.string().uuid(),
  customerId: z.string().uuid().optional(),
  discountAmount: z.number().nonnegative().optional(),
  taxRate: z.number().nonnegative().optional(),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().positive(),
        unitPrice: z.number().nonnegative().optional(),
        taxRate: z.number().nonnegative().optional()
      })
    )
    .min(1),
  payments: z
    .array(
      z.object({
        method: z.nativeEnum(PaymentMethod),
        amount: z.number().positive(),
        reference: z.string().optional()
      })
    )
    .min(1)
});

router.post(
  "/",
  requireAuth,
  allowRoles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER),
  validateBody(billSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const order = await createOrder({
        ...req.body,
        type: OrderType.SALE,
        createdById: req.user?.id
      });

      res.status(201).json({
        success: true,
        data: {
          billId: order.id,
          invoiceNumber: order.orderNumber,
          totalAmount: order.totalAmount,
          taxAmount: order.taxAmount,
          items: order.items,
          payments: order.payments
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
