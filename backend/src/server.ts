import * as express from "express";
import { join } from "path";
import { createApp } from "./app";
import { initCache } from "./config/cache";
import { AppDataSource, describeDatabaseConnection, getActiveDbType, replaceDataSource } from "./config/data-source";
import { env } from "./config/env";
import { seedDatabase } from "./database/seed";

async function initializeDatabase() {
  try {
    await AppDataSource.initialize();
    return;
  } catch (error) {
    if (getActiveDbType() !== "postgres" || !env.dbFallbackToSqljs) {
      throw error;
    }

    console.warn("Primary Postgres connection failed. Falling back to sqljs for startup.", error);
    replaceDataSource("sqljs");
    await AppDataSource.initialize();
  }
}

async function bootstrap() {
  await initializeDatabase();
  await seedDatabase(AppDataSource);
  await initCache();

  const app = createApp();

  app.use("/app", express.static(join(__dirname, "..", "public", "app")));
  app.get("/app", (_req, res) => {
    res.redirect("/app/index.html");
  });

  const server = app.listen(env.port, () => {
    const baseUrl = `http://127.0.0.1:${env.port}`;
    console.log(`${env.appName} running successfully.`);
    console.log(`Database: ${describeDatabaseConnection()}`);
    console.log(`Open frontend: ${baseUrl}/app/`);
    console.log(`Open in browser: ${baseUrl}`);
    console.log(`Swagger Docs: ${baseUrl}/api-docs`);
    console.log(`Health Check: ${baseUrl}/health`);
  });

  server.on("error", (error: NodeJS.ErrnoException) => {
    if (error.code === "EADDRINUSE") {
      console.error(`Port ${env.port} is already in use.`);
      console.error(`Another Retail RMS server is likely already running on http://127.0.0.1:${env.port}.`);
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
