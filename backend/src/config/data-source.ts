import "reflect-metadata";
import path from "path";
import { DataSource, type DataSourceOptions } from "typeorm";
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

export type SupportedDbType = "sqljs" | "postgres";

const entities = [AuditLog, Customer, Inventory, Notification, Order, OrderItem, Payment, Product, Store, User];

function normalizeDbType(value: string | undefined): SupportedDbType {
  return value === "postgres" ? "postgres" : "sqljs";
}

function shouldUseSsl() {
  if (env.dbSsl) {
    return true;
  }

  if (env.databaseUrl) {
    return !/(localhost|127\.0\.0\.1)/i.test(env.databaseUrl);
  }

  return !["localhost", "127.0.0.1"].includes(env.dbHost);
}

function createSqlJsOptions(): DataSourceOptions {
  return {
    type: "sqljs",
    autoSave: true,
    location: path.resolve(process.cwd(), env.sqlJsLocation),
    synchronize: true,
    logging: false,
    entities
  };
}

function createPostgresOptions(): DataSourceOptions {
  const ssl = shouldUseSsl() ? { rejectUnauthorized: false } : undefined;

  if (env.databaseUrl) {
    return {
      type: "postgres",
      url: env.databaseUrl,
      ssl,
      synchronize: env.dbSynchronize,
      logging: false,
      entities
    };
  }

  return {
    type: "postgres",
    host: env.dbHost,
    port: env.dbPort,
    username: env.dbUser,
    password: env.dbPassword,
    database: env.dbName,
    ssl,
    synchronize: env.dbSynchronize,
    logging: false,
    entities
  };
}

function createDataSourceOptions(dbType: SupportedDbType): DataSourceOptions {
  return dbType === "postgres" ? createPostgresOptions() : createSqlJsOptions();
}

let activeDbType: SupportedDbType = normalizeDbType(env.dbType);

export let AppDataSource = new DataSource(createDataSourceOptions(activeDbType));

export function getActiveDbType() {
  return activeDbType;
}

export function replaceDataSource(nextDbType: SupportedDbType) {
  if (AppDataSource.isInitialized) {
    throw new Error("Cannot replace an initialized data source");
  }

  activeDbType = nextDbType;
  AppDataSource = new DataSource(createDataSourceOptions(activeDbType));
  return AppDataSource;
}

export function describeDatabaseConnection() {
  if (activeDbType === "sqljs") {
    return `sqljs file at ${env.sqlJsLocation}`;
  }

  if (env.databaseUrl) {
    return "postgres via DATABASE_URL";
  }

  return `postgres://${env.dbUser}@${env.dbHost}:${env.dbPort}/${env.dbName} (schema: public, synchronize: ${String(env.dbSynchronize)})`;
}
