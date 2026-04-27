"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express = __importStar(require("express"));
const path_1 = require("path");
const app_1 = require("./app");
const cache_1 = require("./config/cache");
const data_source_1 = require("./config/data-source");
const env_1 = require("./config/env");
const seed_1 = require("./database/seed");
async function initializeDatabase() {
    try {
        await data_source_1.AppDataSource.initialize();
        return;
    }
    catch (error) {
        if ((0, data_source_1.getActiveDbType)() !== "postgres" || !env_1.env.dbFallbackToSqljs) {
            throw error;
        }
        console.warn("Primary Postgres connection failed. Falling back to sqljs for startup.", error);
        (0, data_source_1.replaceDataSource)("sqljs");
        await data_source_1.AppDataSource.initialize();
    }
}
async function bootstrap() {
    await initializeDatabase();
    await (0, seed_1.seedDatabase)(data_source_1.AppDataSource);
    await (0, cache_1.initCache)();
    const app = (0, app_1.createApp)();
    app.use("/app", express.static((0, path_1.join)(__dirname, "..", "public", "app")));
    app.get("/app", (_req, res) => {
        res.redirect("/app/index.html");
    });
    const server = app.listen(env_1.env.port, () => {
        const baseUrl = `http://127.0.0.1:${env_1.env.port}`;
        console.log(`${env_1.env.appName} running successfully.`);
        console.log(`Database: ${(0, data_source_1.describeDatabaseConnection)()}`);
        console.log(`Open frontend: ${baseUrl}/app/`);
        console.log(`Open in browser: ${baseUrl}`);
        console.log(`Swagger Docs: ${baseUrl}/api-docs`);
        console.log(`Health Check: ${baseUrl}/health`);
    });
    server.on("error", (error) => {
        if (error.code === "EADDRINUSE") {
            console.error(`Port ${env_1.env.port} is already in use.`);
            console.error(`Another Retail RMS server is likely already running on http://127.0.0.1:${env_1.env.port}.`);
            console.error("Close the existing process or change PORT in backend/.env, then start again.");
            process.exit(1);
        }
        console.error("Failed to start HTTP server", error);
        process.exit(1);
    });
}
bootstrap().catch((error) => {
    console.error("Failed to bootstrap application", error);
    process.exit(1);
});
