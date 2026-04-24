import { AppDataSource } from "../config/data-source";
import { env } from "../config/env";

async function initDatabase() {
  await AppDataSource.initialize();

  const tables = AppDataSource.entityMetadatas.map((metadata) => metadata.tableName).sort();

  if (env.dbType === "postgres") {
    const [connectionInfo] = await AppDataSource.query(
      "select current_database() as db_name, current_schema() as schema_name"
    );

    console.log(
      `Database ready: postgres://${env.dbUser}@${env.dbHost}:${env.dbPort}/${connectionInfo.db_name} (schema: ${connectionInfo.schema_name})`
    );
  } else {
    console.log(`Database ready: sqljs file at ${env.sqlJsLocation}`);
  }

  console.log(`Tables available: ${tables.join(", ")}`);

  await AppDataSource.destroy();
}

initDatabase().catch(async (error) => {
  console.error("Failed to initialize database", error);

  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }

  process.exit(1);
});
