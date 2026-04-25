import { createApp } from "./app";
import { initCache } from "./config/cache";
import { AppDataSource } from "./config/data-source";
import { env } from "./config/env";

// ✅ ADDED (serve frontend)
import * as express from "express";
import { join } from "path";

async function bootstrap() {
  await AppDataSource.initialize();
  await initCache();

  const app = createApp();

  // ✅ ADDED (serve frontend from /app)
  app.use("/app", express.static(join(__dirname, "..", "public", "app")));

  // ✅ ADDED (optional redirect to index.html)
  app.get("/app", (req, res) => {
    res.redirect("/app/index.html");
  });

  const server = app.listen(env.port, () => {
    const baseUrl = `http://127.0.0.1:${env.port}`;
    console.log(`${env.appName} running successfully.`);
    if (env.dbType === "postgres") {
      console.log(
        `Database: postgres://${env.dbUser}@${env.dbHost}:${env.dbPort}/${env.dbName} (schema: public, synchronize: ${String(env.dbSynchronize)})`
      );
    } else {
      console.log(`Database: sqljs file at ${env.sqlJsLocation}`);
    }
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