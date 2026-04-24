import { Router } from "express";
import { AppDataSource } from "../config/data-source";
import { AuditLog } from "../entities/AuditLog";
import { Notification } from "../entities/Notification";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();

router.get("/notifications", requireAuth, async (_req, res, next) => {
  try {
    const notifications = await AppDataSource.getRepository(Notification).find({
      order: { createdAt: "DESC" }
    });
    res.json({ success: true, data: notifications });
  } catch (error) {
    next(error);
  }
});

router.get("/audit-logs", requireAuth, async (_req, res, next) => {
  try {
    const auditLogs = await AppDataSource.getRepository(AuditLog).find({
      relations: {
        user: true
      },
      order: { createdAt: "DESC" }
    });
    res.json({ success: true, data: auditLogs });
  } catch (error) {
    next(error);
  }
});

export default router;
