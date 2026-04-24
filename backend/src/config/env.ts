import dotenv from "dotenv";

dotenv.config();

const required = ["JWT_SECRET"] as const;

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  appName: process.env.APP_NAME ?? "Enterprise Retail RMS Backend",
  jwtSecret: process.env.JWT_SECRET as string,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "1d",
  dbType: process.env.DB_TYPE ?? "postgres",
  dbHost: process.env.DB_HOST ?? "localhost",
  dbPort: Number(process.env.DB_PORT ?? 5432),
  dbName: process.env.DB_NAME ?? "retail_rms",
  dbUser: process.env.DB_USER ?? "postgres",
  dbPassword: process.env.DB_PASSWORD ?? "postgres",
  dbSynchronize: process.env.DB_SYNCHRONIZE === "true",
  sqlJsLocation: process.env.SQLJS_LOCATION ?? "data/retail-rms.sqlite",
  redisUrl: process.env.REDIS_URL,
  cacheTtlSeconds: Number(process.env.CACHE_TTL_SECONDS ?? 300)
};
