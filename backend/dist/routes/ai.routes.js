"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const errors_1 = require("../common/errors");
const auth_middleware_1 = require("../middleware/auth.middleware");
const ai_service_1 = require("../services/ai.service");
const router = (0, express_1.Router)();
router.get("/demand-forecast", auth_middleware_1.requireAuth, async (req, res, next) => {
    try {
        const productId = typeof req.query.productId === "string" ? req.query.productId : undefined;
        res.json({ success: true, data: await (0, ai_service_1.getDemandForecast)(productId) });
    }
    catch (error) {
        next(error);
    }
});
router.get("/inventory-alerts", auth_middleware_1.requireAuth, async (_req, res, next) => {
    try {
        res.json({ success: true, data: await (0, ai_service_1.getSmartInventoryAlerts)() });
    }
    catch (error) {
        next(error);
    }
});
router.get("/recommendations/:productId", auth_middleware_1.requireAuth, async (req, res, next) => {
    try {
        res.json({ success: true, data: await (0, ai_service_1.getRecommendations)(String(req.params.productId)) });
    }
    catch (error) {
        next(error);
    }
});
router.get("/fraud-detection", auth_middleware_1.requireAuth, async (_req, res, next) => {
    try {
        res.json({ success: true, data: await (0, ai_service_1.getFraudDetections)() });
    }
    catch (error) {
        next(error);
    }
});
router.get("/dynamic-pricing/:productId", auth_middleware_1.requireAuth, async (req, res, next) => {
    try {
        const pricing = await (0, ai_service_1.getDynamicPricing)(String(req.params.productId));
        if (!pricing) {
            throw new errors_1.AppError(404, "Product not found");
        }
        res.json({ success: true, data: pricing });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
