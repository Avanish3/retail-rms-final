"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const helmet_1 = __importDefault(require("helmet"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const billing_routes_1 = __importDefault(require("./routes/billing.routes"));
const customer_routes_1 = __importDefault(require("./routes/customer.routes"));
const inventory_routes_1 = __importDefault(require("./routes/inventory.routes"));
const ops_routes_1 = __importDefault(require("./routes/ops.routes"));
const order_routes_1 = __importDefault(require("./routes/order.routes"));
const product_routes_1 = __importDefault(require("./routes/product.routes"));
const report_routes_1 = __importDefault(require("./routes/report.routes"));
const store_routes_1 = __importDefault(require("./routes/store.routes"));
const ai_routes_1 = __importDefault(require("./routes/ai.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const swagger_1 = require("./config/swagger");
const error_middleware_1 = require("./middleware/error.middleware");
const not_found_middleware_1 = require("./middleware/not-found.middleware");
function createApp() {
    const app = (0, express_1.default)();
    const frontendPath = path_1.default.resolve(__dirname, "../../frontend");
    const frontendIndexPath = path_1.default.join(frontendPath, "index.html");
    app.use((0, helmet_1.default)());
    app.use((0, cors_1.default)());
    app.use(express_1.default.json({ limit: "1mb" }));
    app.use((0, express_rate_limit_1.default)({
        windowMs: 15 * 60 * 1000,
        limit: 300,
        standardHeaders: true,
        legacyHeaders: false
    }));
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
    app.use("/api/auth", auth_routes_1.default);
    app.use("/api/stores", store_routes_1.default);
    app.use("/api/products", product_routes_1.default);
    app.use("/api/inventory", inventory_routes_1.default);
    app.use("/api/customers", customer_routes_1.default);
    app.use("/api/orders", order_routes_1.default);
    app.use("/api/billing", billing_routes_1.default);
    app.use("/api/reports", report_routes_1.default);
    app.use("/api/ai", ai_routes_1.default);
    app.use("/api/ops", ops_routes_1.default);
    app.use("/api/users", user_routes_1.default);
    app.use("/app", express_1.default.static(frontendPath));
    app.get("/app", (_req, res) => {
        res.redirect(301, "/app/");
    });
    app.get("/app/*", (req, res, next) => {
        if (path_1.default.extname(req.path)) {
            next();
            return;
        }
        res.sendFile(frontendIndexPath);
    });
    (0, swagger_1.configureSwagger)(app);
    app.use(not_found_middleware_1.notFoundHandler);
    app.use(error_middleware_1.errorHandler);
    return app;
}
