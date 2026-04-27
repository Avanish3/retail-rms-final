"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppDataSource = void 0;
exports.getActiveDbType = getActiveDbType;
exports.replaceDataSource = replaceDataSource;
exports.describeDatabaseConnection = describeDatabaseConnection;
require("reflect-metadata");
const path_1 = __importDefault(require("path"));
const typeorm_1 = require("typeorm");
const env_1 = require("./env");
const AuditLog_1 = require("../entities/AuditLog");
const Customer_1 = require("../entities/Customer");
const Inventory_1 = require("../entities/Inventory");
const Notification_1 = require("../entities/Notification");
const Order_1 = require("../entities/Order");
const OrderItem_1 = require("../entities/OrderItem");
const Payment_1 = require("../entities/Payment");
const Product_1 = require("../entities/Product");
const Store_1 = require("../entities/Store");
const User_1 = require("../entities/User");
const entities = [AuditLog_1.AuditLog, Customer_1.Customer, Inventory_1.Inventory, Notification_1.Notification, Order_1.Order, OrderItem_1.OrderItem, Payment_1.Payment, Product_1.Product, Store_1.Store, User_1.User];
function normalizeDbType(value) {
    return value === "postgres" ? "postgres" : "sqljs";
}
function shouldUseSsl() {
    if (env_1.env.dbSsl) {
        return true;
    }
    if (env_1.env.databaseUrl) {
        return !/(localhost|127\.0\.0\.1)/i.test(env_1.env.databaseUrl);
    }
    return !["localhost", "127.0.0.1"].includes(env_1.env.dbHost);
}
function createSqlJsOptions() {
    return {
        type: "sqljs",
        autoSave: true,
        location: path_1.default.resolve(process.cwd(), env_1.env.sqlJsLocation),
        synchronize: true,
        logging: false,
        entities
    };
}
function createPostgresOptions() {
    const ssl = shouldUseSsl() ? { rejectUnauthorized: false } : undefined;
    if (env_1.env.databaseUrl) {
        return {
            type: "postgres",
            url: env_1.env.databaseUrl,
            ssl,
            synchronize: env_1.env.dbSynchronize,
            logging: false,
            entities
        };
    }
    return {
        type: "postgres",
        host: env_1.env.dbHost,
        port: env_1.env.dbPort,
        username: env_1.env.dbUser,
        password: env_1.env.dbPassword,
        database: env_1.env.dbName,
        ssl,
        synchronize: env_1.env.dbSynchronize,
        logging: false,
        entities
    };
}
function createDataSourceOptions(dbType) {
    return dbType === "postgres" ? createPostgresOptions() : createSqlJsOptions();
}
let activeDbType = normalizeDbType(env_1.env.dbType);
exports.AppDataSource = new typeorm_1.DataSource(createDataSourceOptions(activeDbType));
function getActiveDbType() {
    return activeDbType;
}
function replaceDataSource(nextDbType) {
    if (exports.AppDataSource.isInitialized) {
        throw new Error("Cannot replace an initialized data source");
    }
    activeDbType = nextDbType;
    exports.AppDataSource = new typeorm_1.DataSource(createDataSourceOptions(activeDbType));
    return exports.AppDataSource;
}
function describeDatabaseConnection() {
    if (activeDbType === "sqljs") {
        return `sqljs file at ${env_1.env.sqlJsLocation}`;
    }
    if (env_1.env.databaseUrl) {
        return "postgres via DATABASE_URL";
    }
    return `postgres://${env_1.env.dbUser}@${env_1.env.dbHost}:${env_1.env.dbPort}/${env_1.env.dbName} (schema: public, synchronize: ${String(env_1.env.dbSynchronize)})`;
}
