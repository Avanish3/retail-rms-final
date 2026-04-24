import cors from "cors";
import express from "express";
import path from "path";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import authRoutes from "./routes/auth.routes";
import billingRoutes from "./routes/billing.routes";
import customerRoutes from "./routes/customer.routes";
import inventoryRoutes from "./routes/inventory.routes";
import opsRoutes from "./routes/ops.routes";
import orderRoutes from "./routes/order.routes";
import productRoutes from "./routes/product.routes";
import reportRoutes from "./routes/report.routes";
import storeRoutes from "./routes/store.routes";
import aiRoutes from "./routes/ai.routes";
import userRoutes from "./routes/user.routes";
import { configureSwagger } from "./config/swagger";
import { errorHandler } from "./middleware/error.middleware";
import { notFoundHandler } from "./middleware/not-found.middleware";

export function createApp() {
  const app = express();
  const frontendPath = path.resolve(__dirname, "../../frontend");

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 300,
      standardHeaders: true,
      legacyHeaders: false
    })
  );

  app.get("/", (_req, res) => {
    res.json({
      success: true,
      message: "Enterprise Retail RMS Backend server is running",
      docs: "/api-docs",
      health: "/health"
    });
  });

  app.get("/health", (_req, res) => {
    res.json({
      success: true,
      message: "Enterprise Retail RMS API is healthy"
    });
  });

  app.get("/api/database/schema", (_req, res) => {
    res.json({
      success: true,
      data: {
        tables: [
          "users",
          "stores",
          "products",
          "inventory",
          "customers",
          "orders",
          "order_items",
          "payments",
          "audit_logs",
          "notifications"
        ]
      }
    });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/stores", storeRoutes);
  app.use("/api/products", productRoutes);
  app.use("/api/inventory", inventoryRoutes);
  app.use("/api/customers", customerRoutes);
  app.use("/api/orders", orderRoutes);
  app.use("/api/billing", billingRoutes);
  app.use("/api/reports", reportRoutes);
  app.use("/api/ai", aiRoutes);
  app.use("/api/ops", opsRoutes);
  app.use("/api/users", userRoutes);
  app.use("/app", express.static(frontendPath));
  app.get("/app", (_req, res) => {
    res.redirect(301, "/app/");
  });

  configureSwagger(app);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
