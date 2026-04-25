"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const data_source_1 = require("../config/data-source");
const errors_1 = require("../common/errors");
const Store_1 = require("../entities/Store");
const User_1 = require("../entities/User");
const auth_middleware_1 = require("../middleware/auth.middleware");
const audit_service_1 = require("../services/audit.service");
const password_1 = require("../utils/password");
const validation_1 = require("../utils/validation");
const router = (0, express_1.Router)();
const createUserSchema = zod_1.z.object({
    fullName: zod_1.z.string().min(2),
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
    role: zod_1.z.nativeEnum(User_1.UserRole),
    storeId: zod_1.z.string().uuid().optional()
});
router.get("/", auth_middleware_1.requireAuth, (0, auth_middleware_1.allowRoles)(User_1.UserRole.ADMIN), async (_req, res, next) => {
    try {
        const users = await data_source_1.AppDataSource.getRepository(User_1.User).find({
            relations: { store: true },
            order: { createdAt: "DESC" }
        });
        res.json({
            success: true,
            data: users.map((user) => ({
                id: user.id,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
                store: user.store,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt
            }))
        });
    }
    catch (error) {
        next(error);
    }
});
router.post("/", auth_middleware_1.requireAuth, (0, auth_middleware_1.allowRoles)(User_1.UserRole.ADMIN), (0, validation_1.validateBody)(createUserSchema), async (req, res, next) => {
    try {
        const userRepository = data_source_1.AppDataSource.getRepository(User_1.User);
        const storeRepository = data_source_1.AppDataSource.getRepository(Store_1.Store);
        const existing = await userRepository.findOne({ where: { email: req.body.email } });
        if (existing) {
            throw new errors_1.AppError(409, "User already exists");
        }
        const store = req.body.storeId
            ? await storeRepository.findOne({ where: { id: req.body.storeId } })
            : null;
        if (req.body.storeId && !store) {
            throw new errors_1.AppError(404, "Store not found");
        }
        const user = userRepository.create({
            fullName: req.body.fullName,
            email: req.body.email,
            passwordHash: await (0, password_1.hashPassword)(req.body.password),
            role: req.body.role,
            store
        });
        const savedUser = await userRepository.save(user);
        await (0, audit_service_1.createAuditLog)({
            action: "ADMIN_CREATE_USER",
            entityType: "User",
            entityId: savedUser.id,
            metadata: { email: savedUser.email, role: savedUser.role },
            userId: req.user?.id
        });
        res.status(201).json({
            success: true,
            data: {
                id: savedUser.id,
                fullName: savedUser.fullName,
                email: savedUser.email,
                role: savedUser.role,
                store: savedUser.store,
                createdAt: savedUser.createdAt,
                updatedAt: savedUser.updatedAt
            }
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
