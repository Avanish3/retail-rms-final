"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const data_source_1 = require("../config/data-source");
const errors_1 = require("../common/errors");
const Customer_1 = require("../entities/Customer");
const auth_middleware_1 = require("../middleware/auth.middleware");
const User_1 = require("../entities/User");
const audit_service_1 = require("../services/audit.service");
const validation_1 = require("../utils/validation");
const router = (0, express_1.Router)();
const customerSchema = zod_1.z.object({
    name: zod_1.z.string().min(2),
    phone: zod_1.z.string().min(8),
    email: zod_1.z.string().email().optional(),
    address: zod_1.z.string().optional()
});
router.get("/", auth_middleware_1.requireAuth, async (_req, res, next) => {
    try {
        const customers = await data_source_1.AppDataSource.getRepository(Customer_1.Customer).find({
            order: { updatedAt: "DESC" }
        });
        res.json({ success: true, data: customers });
    }
    catch (error) {
        next(error);
    }
});
router.get("/:id/history", auth_middleware_1.requireAuth, async (req, res, next) => {
    try {
        const customer = await data_source_1.AppDataSource.getRepository(Customer_1.Customer).findOne({
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
            throw new errors_1.AppError(404, "Customer not found");
        }
        res.json({ success: true, data: customer });
    }
    catch (error) {
        next(error);
    }
});
router.post("/", auth_middleware_1.requireAuth, (0, auth_middleware_1.allowRoles)(User_1.UserRole.ADMIN, User_1.UserRole.MANAGER, User_1.UserRole.CASHIER), (0, validation_1.validateBody)(customerSchema), async (req, res, next) => {
    try {
        const repository = data_source_1.AppDataSource.getRepository(Customer_1.Customer);
        const customer = repository.create({
            ...req.body,
            email: req.body.email ?? null,
            address: req.body.address ?? null
        });
        const saved = await repository.save(customer);
        await (0, audit_service_1.createAuditLog)({
            action: "CREATE_CUSTOMER",
            entityType: "Customer",
            entityId: saved.id,
            metadata: { phone: saved.phone },
            userId: req.user?.id
        });
        res.status(201).json({ success: true, data: saved });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
