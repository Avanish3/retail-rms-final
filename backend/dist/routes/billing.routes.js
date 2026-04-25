"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const Order_1 = require("../entities/Order");
const Payment_1 = require("../entities/Payment");
const User_1 = require("../entities/User");
const auth_middleware_1 = require("../middleware/auth.middleware");
const order_service_1 = require("../services/order.service");
const validation_1 = require("../utils/validation");
const router = (0, express_1.Router)();
const billSchema = zod_1.z.object({
    storeId: zod_1.z.string().uuid(),
    customerId: zod_1.z.string().uuid().optional(),
    discountAmount: zod_1.z.number().nonnegative().optional(),
    taxRate: zod_1.z.number().nonnegative().optional(),
    notes: zod_1.z.string().optional(),
    items: zod_1.z
        .array(zod_1.z.object({
        productId: zod_1.z.string().uuid(),
        quantity: zod_1.z.number().int().positive(),
        unitPrice: zod_1.z.number().nonnegative().optional(),
        taxRate: zod_1.z.number().nonnegative().optional()
    }))
        .min(1),
    payments: zod_1.z
        .array(zod_1.z.object({
        method: zod_1.z.nativeEnum(Payment_1.PaymentMethod),
        amount: zod_1.z.number().positive(),
        reference: zod_1.z.string().optional()
    }))
        .min(1)
});
router.post("/", auth_middleware_1.requireAuth, (0, auth_middleware_1.allowRoles)(User_1.UserRole.ADMIN, User_1.UserRole.MANAGER, User_1.UserRole.CASHIER), (0, validation_1.validateBody)(billSchema), async (req, res, next) => {
    try {
        const order = await (0, order_service_1.createOrder)({
            ...req.body,
            type: Order_1.OrderType.SALE,
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
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
