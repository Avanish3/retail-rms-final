"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppDataSource = void 0;
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
exports.AppDataSource = env_1.env.dbType === "sqljs"
    ? new typeorm_1.DataSource({
        type: "sqljs",
        autoSave: true,
        location: path_1.default.resolve(process.cwd(), env_1.env.sqlJsLocation),
        synchronize: true,
        logging: false,
        entities
    })
    : new typeorm_1.DataSource({
        type: "postgres",
        host: env_1.env.dbHost,
        port: env_1.env.dbPort,
        username: env_1.env.dbUser,
        password: env_1.env.dbPassword,
        database: env_1.env.dbName,
        synchronize: env_1.env.dbSynchronize,
        logging: false,
        entities
    });
