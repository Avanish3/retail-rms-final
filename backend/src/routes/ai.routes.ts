import { Router } from "express";
import { AppError } from "../common/errors";
import { requireAuth } from "../middleware/auth.middleware";
import {
  getDemandForecast,
  getDynamicPricing,
  getFraudDetections,
  getRecommendations,
  getSmartInventoryAlerts
} from "../services/ai.service";

const router = Router();

router.get("/demand-forecast", requireAuth, async (req, res, next) => {
  try {
    const productId = typeof req.query.productId === "string" ? req.query.productId : undefined;
    res.json({ success: true, data: await getDemandForecast(productId) });
  } catch (error) {
    next(error);
  }
});

router.get("/inventory-alerts", requireAuth, async (_req, res, next) => {
  try {
    res.json({ success: true, data: await getSmartInventoryAlerts() });
  } catch (error) {
    next(error);
  }
});

router.get("/recommendations/:productId", requireAuth, async (req, res, next) => {
  try {
    res.json({ success: true, data: await getRecommendations(String(req.params.productId)) });
  } catch (error) {
    next(error);
  }
});

router.get("/fraud-detection", requireAuth, async (_req, res, next) => {
  try {
    res.json({ success: true, data: await getFraudDetections() });
  } catch (error) {
    next(error);
  }
});

router.get("/dynamic-pricing/:productId", requireAuth, async (req, res, next) => {
  try {
    const pricing = await getDynamicPricing(String(req.params.productId));
    if (!pricing) {
      throw new AppError(404, "Product not found");
    }
    res.json({ success: true, data: pricing });
  } catch (error) {
    next(error);
  }
});

export default router;
