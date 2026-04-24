import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { Express } from "express";

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Enterprise Retail RMS API",
      version: "1.0.0",
      description:
        "Backend API for an enterprise-ready Retail Management System covering auth, inventory, POS, orders, reports, notifications, audit logs, and AI insights."
    },
    servers: [
      {
        url: "http://localhost:4000/api",
        description: "Local development server"
      }
    ],
    tags: [
      { name: "Auth" },
      { name: "Stores" },
      { name: "Products" },
      { name: "Inventory" },
      { name: "Customers" },
      { name: "Orders" },
      { name: "Billing" },
      { name: "Reports" },
      { name: "AI" },
      { name: "Operations" }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT"
        }
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            fullName: { type: "string" },
            email: { type: "string" },
            role: { type: "string", enum: ["ADMIN", "MANAGER", "CASHIER"] },
            createdAt: { type: "string", format: "date-time" }
          }
        },
        Store: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            code: { type: "string", example: "BLR-001" },
            name: { type: "string", example: "Bangalore Central" },
            city: { type: "string", example: "Bangalore" },
            isActive: { type: "boolean" }
          }
        },
        Product: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            productId: { type: "string", example: "PRD001" },
            name: { type: "string", example: "Laptop" },
            price: { type: "number", example: 50000 },
            costPrice: { type: "number", example: 42000 },
            category: { type: "string", example: "Electronics" },
            barcode: { type: "string", nullable: true },
            reorderLevel: { type: "integer", example: 20 },
            description: { type: "string", nullable: true }
          }
        },
        Inventory: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            stock: { type: "integer" },
            reservedStock: { type: "integer" },
            warehouseLocation: { type: "string", nullable: true },
            product: { "$ref": "#/components/schemas/Product" },
            store: { "$ref": "#/components/schemas/Store" }
          }
        },
        Customer: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string" },
            phone: { type: "string" },
            email: { type: "string", nullable: true },
            totalSpent: { type: "number" }
          }
        },
        OrderItem: {
          type: "object",
          properties: {
            product: { "$ref": "#/components/schemas/Product" },
            quantity: { type: "integer" },
            unitPrice: { type: "number" },
            taxRate: { type: "number" },
            lineTotal: { type: "number" }
          }
        },
        Payment: {
          type: "object",
          properties: {
            method: { type: "string", enum: ["CASH", "CARD", "UPI", "BANK_TRANSFER"] },
            amount: { type: "number" },
            reference: { type: "string", nullable: true }
          }
        },
        Order: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            orderNumber: { type: "string" },
            type: { type: "string", enum: ["SALE", "SUPPLY"] },
            status: { type: "string", enum: ["PENDING", "APPROVED", "COMPLETED", "CANCELLED"] },
            subTotal: { type: "number" },
            taxAmount: { type: "number" },
            totalAmount: { type: "number" },
            discountAmount: { type: "number" },
            store: { "$ref": "#/components/schemas/Store" },
            customer: { "$ref": "#/components/schemas/Customer" },
            items: {
              type: "array",
              items: { "$ref": "#/components/schemas/OrderItem" }
            },
            payments: {
              type: "array",
              items: { "$ref": "#/components/schemas/Payment" }
            }
          }
        },
        AuditLog: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            action: { type: "string" },
            entityType: { type: "string" },
            entityId: { type: "string" },
            metadata: { type: "object", nullable: true },
            createdAt: { type: "string", format: "date-time" }
          }
        },
        Notification: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            title: { type: "string" },
            message: { type: "string" },
            severity: { type: "string", enum: ["INFO", "WARNING", "CRITICAL"] },
            isRead: { type: "boolean" }
          }
        },
        DemandForecast: {
          type: "object",
          properties: {
            productId: { type: "string" },
            name: { type: "string" },
            soldLast30Days: { type: "integer" },
            soldLast90Days: { type: "integer" },
            predictedDemand: { type: "integer" }
          }
        },
        SmartInventoryAlert: {
          type: "object",
          properties: {
            productId: { type: "string" },
            productName: { type: "string" },
            currentStock: { type: "integer" },
            predictedMonthlyDemand: { type: "integer" },
            daysOfCover: { type: "number" },
            risk: { type: "string", enum: ["OUT_OF_STOCK", "OVERSTOCK", "BALANCED"] }
          }
        },
        FraudDetection: {
          type: "object",
          properties: {
            orderNumber: { type: "string" },
            totalAmount: { type: "number" },
            riskScore: { type: "number" },
            flags: {
              type: "array",
              items: { type: "string" }
            }
          }
        },
        DynamicPricing: {
          type: "object",
          properties: {
            productId: { type: "string" },
            productName: { type: "string" },
            currentPrice: { type: "number" },
            currentStock: { type: "integer" },
            predictedDemand: { type: "integer" },
            recommendedPrice: { type: "number" },
            strategy: { type: "string" }
          }
        },
        DatabaseDesign: {
          type: "object",
          properties: {
            tables: {
              type: "array",
              items: { type: "string" },
              example: [
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
          }
        }
      }
    },
    security: [{ bearerAuth: [] }],
    paths: {
      "/auth/register": {
        post: {
          tags: ["Auth"],
          summary: "Register a user",
          security: [],
          responses: { "201": { description: "User registered" } }
        }
      },
      "/auth/login": {
        post: {
          tags: ["Auth"],
          summary: "Authenticate user and return JWT",
          security: [],
          responses: { "200": { description: "Successful login" } }
        }
      },
      "/stores": {
        get: { tags: ["Stores"], summary: "List stores" },
        post: { tags: ["Stores"], summary: "Create store" }
      },
      "/products": {
        get: { tags: ["Products"], summary: "List products" },
        post: { tags: ["Products"], summary: "Create product" }
      },
      "/products/{id}": {
        patch: {
          tags: ["Products"],
          summary: "Update product",
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "string", format: "uuid" }
            }
          ]
        }
      },
      "/inventory": {
        get: { tags: ["Inventory"], summary: "List stock by store" }
      },
      "/inventory/low-stock": {
        get: { tags: ["Inventory"], summary: "List low-stock items" }
      },
      "/inventory/upsert": {
        post: { tags: ["Inventory"], summary: "Create or update stock record" }
      },
      "/customers": {
        get: { tags: ["Customers"], summary: "List customers" },
        post: { tags: ["Customers"], summary: "Create customer" }
      },
      "/customers/{id}/history": {
        get: {
          tags: ["Customers"],
          summary: "Get customer purchase history",
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "string", format: "uuid" }
            }
          ]
        }
      },
      "/orders": {
        get: { tags: ["Orders"], summary: "List orders" },
        post: { tags: ["Orders"], summary: "Create supply or sales order" }
      },
      "/billing": {
        post: { tags: ["Billing"], summary: "Create POS bill with auto tax and payment capture" }
      },
      "/reports/dashboard": {
        get: { tags: ["Reports"], summary: "Dashboard KPIs" }
      },
      "/reports/sales": {
        get: { tags: ["Reports"], summary: "Sales report" }
      },
      "/reports/inventory": {
        get: { tags: ["Reports"], summary: "Inventory report" }
      },
      "/reports/profit": {
        get: { tags: ["Reports"], summary: "Profit report" }
      },
      "/ai/demand-forecast": {
        get: {
          tags: ["AI"],
          summary: "Predict demand for products",
          responses: {
            "200": {
              description: "Forecast output",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: { "$ref": "#/components/schemas/DemandForecast" }
                  }
                }
              }
            }
          }
        }
      },
      "/ai/inventory-alerts": {
        get: { tags: ["AI"], summary: "Predict out-of-stock and overstock risk" }
      },
      "/ai/recommendations/{productId}": {
        get: {
          tags: ["AI"],
          summary: "Get product recommendations",
          parameters: [
            {
              in: "path",
              name: "productId",
              required: true,
              schema: { type: "string", format: "uuid" }
            }
          ]
        }
      },
      "/ai/fraud-detection": {
        get: { tags: ["AI"], summary: "Detect suspicious POS transactions" }
      },
      "/ai/dynamic-pricing/{productId}": {
        get: {
          tags: ["AI"],
          summary: "Recommend demand-aware price",
          parameters: [
            {
              in: "path",
              name: "productId",
              required: true,
              schema: { type: "string", format: "uuid" }
            }
          ]
        }
      },
      "/ops/notifications": {
        get: { tags: ["Operations"], summary: "List system notifications" }
      },
      "/ops/audit-logs": {
        get: { tags: ["Operations"], summary: "List audit logs" }
      },
      "/database/schema": {
        get: {
          tags: ["Operations"],
          summary: "Logical database design exposed in Swagger",
          responses: {
            "200": {
              description: "Database design",
              content: {
                "application/json": {
                  schema: { "$ref": "#/components/schemas/DatabaseDesign" }
                }
              }
            }
          }
        }
      }
    }
  },
  apis: []
});

export function configureSwagger(app: Express) {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get("/api-docs.json", (_req, res) => {
    res.json(swaggerSpec);
  });
}
