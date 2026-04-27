"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const data_source_1 = require("../config/data-source");
const errors_1 = require("../common/errors");
const User_1 = require("../entities/User");
const password_1 = require("../utils/password");
const jwt_1 = require("../utils/jwt");
const validation_1 = require("../utils/validation");
const audit_service_1 = require("../services/audit.service");
const Store_1 = require("../entities/Store");
const router = (0, express_1.Router)();
const registerSchema = zod_1.z.object({
    fullName: zod_1.z.string().min(2),
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
    role: zod_1.z.nativeEnum(User_1.UserRole).optional(),
    storeId: zod_1.z.string().uuid().optional()
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6)
});
router.post("/register", (0, validation_1.validateBody)(registerSchema), async (req, res, next) => {
    try {
        const userRepository = data_source_1.AppDataSource.getRepository(User_1.User);
        const storeRepository = data_source_1.AppDataSource.getRepository(Store_1.Store);
        const email = req.body.email.trim().toLowerCase();
        const existing = await userRepository.findOne({ where: { email } });
        const requestedRole = req.body.role ?? User_1.UserRole.CASHIER;
        if (existing) {
            throw new errors_1.AppError(409, "User already exists");
        }
        if (requestedRole === User_1.UserRole.ADMIN) {
            throw new errors_1.AppError(403, "Public signup cannot create admin users");
        }
        const store = req.body.storeId
            ? await storeRepository.findOne({ where: { id: req.body.storeId } })
            : null;
        if (req.body.storeId && !store) {
            throw new errors_1.AppError(404, "Store not found");
        }
        const user = userRepository.create({
            fullName: req.body.fullName,
            email,
            passwordHash: await (0, password_1.hashPassword)(req.body.password),
            role: requestedRole,
            store
        });
        const savedUser = await userRepository.save(user);
        await (0, audit_service_1.createAuditLog)({
            action: "REGISTER_USER",
            entityType: "User",
            entityId: savedUser.id,
            metadata: { email: savedUser.email, role: savedUser.role }
        });
        res.status(201).json({
            success: true,
            data: {
                id: savedUser.id,
                fullName: savedUser.fullName,
                email: savedUser.email,
                role: savedUser.role
            }
        });
    }
    catch (error) {
        next(error);
    }
});
router.post("/login", (0, validation_1.validateBody)(loginSchema), async (req, res, next) => {
    try {
        const repository = data_source_1.AppDataSource.getRepository(User_1.User);
        const email = req.body.email.trim().toLowerCase();
        const user = await repository.findOne({
            where: { email },
            relations: { store: true }
        });
        if (!user || !(await (0, password_1.comparePassword)(req.body.password, user.passwordHash))) {
            throw new errors_1.AppError(401, "Invalid email or password");
        }
        const token = (0, jwt_1.signToken)({
            id: user.id,
            email: user.email,
            role: user.role,
            storeId: user.store?.id ?? null
        });
        res.json({
            success: true,
            data: {
                token,
                user: {
                    id: user.id,
                    fullName: user.fullName,
                    email: user.email,
                    role: user.role,
                    store: user.store
                }
            }
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
