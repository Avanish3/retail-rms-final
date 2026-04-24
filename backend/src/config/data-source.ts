import "reflect-metadata";
import path from "path";
import { DataSource } from "typeorm";
import { env } from "./env";
import { AuditLog } from "../entities/AuditLog";
import { Customer } from "../entities/Customer";
import { Inventory } from "../entities/Inventory";
import { Notification } from "../entities/Notification";
import { Order } from "../entities/Order";
import { OrderItem } from "../entities/OrderItem";
import { Payment } from "../entities/Payment";
import { Product } from "../entities/Product";
import { Store } from "../entities/Store";
import { User } from "../entities/User";

const entities = [AuditLog, Customer, Inventory, Notification, Order, OrderItem, Payment, Product, Store, User];

export const AppDataSource =
  env.dbType === "sqljs"
    ? new DataSource({
        type: "sqljs",
        autoSave: true,
        location: path.resolve(process.cwd(), env.sqlJsLocation),
        synchronize: true,
        logging: false,
        entities
      })
    : new DataSource({
        type: "postgres",
        host: env.dbHost,
        port: env.dbPort,
        username: env.dbUser,
        password: env.dbPassword,
        database: env.dbName,
        synchronize: env.dbSynchronize,
        logging: false,
        entities
      });
