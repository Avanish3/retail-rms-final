import { AppDataSource, describeDatabaseConnection, getActiveDbType } from "../config/data-source";

async function initDatabase() {
  await AppDataSource.initialize();

  const tables = AppDataSource.entityMetadatas.map((metadata) => metadata.tableName).sort();

  if (getActiveDbType() === "postgres") {
    const [connectionInfo] = await AppDataSource.query(
      "select current_database() as db_name, current_schema() as schema_name"
    );

    console.log(`Database ready: ${describeDatabaseConnection()} (connected database: ${connectionInfo.db_name}, schema: ${connectionInfo.schema_name})`);
  } else {
    console.log(`Database ready: ${describeDatabaseConnection()}`);
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
