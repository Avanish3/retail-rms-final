"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const report_service_1 = require("../services/report.service");
const router = (0, express_1.Router)();
router.get("/dashboard", auth_middleware_1.requireAuth, async (_req, res, next) => {
    try {
        res.json({ success: true, data: await (0, report_service_1.getDashboardReport)() });
    }
    catch (error) {
        next(error);
    }
});
router.get("/sales", auth_middleware_1.requireAuth, async (req, res, next) => {
    try {
        const days = Number(req.query.days ?? 30);
        res.json({ success: true, data: await (0, report_service_1.getSalesReport)(days) });
    }
    catch (error) {
        next(error);
    }
});
router.get("/inventory", auth_middleware_1.requireAuth, async (_req, res, next) => {
    try {
        res.json({ success: true, data: await (0, report_service_1.getInventoryReport)() });
    }
    catch (error) {
        next(error);
    }
});
router.get("/profit", auth_middleware_1.requireAuth, async (req, res, next) => {
    try {
        const days = Number(req.query.days ?? 30);
        res.json({ success: true, data: await (0, report_service_1.getProfitReport)(days) });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
