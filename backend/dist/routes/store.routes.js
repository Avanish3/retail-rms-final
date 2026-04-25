"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const data_source_1 = require("../config/data-source");
const Store_1 = require("../entities/Store");
const auth_middleware_1 = require("../middleware/auth.middleware");
const User_1 = require("../entities/User");
const validation_1 = require("../utils/validation");
const audit_service_1 = require("../services/audit.service");
const router = (0, express_1.Router)();
const storeSchema = zod_1.z.object({
    code: zod_1.z.string().min(2),
    name: zod_1.z.string().min(2),
    city: zod_1.z.string().min(2),
    isActive: zod_1.z.boolean().optional()
});
router.get("/", auth_middleware_1.requireAuth, async (_req, res, next) => {
    try {
        const stores = await data_source_1.AppDataSource.getRepository(Store_1.Store).find({
            order: { createdAt: "DESC" }
        });
        res.json({ success: true, data: stores });
    }
    catch (error) {
        next(error);
    }
});
router.post("/", auth_middleware_1.requireAuth, (0, auth_middleware_1.allowRoles)(User_1.UserRole.ADMIN, User_1.UserRole.MANAGER), (0, validation_1.validateBody)(storeSchema), async (req, res, next) => {
    try {
        const repository = data_source_1.AppDataSource.getRepository(Store_1.Store);
        const store = repository.create(req.body);
        const saved = await repository.save(store);
        await (0, audit_service_1.createAuditLog)({
            action: "CREATE_STORE",
            entityType: "Store",
            entityId: saved.id,
            metadata: req.body,
            userId: req.user?.id
        });
        res.status(201).json({ success: true, data: saved });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
