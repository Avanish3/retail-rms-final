"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const data_source_1 = require("../config/data-source");
const AuditLog_1 = require("../entities/AuditLog");
const Notification_1 = require("../entities/Notification");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.get("/notifications", auth_middleware_1.requireAuth, async (_req, res, next) => {
    try {
        const notifications = await data_source_1.AppDataSource.getRepository(Notification_1.Notification).find({
            order: { createdAt: "DESC" }
        });
        res.json({ success: true, data: notifications });
    }
    catch (error) {
        next(error);
    }
});
router.get("/audit-logs", auth_middleware_1.requireAuth, async (_req, res, next) => {
    try {
        const auditLogs = await data_source_1.AppDataSource.getRepository(AuditLog_1.AuditLog).find({
            relations: {
                user: true
            },
            order: { createdAt: "DESC" }
        });
        res.json({ success: true, data: auditLogs });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
