"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const data_source_1 = require("../config/data-source");
const Product_1 = require("../entities/Product");
const User_1 = require("../entities/User");
const auth_middleware_1 = require("../middleware/auth.middleware");
const validation_1 = require("../utils/validation");
const audit_service_1 = require("../services/audit.service");
const errors_1 = require("../common/errors");
const router = (0, express_1.Router)();
const productSchema = zod_1.z.object({
    productId: zod_1.z.string().min(3),
    name: zod_1.z.string().min(2),
    price: zod_1.z.number().nonnegative(),
    costPrice: zod_1.z.number().nonnegative().default(0),
    category: zod_1.z.string().min(2),
    barcode: zod_1.z.string().optional(),
    reorderLevel: zod_1.z.number().int().nonnegative().default(10),
    description: zod_1.z.string().optional(),
    isActive: zod_1.z.boolean().optional()
});
const updateProductSchema = productSchema.partial();
router.get("/", auth_middleware_1.requireAuth, async (_req, res, next) => {
    try {
        const products = await data_source_1.AppDataSource.getRepository(Product_1.Product).find({
            order: { createdAt: "DESC" }
        });
        res.json({ success: true, data: products });
    }
    catch (error) {
        next(error);
    }
});
router.post("/", auth_middleware_1.requireAuth, (0, auth_middleware_1.allowRoles)(User_1.UserRole.ADMIN, User_1.UserRole.MANAGER), (0, validation_1.validateBody)(productSchema), async (req, res, next) => {
    try {
        const repository = data_source_1.AppDataSource.getRepository(Product_1.Product);
        const product = repository.create({
            ...req.body,
            barcode: req.body.barcode ?? null,
            description: req.body.description ?? null
        });
        const saved = await repository.save(product);
        await (0, audit_service_1.createAuditLog)({
            action: "CREATE_PRODUCT",
            entityType: "Product",
            entityId: saved.id,
            metadata: { productId: saved.productId, name: saved.name },
            userId: req.user?.id
        });
        res.status(201).json({ success: true, data: saved });
    }
    catch (error) {
        next(error);
    }
});
router.patch("/:id", auth_middleware_1.requireAuth, (0, auth_middleware_1.allowRoles)(User_1.UserRole.ADMIN, User_1.UserRole.MANAGER), (0, validation_1.validateBody)(updateProductSchema), async (req, res, next) => {
    try {
        const repository = data_source_1.AppDataSource.getRepository(Product_1.Product);
        const product = await repository.findOne({ where: { id: String(req.params.id) } });
        if (!product) {
            throw new errors_1.AppError(404, "Product not found");
        }
        repository.merge(product, req.body);
        const saved = await repository.save(product);
        await (0, audit_service_1.createAuditLog)({
            action: "UPDATE_PRODUCT",
            entityType: "Product",
            entityId: saved.id,
            metadata: req.body,
            userId: req.user?.id
        });
        res.json({ success: true, data: saved });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
