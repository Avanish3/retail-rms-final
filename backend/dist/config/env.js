"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const required = ["JWT_SECRET"];
for (const key of required) {
    if (!process.env[key]) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
}
exports.env = {
    port: Number(process.env.PORT ?? 4000),
    appName: process.env.APP_NAME ?? "Enterprise Retail RMS Backend",
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "1d",
    dbType: process.env.DB_TYPE ?? "sqljs",
    databaseUrl: process.env.DATABASE_URL,
    dbHost: process.env.DB_HOST ?? "localhost",
    dbPort: Number(process.env.DB_PORT ?? 5432),
    dbName: process.env.DB_NAME ?? "retail_rms",
    dbUser: process.env.DB_USER ?? "postgres",
    dbPassword: process.env.DB_PASSWORD ?? "postgres",
    dbSsl: process.env.DB_SSL === "true",
    dbFallbackToSqljs: process.env.DB_FALLBACK_TO_SQLJS !== "false",
    dbSynchronize: process.env.DB_SYNCHRONIZE === "true",
    sqlJsLocation: process.env.SQLJS_LOCATION ?? "data/retail-rms.sqlite",
    redisUrl: process.env.REDIS_URL,
    cacheTtlSeconds: Number(process.env.CACHE_TTL_SECONDS ?? 300)
};
