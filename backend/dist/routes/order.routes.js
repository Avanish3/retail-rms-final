"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const Order_1 = require("../entities/Order");
const Payment_1 = require("../entities/Payment");
const User_1 = require("../entities/User");
const auth_middleware_1 = require("../middleware/auth.middleware");
const audit_service_1 = require("../services/audit.service");
const order_service_1 = require("../services/order.service");
const validation_1 = require("../utils/validation");
const router = (0, express_1.Router)();
const itemSchema = zod_1.z.object({
    productId: zod_1.z.string().uuid(),
    quantity: zod_1.z.number().int().positive(),
    unitPrice: zod_1.z.number().nonnegative().optional(),
    taxRate: zod_1.z.number().nonnegative().optional()
});
const paymentSchema = zod_1.z.object({
    method: zod_1.z.nativeEnum(Payment_1.PaymentMethod),
    amount: zod_1.z.number().positive(),
    reference: zod_1.z.string().optional()
});
const orderSchema = zod_1.z.object({
    type: zod_1.z.nativeEnum(Order_1.OrderType),
    status: zod_1.z.nativeEnum(Order_1.OrderStatus).optional(),
    storeId: zod_1.z.string().uuid(),
    customerId: zod_1.z.string().uuid().optional(),
    supplierName: zod_1.z.string().optional(),
    discountAmount: zod_1.z.number().nonnegative().optional(),
    notes: zod_1.z.string().optional(),
    taxRate: zod_1.z.number().nonnegative().optional(),
    items: zod_1.z.array(itemSchema).min(1),
    payments: zod_1.z.array(paymentSchema).optional()
});
router.get("/", auth_middleware_1.requireAuth, async (_req, res, next) => {
    try {
        const orders = await (0, order_service_1.listOrders)();
        res.json({ success: true, data: orders });
    }
    catch (error) {
        next(error);
    }
});
router.post("/", auth_middleware_1.requireAuth, (0, auth_middleware_1.allowRoles)(User_1.UserRole.ADMIN, User_1.UserRole.MANAGER), (0, validation_1.validateBody)(orderSchema), async (req, res, next) => {
    try {
        const order = await (0, order_service_1.createOrder)({
            ...req.body,
            createdById: req.user?.id
        });
        await (0, audit_service_1.createAuditLog)({
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
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
