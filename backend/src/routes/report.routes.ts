import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import {
  getDashboardReport,
  getInventoryReport,
  getProfitReport,
  getSalesReport
} from "../services/report.service";

const router = Router();

router.get("/dashboard", requireAuth, async (_req, res, next) => {
  try {
    res.json({ success: true, data: await getDashboardReport() });
  } catch (error) {
    next(error);
  }
});

router.get("/sales", requireAuth, async (req, res, next) => {
  try {
    const days = Number(req.query.days ?? 30);
    res.json({ success: true, data: await getSalesReport(days) });
  } catch (error) {
    next(error);
  }
});

router.get("/inventory", requireAuth, async (_req, res, next) => {
  try {
    res.json({ success: true, data: await getInventoryReport() });
  } catch (error) {
    next(error);
  }
});

router.get("/profit", requireAuth, async (req, res, next) => {
  try {
    const days = Number(req.query.days ?? 30);
    res.json({ success: true, data: await getProfitReport(days) });
  } catch (error) {
    next(error);
  }
});

export default router;
