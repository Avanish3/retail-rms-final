"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const data_source_1 = require("../config/data-source");
const errors_1 = require("../common/errors");
const Inventory_1 = require("../entities/Inventory");
const Product_1 = require("../entities/Product");
const Store_1 = require("../entities/Store");
const User_1 = require("../entities/User");
const auth_middleware_1 = require("../middleware/auth.middleware");
const audit_service_1 = require("../services/audit.service");
const notification_service_1 = require("../services/notification.service");
const validation_1 = require("../utils/validation");
const router = (0, express_1.Router)();
const upsertSchema = zod_1.z.object({
    productId: zod_1.z.string().uuid(),
    storeId: zod_1.z.string().uuid(),
    stock: zod_1.z.number().int().nonnegative(),
    reservedStock: zod_1.z.number().int().nonnegative().default(0),
    warehouseLocation: zod_1.z.string().optional()
});
router.get("/", auth_middleware_1.requireAuth, async (_req, res, next) => {
    try {
        const items = await data_source_1.AppDataSource.getRepository(Inventory_1.Inventory).find({
            relations: {
                product: true,
                store: true
            },
            order: { updatedAt: "DESC" }
        });
        res.json({ success: true, data: items });
    }
    catch (error) {
        next(error);
    }
});
router.get("/low-stock", auth_middleware_1.requireAuth, async (_req, res, next) => {
    try {
        const items = await data_source_1.AppDataSource.getRepository(Inventory_1.Inventory).find({
            relations: {
                product: true,
                store: true
            }
        });
        const lowStock = items.filter((item) => item.stock <= item.product.reorderLevel);
        res.json({ success: true, data: lowStock });
    }
    catch (error) {
        next(error);
    }
});
router.post("/upsert", auth_middleware_1.requireAuth, (0, auth_middleware_1.allowRoles)(User_1.UserRole.ADMIN, User_1.UserRole.MANAGER), (0, validation_1.validateBody)(upsertSchema), async (req, res, next) => {
    try {
        const inventoryRepository = data_source_1.AppDataSource.getRepository(Inventory_1.Inventory);
        const product = await data_source_1.AppDataSource.getRepository(Product_1.Product).findOne({
            where: { id: req.body.productId }
        });
        const store = await data_source_1.AppDataSource.getRepository(Store_1.Store).findOne({
            where: { id: req.body.storeId }
        });
        if (!product || !store) {
            throw new errors_1.AppError(404, "Product or store not found");
        }
        let inventory = await inventoryRepository.findOne({
            where: {
                product: { id: product.id },
                store: { id: store.id }
            },
            relations: {
                product: true,
                store: true
            }
        });
        if (!inventory) {
            inventory = inventoryRepository.create({
                product,
                store,
                stock: req.body.stock,
                reservedStock: req.body.reservedStock,
                warehouseLocation: req.body.warehouseLocation ?? "Main Warehouse",
                lastRestockedAt: new Date()
            });
        }
        else {
            inventory.stock = req.body.stock;
            inventory.reservedStock = req.body.reservedStock;
            inventory.warehouseLocation = req.body.warehouseLocation ?? inventory.warehouseLocation;
            inventory.lastRestockedAt = new Date();
        }
        const saved = await inventoryRepository.save(inventory);
        await (0, notification_service_1.syncLowStockNotifications)();
        await (0, audit_service_1.createAuditLog)({
            action: "UPSERT_INVENTORY",
            entityType: "Inventory",
            entityId: saved.id,
            metadata: {
                stock: saved.stock,
                productId: product.productId,
                store: store.name
            },
            userId: req.user?.id
        });
        res.status(201).json({ success: true, data: saved });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
